import Foundation
import Testing
import SteadyCore
@testable import SteadyAppState

@MainActor private final class ControlledHealth: HealthDataService {
    private(set) var authorizationRequests = 0
    private(set) var reads = 0
    private var pending: [Int: CheckedContinuation<[DailySummary], any Error>] = [:]

    func requestAuthorization() async throws { authorizationRequests += 1 }
    func summaries(from: Date, through: Date) async throws -> [DailySummary] {
        reads += 1
        let number = reads
        // HealthKit callbacks can arrive after cancellation; deliberately ignore it here.
        return try await withCheckedThrowingContinuation { pending[number] = $0 }
    }
    func complete(_ number: Int, with result: Result<[DailySummary], any Error>) {
        pending.removeValue(forKey: number)?.resume(with: result)
    }
    func finishPending() {
        let callbacks = Array(pending.values); pending.removeAll()
        for callback in callbacks { callback.resume(throwing: CancellationError()) }
    }
}

private struct IdleSync: SyncService {
    func state() async -> SyncState { .idle }
    func sync() async throws {}
    func retry() async throws {}
    func restoreHistory() async throws {}
}

@MainActor private func waitUntil(_ condition: () -> Bool) async throws {
    for _ in 0..<500 {
        if condition() { return }
        try await Task.sleep(for: .milliseconds(2))
    }
    try #require(condition(), "The expected async operation did not finish")
}
private func healthSummary(steps: Int) -> DailySummary {
    let calendar = Calendar.current, day = Calendar.current.startOfDay(for: Date())
    return DailySummary(metadata: RecordMetadata(source: .healthKit),
                        dayKey: HealthAggregation.dayKey(day, calendar: calendar),
                        timeZoneID: calendar.timeZone.identifier, date: day,
                        weightKG: nil, sleepMinutes: nil, steps: steps, activeMinutes: nil)
}

private enum LateReadResult: CaseIterable {
    case success, cancelled, failed
    var result: Result<[DailySummary], any Error> {
        switch self {
        case .success: .success([healthSummary(steps: 111)])
        case .cancelled: .failure(CancellationError())
        case .failed: .failure(ServiceError.simulatedFailure)
        }
    }
}

@Test(arguments: LateReadResult.allCases) @MainActor private func cancelledHealthReadCannotOverwriteNewRequest(
    outcome: LateReadResult
) async throws {
    let store = try DeviceRepository(inMemory: true), health = ControlledHealth()
    defer { health.finishPending() }
    let model = try AppModel(health: health, sync: IdleSync(), planStore: store, journalStore: store, liveStore: store)
    model.connectHealth()
    try await waitUntil { health.reads == 1 }
    model.cancel()
    model.connectHealth()
    model.notice = "后续操作的提示"
    health.complete(1, with: outcome.result)
    try await waitUntil { health.reads == 2 }
    #expect(model.busy == "正在请求健康读取")
    #expect(model.notice == "后续操作的提示")
    #expect(model.error == nil)
    #expect(model.summaries.allSatisfy { $0.steps != 111 })
    health.complete(2, with: .success([healthSummary(steps: 222)]))
    try await waitUntil { model.busy == nil }
    #expect(model.today?.steps == 222)
    #expect(model.notice?.contains("1 天的健康摘要") == true)
}

@Test @MainActor func healthReconnectionWaitsForBackgroundReadAndRefreshes() async throws {
    let store = try DeviceRepository(inMemory: true), health = ControlledHealth()
    defer { health.finishPending() }
    var journal = try store.load(); journal.preferences.healthRead = true; try store.save(journal)
    let model = try AppModel(health: health, sync: IdleSync(), planStore: store, journalStore: store, liveStore: store)
    let background = Task { await model.load() }
    try await waitUntil { health.reads == 1 }
    model.connectHealth()
    try await Task.sleep(for: .milliseconds(40))
    #expect(model.busy == "正在请求健康读取")
    #expect(model.notice == nil)
    #expect(health.authorizationRequests == 0)
    health.complete(1, with: .success([]))
    await background.value
    try await waitUntil { health.reads == 2 }
    #expect(health.authorizationRequests == 1)
    #expect(model.busy == "正在请求健康读取")
    #expect(model.notice == nil)
    health.complete(2, with: .success([healthSummary(steps: 1234)]))
    try await waitUntil { model.busy == nil }
    #expect(model.today?.steps == 1234)
    #expect(model.notice?.contains("1 天的健康摘要") == true)
}

@Test @MainActor func cancelledQueuedHealthConnectionDoesNotAuthorize() async throws {
    let store = try DeviceRepository(inMemory: true), health = ControlledHealth()
    defer { health.finishPending() }
    var journal = try store.load(); journal.preferences.healthRead = true; try store.save(journal)
    let model = try AppModel(health: health, sync: IdleSync(), planStore: store, journalStore: store, liveStore: store)
    let background = Task { await model.load() }
    try await waitUntil { health.reads == 1 }
    model.connectHealth()
    try await Task.sleep(for: .milliseconds(40))
    model.cancel()
    model.connectHealth()
    model.notice = "新的读取正在等待"
    health.complete(1, with: .success([]))
    await background.value
    try await waitUntil { health.reads == 2 }
    #expect(health.authorizationRequests == 1)
    #expect(model.notice == "新的读取正在等待")
    health.complete(2, with: .success([]))
    try await waitUntil { model.busy == nil }
    #expect(model.error == nil)
    #expect(model.notice?.contains("尚未读到记录") == true)
}

@Test @MainActor func healthReadFailureReportsErrorWithoutSuccessNotice() async throws {
    let store = try DeviceRepository(inMemory: true), health = ControlledHealth()
    defer { health.finishPending() }
    let model = try AppModel(health: health, sync: IdleSync(), planStore: store, journalStore: store, liveStore: store)
    model.connectHealth()
    try await waitUntil { health.reads == 1 }
    health.complete(1, with: .failure(ServiceError.simulatedFailure))
    try await waitUntil { model.busy == nil }
    #expect(model.error == ServiceError.simulatedFailure.localizedDescription)
    #expect(model.notice == nil)
    #expect(model.today != nil)
    #expect(model.saveNote("健康读取失败后仍能补记"))
}

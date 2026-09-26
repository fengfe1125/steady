import Foundation
import Testing
import SteadyCore
@testable import SteadyAppState

@MainActor private final class MemoryJournal: JournalRepository {
    var state = JournalState()
    func load() throws -> JournalState { state }
    func save(_ state: JournalState) throws { self.state = state }
}
@MainActor private final class FailingPlans: PlanRepository {
    func plans() throws -> [TrainingPlan] { [] }
    func save(_ plan: TrainingPlan) throws { throw ServiceError.simulatedFailure }
    func delete(id: UUID) throws { throw ServiceError.simulatedFailure }
}
@MainActor private func awaitIdle(_ model: AppModel) async throws {
    for _ in 0..<500 {
        if model.busy == nil { return }
        try await Task.sleep(for: .milliseconds(2))
    }
    Issue.record("Request did not finish")
}

@Test @MainActor func failedConfirmationDoesNotDismissResumedDraft() async throws {
    let model = try AppModel(planStore: FailingPlans(), journalStore: MemoryJournal())
    let plan = try await DemoCoachService(delay: .zero).planDraft(preferences: UserPreferences(), scenario: .normal)
    #expect(model.draft == nil)
    #expect(!model.confirmDraft(plan))
    #expect(model.error != nil)
    #expect(model.confirmedPlans.isEmpty)
}

@Test @MainActor func appFlowKeepsDraftSeparateAndPersistsNote() async throws {
    let journal = MemoryJournal()
    let plans = try LocalPlanRepository(inMemory: true)
    let model = try AppModel(coach: DemoCoachService(delay: .zero), planStore: plans, journalStore: journal)
    await model.load()
    #expect(model.saveNote("测试补记"))
    model.generateReport(); try await awaitIdle(model)
    #expect(model.journal.reports.count == 2)
    #expect(model.presentedReport != nil)
    model.generatePlan(UserPreferences()); try await awaitIdle(model)
    let draft = try #require(model.draft)
    #expect(model.confirmedPlans.isEmpty)
    #expect(model.confirmDraft(draft))
    #expect(model.confirmedPlans.count == 1)
    #expect(model.presentedReport == nil)
    #expect(model.selectedTab == 3)
    let reopened = try AppModel(planStore: plans, journalStore: journal)
    #expect(reopened.confirmedPlans.count == 1)
    #expect(reopened.journal.notes["2026-09-21"] == "测试补记")
}

@Test @MainActor func cancelledChatCannotFinishOrClearNewRequest() async throws {
    let model = try AppModel(coach: DemoCoachService(delay: .milliseconds(20)),
        planStore: LocalPlanRepository(inMemory: true), journalStore: MemoryJournal())
    await model.load(); model.prepareChat(); model.send("第一个问题")
    for _ in 0..<100 {
        if model.conversation?.messages.last?.content.isEmpty == false { break }
        try await Task.sleep(for: .milliseconds(2))
    }
    model.cancel()
    #expect(model.conversation?.messages.last?.status == .cancelled)
    model.send("第二个问题")
    try await awaitIdle(model)
    #expect(model.conversation?.messages.count == 4)
    #expect(model.conversation?.messages[1].status == .cancelled)
    #expect(model.conversation?.messages.last?.status == .complete)
}

private struct SignedInAuth: AuthService {
    let id: UUID
    func state() async -> AuthState { .signedIn(userID: id) }
    func signIn() async throws {}
    func signOut() async throws {}
    func deleteAccount() async throws {}
}
@MainActor private final class FailOnceSync: SyncService {
    var calls = 0
    private var current: SyncState = .idle
    func state() async -> SyncState { current }
    func sync() async throws {
        calls += 1
        if calls == 1 { current = .failed("temporary"); throw ServiceError.simulatedFailure }
        current = .idle
    }
    func retry() async throws { try await sync() }
    func restoreHistory() async throws { try await sync() }
}
@Test @MainActor func liveSyncRetriesAfterTransientFailureWithoutLosingLocalNote() async throws {
    let user = UUID(), store = try DeviceRepository(inMemory: true)
    store.select(userID: user)
    var journal = JournalState()
    journal.preferences.cloudSync = true
    journal.notes["2026-09-25"] = "离线待同步"
    try store.save(journal)
    let sync = FailOnceSync()
    let model = try AppModel(auth: SignedInAuth(id: user), sync: sync,
                             planStore: store, journalStore: store, liveStore: store)
    await model.load()
    for _ in 0..<40 where sync.calls == 0 { try await Task.sleep(for: .milliseconds(50)) }
    #expect(sync.calls == 1)
    #expect(try store.load().notes["2026-09-25"] == "离线待同步")
    for _ in 0..<100 where sync.calls < 2 { try await Task.sleep(for: .milliseconds(50)) }
    #expect(sync.calls == 2)
    #expect(model.syncState == .idle)
    #expect(try store.load().notes["2026-09-25"] == "离线待同步")
}

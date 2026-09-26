import Foundation
import SteadyCore

public struct CloudCoachService: CoachService {
    private let cloud: CloudClient
    private let store: DeviceRepository
    public init(cloud: CloudClient, store: DeviceRepository) { self.cloud = cloud; self.store = store }
    private struct Request: Encodable, Sendable {
        var requestID = UUID()
        var schemaVersion = 1
        var consent: DeviceConsent
        var summary: DailySummary?
        var history: [DailySummary] = []
        var question: String?
        var messages: [ChatMessage] = []
        var preferences: UserPreferences?
        var today: Date = Date()
        var timeZoneID = TimeZone.current.identifier
    }
    private func context() async throws -> (DeviceConsent, UUID, Int) {
        try await MainActor.run {
            guard let user = UUID(uuidString: store.partition) else { throw ServiceError.unauthenticated }
            let consent = try store.consent()
            guard consent.aiProcessing else { throw ServiceError.consentRequired }
            return (consent, user, store.epoch)
        }
    }
    private func authorize(_ consent: DeviceConsent, user: UUID) async throws {
        struct Reply: Decodable, Sendable { var accepted: Bool }
        let _: Reply = try await cloud.call("consents", body: consent, expectedUser: user)
    }
    private func check(_ epoch: Int) async throws {
        try Task.checkCancellation()
        guard await store.epoch == epoch, try await store.consent().aiProcessing else { throw CancellationError() }
    }
    public func report(for summary: DailySummary, history: [DailySummary]) async throws -> HealthReport {
        let (consent, user, epoch) = try await context()
        try await authorize(consent, user: user)
        let result: HealthReport = try await cloud.call("report", body: Request(consent: consent, summary: summary, history: Array(history.suffix(30))), expectedUser: user)
        try await check(epoch)
        guard result.summaryID == summary.id, result.sections.map(\.title) == ["数据观察", "个人趋势", "缺失信息", "下一步建议"] else { throw ServiceError.invalidResponse }
        try Self.validateEvidence(result.sections.flatMap(\.evidence), summaries: history + [summary])
        return result
    }
    public func planDraft(preferences: UserPreferences) async throws -> TrainingPlan {
        guard preferences.limitations.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { throw ServiceError.invalidInput("存在运动限制，请先咨询专业人士，不自动生成训练方案。") }
        let (consent, user, epoch) = try await context()
        try await authorize(consent, user: user)
        var safePreferences = preferences; safePreferences.metadata.source = .manual
        let result: TrainingPlan = try await cloud.call("plan-draft", body: Request(consent: consent, preferences: safePreferences), expectedUser: user)
        try await check(epoch)
        guard result.status == .draft, !result.sessions.isEmpty, result.sessions.count <= 7,
              result.sessions.allSatisfy({ (10...preferences.availableMinutes).contains($0.minutes) && !$0.exercises.isEmpty }) else { throw ServiceError.invalidResponse }
        return result
    }
    public func answer(question: String, summary: DailySummary?, messages: [ChatMessage]) -> AsyncThrowingStream<CoachEvent, Error> {
        AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    let (consent, user, epoch) = try await context()
                    try await authorize(consent, user: user)
                    let contextMessages = messages.filter { $0.status == .complete }.suffix(12).map { message in
                        var message = message; message.metadata.source = message.role == .user ? .manual : .generated; return message
                    }
                    let body = Request(consent: consent, summary: summary, question: question, messages: contextMessages)
                    let request = try await cloud.request("chat", body: body, expectedUser: user)
                    let (bytes, response) = try await cloud.bytes(for: request)
                    try CloudClient.validate(response)
                    var parser = SSEParser(), completed = false
                    var lines = SSELineDecoder()
                    for try await byte in bytes {
                        guard let line = try lines.consume(byte) else { continue }
                        try await check(epoch)
                        guard let frame = parser.consume(line) else { continue }
                        switch frame.event {
                        case "delta":
                            let delta = try WireCodec.decoder().decode(Delta.self, from: Data(frame.data.utf8))
                            continuation.yield(.delta(delta.text))
                        case "evidence":
                            let refs = try WireCodec.decoder().decode([EvidenceReference].self, from: Data(frame.data.utf8))
                            try Self.validateEvidence(refs, summaries: summary.map { [$0] } ?? [])
                            continuation.yield(.evidence(refs))
                        case "complete": completed = true; continuation.yield(.complete)
                        case "error": throw ServiceError.invalidInput("回复未完成，已收到的内容仍保留。")
                        default: break
                        }
                        if completed { break }
                    }
                    guard completed else { throw ServiceError.interrupted }
                    continuation.finish()
                } catch { continuation.finish(throwing: error) }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }
    private struct Delta: Decodable { var text: String }
    public static func validateEvidence(_ references: [EvidenceReference], summaries: [DailySummary]) throws {
        for ref in references {
            guard let summary = summaries.first(where: { $0.id == ref.summaryID && ($0.metadata.revision ?? 1) == (ref.summaryVersion ?? 1) }), ref.dayKey == summary.dayKey,
                  ref.source == summary.metadata.source else { throw ServiceError.invalidResponse }
            let expected: String?
            switch ref.metric {
            case "体重": expected = summary.weightKG.map { String(format: "%.1f kg", $0) }
            case "睡眠": expected = summary.sleepMinutes.map { "\($0)分钟" }
            case "步数": expected = summary.steps.map { "\($0)步" }
            case "运动分钟": expected = summary.activeMinutes.map { "\($0)分钟" }
            default: expected = nil
            }
            guard expected != nil, ref.value == expected else { throw ServiceError.invalidResponse }
        }
    }
}

public struct SSEParser: Sendable {
    public struct Frame: Sendable { public var event: String; public var data: String }
    private var event = "message"
    private var data: [String] = []
    public init() {}
    public mutating func consume(_ line: String) -> Frame? {
        if line.isEmpty {
            defer { event = "message"; data = [] }
            return data.isEmpty ? nil : Frame(event: event, data: data.joined(separator: "\n"))
        }
        if line.hasPrefix("event:") { event = String(line.dropFirst(6)).trimmingCharacters(in: .whitespaces) }
        if line.hasPrefix("data:") { data.append(String(line.dropFirst(5)).trimmingCharacters(in: .whitespaces)) }
        return nil
    }
}

/// Preserve blank SSE separators and decode UTF-8 only after a complete line.
struct SSELineDecoder {
    private var buffer = Data()
    mutating func consume(_ byte: UInt8) throws -> String? {
        if byte != 10 {
            guard buffer.count < 65536 else { throw ServiceError.invalidResponse }
            buffer.append(byte); return nil
        }
        if buffer.last == 13 { buffer.removeLast() }
        defer { buffer.removeAll(keepingCapacity: true) }
        guard let line = String(data: buffer, encoding: .utf8) else { throw ServiceError.invalidResponse }
        return line
    }
}

import Foundation

public enum DemoData {
    public static let calendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 8 * 3600)!
        return calendar
    }()
    public static let today = calendar.date(from: DateComponents(year: 2026, month: 9, day: 21, hour: 12))!

    public static func summaries(missing: Bool = false) -> [DailySummary] {
        (0..<30).map { index in
            let date = calendar.date(byAdding: .day, value: index - 29, to: today)!
            let parts = calendar.dateComponents([.year, .month, .day], from: date)
            let key = String(format: "%04d-%02d-%02d", parts.year!, parts.month!, parts.day!)
            let id = UUID(uuidString: String(format: "00000000-0000-4000-8000-%012d", index + 1))!
            return DailySummary(
                metadata: RecordMetadata(id: id, date: date), dayKey: key,
                timeZoneID: "Asia/Shanghai", date: date,
                weightKG: missing && index % 3 == 2 ? nil : 72.8 - Double(index) * 0.025,
                sleepMinutes: missing && index % 4 == 1 ? nil : (index == 29 ? 440 : 390 + (index * 13) % 75),
                steps: missing && index % 5 == 4 ? nil : (index == 29 ? 6420 : 4300 + (index * 317) % 4200),
                activeMinutes: missing && index % 5 == 4 ? nil : 18 + index % 20
            )
        }
    }
}

public struct DemoHealthDataService: HealthDataService {
    public init() {}
    public func summaries(scenario: DemoScenario) async throws -> [DailySummary] {
        try Task.checkCancellation()
        // Offline reads are deliberately local. Only generation simulates networking.
        return DemoData.summaries(missing: scenario == .missing)
    }
}

public struct DemoCoachService: CoachService {
    public var delay: Duration
    public init(delay: Duration = .milliseconds(350)) { self.delay = delay }

    private func prepare(_ scenario: DemoScenario) async throws {
        try Task.checkCancellation()
        try await Task.sleep(for: delay)
        switch scenario {
        case .offline: throw ServiceError.offline
        case .failure: throw ServiceError.simulatedFailure
        case .normal, .missing: break
        }
    }

    private func evidence(_ summary: DailySummary) -> [EvidenceReference] {
        var result: [EvidenceReference] = []
        if let minutes = summary.sleepMinutes {
            result.append(EvidenceReference(id: UUID(), summaryID: summary.id, dayKey: summary.dayKey,
                metric: "睡眠", value: "\(minutes / 60)小时\(minutes % 60)分", source: .demo))
        }
        if let steps = summary.steps {
            result.append(EvidenceReference(id: UUID(), summaryID: summary.id, dayKey: summary.dayKey,
                metric: "步数", value: "\(steps)步", source: .demo))
        }
        return result
    }

    public func report(for summary: DailySummary, history: [DailySummary], scenario: DemoScenario) async throws -> HealthReport {
        try await prepare(scenario)
        let refs = evidence(summary)
        let observations = refs.map { "\($0.metric)：\($0.value)" }.joined(separator: "；")
        let prior = history.filter { $0.date <= summary.date }.suffix(7)
        let validSleep = prior.compactMap(\.sleepMinutes)
        let trend = validSleep.isEmpty ? "暂无足够睡眠记录，不能判断趋势。" :
            "最近7个记录日中，\(validSleep.count)天有睡眠记录，平均\(validSleep.reduce(0, +) / validSleep.count)分钟。单日变化不代表身体好坏。"
        let sections: [ReportSection] = [
            ReportSection(id: UUID(), title: "数据观察", body: observations.isEmpty ? "当天暂无可用睡眠或步数记录。" : observations, evidence: refs),
            ReportSection(id: UUID(), title: "个人趋势", body: trend, evidence: prior.flatMap(evidence)),
            ReportSection(id: UUID(), title: "缺失信息", body: summary.missingMetrics.isEmpty ? "样例指标齐全，但不了解你的真实身体状态、疼痛和主观疲劳。" : "缺少：\(summary.missingMetrics.joined(separator: "、"))。缺失不计为零。", evidence: []),
            ReportSection(id: UUID(), title: "下一步建议", body: "演示建议：先补记今天的感受，再考虑轻量活动。出现不适请停止运动；本报告不是医疗诊断。", evidence: [])
        ]
        return HealthReport(metadata: RecordMetadata(), summaryID: summary.id, sections: sections)
    }

    public func answer(question: String, summary: DailySummary?, scenario: DemoScenario) -> AsyncThrowingStream<CoachEvent, Error> {
        AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    guard !question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                        throw ServiceError.invalidInput("请先输入问题。")
                    }
                    try await prepare(scenario)
                    let refs = summary.map(evidence) ?? []
                    continuation.yield(.evidence(refs))
                    let phrases = ["这是演示回复，不是真实 AI 分析。", refs.isEmpty ? "目前没有足够记录判断变化。" : "可以参考下方引用的睡眠和步数记录，但它们不能说明完整身体状况。", "如果你想安排训练，请补充目标、经验、器械、时间和运动限制。", "计划会先保存为草案，由你修改并确认。"]
                    for phrase in phrases {
                        try Task.checkCancellation()
                        try await Task.sleep(for: delay)
                        continuation.yield(.delta(phrase + "\n"))
                    }
                    continuation.yield(.complete)
                    continuation.finish()
                } catch { continuation.finish(throwing: error) }
            }
            continuation.onTermination = { @Sendable _ in task.cancel() }
        }
    }

    public func planDraft(preferences: UserPreferences, scenario: DemoScenario) async throws -> TrainingPlan {
        guard (10...90).contains(preferences.availableMinutes),
              !preferences.goal.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw ServiceError.invalidInput("请填写目标，并设置10–90分钟可用时间。")
        }
        try await prepare(scenario)
        // No automatic prescription for an unspecified medical or movement restriction.
        guard preferences.limitations.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw ServiceError.invalidInput("演示教练无法评估运动限制。请先咨询专业人士，不自动生成适配方案。")
        }
        let sessions = [0, 2, 4].map { offset in
            WorkoutSession(title: "轻量全身", scheduledAt: DemoData.calendar.date(byAdding: .day, value: offset, to: DemoData.today)!,
                minutes: preferences.availableMinutes, exercises: [
                    Exercise(name: "舒适步行", prescription: "热身5分钟"),
                    Exercise(name: "自重深蹲", prescription: "2组 × 8次，量力而行"),
                    Exercise(name: "墙壁俯卧撑", prescription: "2组 × 8次"),
                    Exercise(name: "轻松整理", prescription: "舒缓活动5分钟")
                ])
        }
        return TrainingPlan(title: "\(preferences.goal) · 演示草案", sessions: sessions)
    }
}

public extension DemoHealthDataService {
    func requestAuthorization() async throws {}
    func summaries(from: Date, through: Date) async throws -> [DailySummary] { try await summaries(scenario: .normal) }
}
public extension DemoCoachService {
    func report(for summary: DailySummary, history: [DailySummary]) async throws -> HealthReport {
        try await report(for: summary, history: history, scenario: .normal)
    }
    func answer(question: String, summary: DailySummary?, messages: [ChatMessage]) -> AsyncThrowingStream<CoachEvent, Error> {
        answer(question: question, summary: summary, scenario: .normal)
    }
    func planDraft(preferences: UserPreferences) async throws -> TrainingPlan { try await planDraft(preferences: preferences, scenario: .normal) }
}

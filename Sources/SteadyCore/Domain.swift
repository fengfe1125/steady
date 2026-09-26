import Foundation

public enum DataSource: String, Codable, Sendable { case demo, manual, healthKit, generated }

public struct RecordMetadata: Codable, Equatable, Sendable {
    public var id: UUID
    public var createdAt: Date
    public var updatedAt: Date
    public var source: DataSource
    public var schemaVersion: Int
    public var revision: Int?

    public init(id: UUID = UUID(), date: Date = Date(), source: DataSource = .demo) {
        self.id = id
        createdAt = date
        updatedAt = date
        self.source = source
        schemaVersion = 1
    }
}

public struct DailySummary: Codable, Equatable, Identifiable, Sendable {
    public var metadata: RecordMetadata
    public var dayKey: String
    public var timeZoneID: String
    public var date: Date
    public var weightKG: Double?
    public var sleepMinutes: Int?
    public var steps: Int?
    public var activeMinutes: Int?
    public var metricSources: [String: [String]]?
    public var calculationVersion: Int?
    public var id: UUID { metadata.id }

    public init(metadata: RecordMetadata, dayKey: String, timeZoneID: String, date: Date,
                weightKG: Double?, sleepMinutes: Int?, steps: Int?, activeMinutes: Int?) {
        self.metadata = metadata; self.dayKey = dayKey; self.timeZoneID = timeZoneID; self.date = date
        self.weightKG = weightKG; self.sleepMinutes = sleepMinutes; self.steps = steps; self.activeMinutes = activeMinutes
    }

    public var missingMetrics: [String] {
        [(weightKG == nil, "体重"), (sleepMinutes == nil, "睡眠"),
         (steps == nil, "步数"), (activeMinutes == nil, "活动分钟")]
            .filter(\.0).map(\.1)
    }
}

public struct EvidenceReference: Codable, Equatable, Identifiable, Sendable {
    public var id: UUID
    public var summaryID: UUID
    public var dayKey: String
    public var metric: String
    public var value: String
    public var source: DataSource
    public var summaryVersion: Int?
    public init(id: UUID = UUID(), summaryID: UUID, dayKey: String, metric: String, value: String, source: DataSource) {
        self.id = id; self.summaryID = summaryID; self.dayKey = dayKey; self.metric = metric; self.value = value; self.source = source
    }
}

public struct ReportSection: Codable, Equatable, Identifiable, Sendable {
    public var id: UUID
    public var title: String
    public var body: String
    public var evidence: [EvidenceReference]
    public init(id: UUID = UUID(), title: String, body: String, evidence: [EvidenceReference]) {
        self.id = id; self.title = title; self.body = body; self.evidence = evidence
    }
}

public struct HealthReport: Codable, Equatable, Identifiable, Sendable {
    public var metadata: RecordMetadata
    public var summaryID: UUID
    public var sections: [ReportSection]
    public var id: UUID { metadata.id }
    public init(metadata: RecordMetadata, summaryID: UUID, sections: [ReportSection]) {
        self.metadata = metadata; self.summaryID = summaryID; self.sections = sections
    }
}

public enum MessageRole: String, Codable, Sendable { case user, coach }
public enum MessageStatus: String, Codable, Sendable { case generating, complete, cancelled, failed }

public struct ChatMessage: Codable, Equatable, Identifiable, Sendable {
    public var metadata: RecordMetadata
    public var role: MessageRole
    public var content: String
    public var evidence: [EvidenceReference]
    public var status: MessageStatus
    public var id: UUID { metadata.id }

    public init(role: MessageRole, content: String, status: MessageStatus = .complete,
                evidence: [EvidenceReference] = []) {
        metadata = RecordMetadata()
        self.role = role
        self.content = content
        self.status = status
        self.evidence = evidence
    }
}

public struct Conversation: Codable, Equatable, Identifiable, Sendable {
    public var metadata: RecordMetadata
    public var title: String
    public var messages: [ChatMessage]
    public var id: UUID { metadata.id }

    public init(title: String, messages: [ChatMessage] = []) {
        metadata = RecordMetadata()
        self.title = title
        self.messages = messages
    }
}

public struct Exercise: Codable, Equatable, Identifiable, Sendable {
    public var id: UUID
    public var name: String
    public var prescription: String

    public init(name: String, prescription: String) {
        id = UUID()
        self.name = name
        self.prescription = prescription
    }
}

public struct WorkoutFeedback: Codable, Equatable, Sendable {
    public var completed: Bool
    public var perceivedEffort: Int
    public var note: String
    public var recordedAt: Date

    public init(completed: Bool, perceivedEffort: Int, note: String, recordedAt: Date = Date()) throws {
        guard (1...10).contains(perceivedEffort) else { throw ServiceError.invalidInput("主观强度需为 1–10。") }
        self.completed = completed
        self.perceivedEffort = perceivedEffort
        self.note = note
        self.recordedAt = recordedAt
    }
}

public struct WorkoutSession: Codable, Equatable, Identifiable, Sendable {
    public var metadata: RecordMetadata
    public var title: String
    public var scheduledAt: Date
    public var minutes: Int
    public var exercises: [Exercise]
    public var feedback: WorkoutFeedback?
    public var id: UUID { metadata.id }

    public init(title: String, scheduledAt: Date, minutes: Int, exercises: [Exercise]) {
        metadata = RecordMetadata()
        self.title = title
        self.scheduledAt = scheduledAt
        self.minutes = minutes
        self.exercises = exercises
    }
}

public enum PlanStatus: String, Codable, Sendable { case draft, confirmed }

public struct TrainingPlan: Codable, Equatable, Identifiable, Sendable {
    public var metadata: RecordMetadata
    public var title: String
    public var status: PlanStatus
    public var sessions: [WorkoutSession]
    public var id: UUID { metadata.id }

    public init(title: String, sessions: [WorkoutSession]) {
        metadata = RecordMetadata()
        self.title = title
        status = .draft
        self.sessions = sessions
    }

    public mutating func confirm(at date: Date = Date()) throws {
        guard !sessions.isEmpty else { throw ServiceError.invalidInput("请先添加训练安排。") }
        status = .confirmed
        metadata.updatedAt = date
    }

    public mutating func updateSession(_ session: WorkoutSession, at date: Date = Date()) throws {
        guard let index = sessions.firstIndex(where: { $0.id == session.id }) else {
            throw ServiceError.invalidInput("找不到该次训练。")
        }
        var updated = session
        updated.metadata.updatedAt = date
        sessions[index] = updated
        metadata.updatedAt = date
    }
}

public struct UserPreferences: Codable, Equatable, Sendable {
    public var metadata = RecordMetadata()
    public var goal = "建立运动习惯"
    public var experience = "初学者"
    public var equipment = "自重"
    public var availableMinutes = 25
    public var limitations = ""
    public var healthRead = false
    public var cloudSync = false
    public var aiProcessing = false
    public var onboardingComplete = false
    public init() {}
}

public enum DemoScenario: String, CaseIterable, Codable, Sendable {
    case normal = "正常样例"
    case missing = "缺失数据"
    case offline = "离线"
    case failure = "请求失败"
}

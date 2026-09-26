import Foundation

public enum ServiceError: Error, Equatable, LocalizedError, Sendable {
    case offline, simulatedFailure, notConfigured
    case unauthenticated, consentRequired, invalidResponse, interrupted
    case invalidInput(String)

    public var errorDescription: String? {
        switch self {
        case .unauthenticated: "请先登录账户。"
        case .consentRequired: "请在设置中明确同意对应的数据用途。"
        case .invalidResponse: "服务返回的数据未通过验证，请稍后重试。"
        case .interrupted: "连接已中断，已收到的内容仍保留。"
        case .offline: "当前是离线演示。历史记录仍可查看，请切换正常场景后重试生成。"
        case .simulatedFailure: "模拟请求失败。记录没有丢失，可以重试。"
        case .notConfigured: "尚未配置云服务。本机健康读取与记录仍可使用。"
        case .invalidInput(let message): message
        }
    }
}

public enum AuthState: Equatable, Sendable { case signedOut, signedIn(userID: UUID) }
public enum SyncState: Equatable, Sendable { case notConfigured, idle, syncing, offline, failed(String) }
public enum CoachEvent: Equatable, Sendable {
    case delta(String), evidence([EvidenceReference]), complete
}

public protocol HealthDataService: Sendable {
    func requestAuthorization() async throws
    func summaries(from: Date, through: Date) async throws -> [DailySummary]
}

public protocol AuthService: Sendable {
    func changes() -> AsyncStream<AuthState>
    func state() async -> AuthState
    func signIn() async throws
    func sendCode(email: String, deleting: Bool) async throws
    func verifyCode(email: String, code: String) async throws
    func deleteAccount(code: String) async throws
    func signOut() async throws
    func deleteAccount() async throws
}

public protocol SyncService: Sendable {
    func state() async -> SyncState
    func sync() async throws
    func retry() async throws
    func restoreHistory() async throws
    func details() async -> SyncDetails
    func clearCloudRecords() async throws
}

public protocol CoachService: Sendable {
    func report(for summary: DailySummary, history: [DailySummary]) async throws -> HealthReport
    func answer(question: String, summary: DailySummary?, messages: [ChatMessage]) -> AsyncThrowingStream<CoachEvent, Error>
    func planDraft(preferences: UserPreferences) async throws -> TrainingPlan
}

@MainActor public protocol PlanRepository {
    func plans() throws -> [TrainingPlan]
    func save(_ plan: TrainingPlan) throws
    func delete(id: UUID) throws
}

public struct DemoAuthService: AuthService {
    public init() {}
    public func state() async -> AuthState { .signedOut }
    public func signIn() async throws { throw ServiceError.notConfigured }
    public func signOut() async throws {}
    public func deleteAccount() async throws { throw ServiceError.notConfigured }
}

public struct DemoSyncService: SyncService {
    public init() {}
    public func state() async -> SyncState { .notConfigured }
    public func sync() async throws { throw ServiceError.notConfigured }
    public func retry() async throws { throw ServiceError.notConfigured }
    public func restoreHistory() async throws { throw ServiceError.notConfigured }
}

public struct SyncDetails: Sendable {
    public var lastSync: Date?
    public var pending: Int
    public init(lastSync: Date? = nil, pending: Int = 0) { self.lastSync = lastSync; self.pending = pending }
}
public extension SyncService {
    func clearCloudRecords() async throws { throw ServiceError.notConfigured }
    func details() async -> SyncDetails { SyncDetails() }
}

public extension AuthService {
    func changes() -> AsyncStream<AuthState> { AsyncStream { $0.finish() } }
}

public extension AuthService {
    func sendCode(email: String, deleting: Bool) async throws { throw ServiceError.notConfigured }
    func verifyCode(email: String, code: String) async throws { throw ServiceError.notConfigured }
    func deleteAccount(code: String) async throws { try await deleteAccount() }
}

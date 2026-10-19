import Foundation
import Supabase
import SteadyCore

public struct CloudClient: Sendable {
    public let client: SupabaseClient
    public let configuration: LiveConfiguration
    private let transport: URLSession
    public init(configuration: LiveConfiguration) {
        self.configuration = configuration
        client = SupabaseClient(supabaseURL: configuration.url, supabaseKey: configuration.publishableKey,
            options: .init(auth: .init(emitLocalSessionAsInitialSession: true)))
        let settings = URLSessionConfiguration.ephemeral
        settings.timeoutIntervalForRequest = 90; settings.timeoutIntervalForResource = 110
        transport = URLSession(configuration: settings)
    }
    public func request<Body: Encodable & Sendable>(_ route: String, body: Body, expectedUser: UUID? = nil) async throws -> URLRequest {
        let session = try await client.auth.session
        if let expectedUser, session.user.id != expectedUser { throw CancellationError() }
        var request = URLRequest(url: configuration.url.appending(path: "functions/v1/\(route)"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(configuration.publishableKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if route == "sync-pull" { request.setValue(RecordKind.allCases.map(\.rawValue).joined(separator: ","), forHTTPHeaderField: "X-Steady-Record-Kinds") }
        request.httpBody = try WireCodec.encoder().encode(body)
        return request
    }
    public func call<Body: Encodable & Sendable, Result: Decodable & Sendable>(_ route: String, body: Body, expectedUser: UUID? = nil, as: Result.Type = Result.self) async throws -> Result {
        let request = try await request(route, body: body, expectedUser: expectedUser)
        let (data, response) = try await transport.data(for: request)
        try Self.validate(response, data: data)
        return try WireCodec.decoder().decode(Result.self, from: data)
    }
    public func bytes(for request: URLRequest) async throws -> (URLSession.AsyncBytes, URLResponse) { try await transport.bytes(for: request) }
    public static func validate(_ response: URLResponse, data: Data = Data()) throws {
        guard let response = response as? HTTPURLResponse else { throw ServiceError.invalidResponse }
        guard (200...299).contains(response.statusCode) else {
            let code = (try? JSONDecoder().decode(Failure.self, from: data))?.code ?? ""
            switch code {
            case "consent_required": throw ServiceError.consentRequired
            case "rate_limited": throw ServiceError.invalidInput("今日生成次数已用完，请明天再试。")
            case "request_in_progress": throw ServiceError.invalidInput("已有生成任务正在执行，请稍后重试。")
            case "duplicate_request": throw ServiceError.invalidInput("这个请求已处理。若结果未收到，请主动发起新的生成。")
            case "lower_body_disabled": throw ServiceError.invalidInput("下肢基础编排尚未在服务端启用，已有计划和教学仍可使用。")
            case "plan_catalog_disabled": throw ServiceError.invalidInput("新版动作计划尚未在服务端启用，已有计划和教学仍可使用。")
            case "plan_equipment_required": throw ServiceError.invalidInput("请先确认本次可用的具体器械。")
            case "plan_conditions_insufficient": throw ServiceError.invalidInput("这些条件下暂时没有完整的审核模板组合，请调整训练目标、器械或可用时间。")
            case "insufficient_data": throw ServiceError.invalidInput("没有足够的健康数据，请先读取健康记录。")
            case "account_deleting": throw ServiceError.invalidInput("账户删除尚未完成，请在设置中继续处理。")
            default:
                if response.statusCode == 401 { throw ServiceError.unauthenticated }
                throw ServiceError.invalidInput("服务暂时不可用（\(response.statusCode)），记录仍保存在本机。")
            }
        }
    }
    private struct Failure: Decodable { var code: String }
}

public struct UnconfiguredCoachService: CoachService {
    public init() {}
    public func report(for summary: DailySummary, history: [DailySummary]) async throws -> HealthReport { throw ServiceError.notConfigured }
    public func answer(question: String, summary: DailySummary?, messages: [ChatMessage]) -> AsyncThrowingStream<CoachEvent, Error> { AsyncThrowingStream { $0.finish(throwing: ServiceError.notConfigured) } }
    public func planDraft(preferences: UserPreferences) async throws -> TrainingPlan { throw ServiceError.notConfigured }
}

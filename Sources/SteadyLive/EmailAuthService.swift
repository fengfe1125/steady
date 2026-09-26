import Foundation
import SteadyCore

/// Email OTP is the internal-test account provider while Apple signing is unavailable.
public actor EmailAuthService: AuthService {
    private let cloud: CloudClient
    public init(cloud: CloudClient) { self.cloud = cloud }
    public func state() async -> AuthState {
        cloud.client.auth.currentUser.map { .signedIn(userID: $0.id) } ?? .signedOut
    }
    public func signIn() async throws { throw ServiceError.invalidInput("请输入邮箱并获取验证码。") }
    public func sendCode(email: String, deleting: Bool) async throws {
        let address: String
        if deleting {
            guard let current = cloud.client.auth.currentUser?.email else { throw ServiceError.unauthenticated }
            address = current
        } else { address = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
        guard address.contains("@"), address.count <= 254 else { throw ServiceError.invalidInput("请输入有效的邮箱地址。") }
        // Internal builds only admit accounts provisioned on the hosted project.
        try await cloud.client.auth.signInWithOTP(email: address, shouldCreateUser: false)
    }
    public func verifyCode(email: String, code: String) async throws {
        _ = try await cloud.client.auth.verifyOTP(email: email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(), token: code.trimmingCharacters(in: .whitespacesAndNewlines), type: .email)
    }
    public func signOut() async throws { try await cloud.client.auth.signOut(scope: .local) }
    public func deleteAccount() async throws { throw ServiceError.invalidInput("请先获取账户邮箱验证码。") }
    public func deleteAccount(code: String) async throws {
        guard let user = cloud.client.auth.currentUser else { throw ServiceError.unauthenticated }
        struct Body: Encodable, Sendable { var emailCode: String }
        struct Reply: Decodable, Sendable { var deleted: Bool }
        let reply: Reply = try await cloud.call("account-delete", body: Body(emailCode: code.trimmingCharacters(in: .whitespacesAndNewlines)), expectedUser: user.id)
        guard reply.deleted else { throw ServiceError.invalidResponse }
        try await cloud.client.auth.signOut(scope: .local)
    }
    public nonisolated func changes() -> AsyncStream<AuthState> {
        AsyncStream { continuation in
            let task = Task {
                for await (_, session) in cloud.client.auth.authStateChanges {
                    continuation.yield(session.map { .signedIn(userID: $0.user.id) } ?? .signedOut)
                }
                continuation.finish()
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }
}

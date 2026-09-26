import Foundation
import Supabase
import SteadyCore
#if os(iOS)
import AuthenticationServices
import CryptoKit
import Security
import UIKit

struct AppleTokens: Sendable { var idToken: String; var code: String; var nonce: String }
@MainActor final class AppleAuthorization: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private var continuation: CheckedContinuation<AppleTokens, Error>?
    private var nonce = ""
    private var controller: ASAuthorizationController?
    func authorize() async throws -> AppleTokens {
        guard continuation == nil else { throw ServiceError.invalidInput("Apple 登录正在进行中。") }
        var random = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, random.count, &random) == errSecSuccess else { throw ServiceError.invalidResponse }
        nonce = random.map { String(format: "%02x", $0) }.joined()
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.nonce = SHA256.hash(data: Data(nonce.utf8)).map { String(format: "%02x", $0) }.joined()
        return try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self; controller.presentationContextProvider = self; self.controller = controller
            controller.performRequests()
        }
    }
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap(\.windows).first(where: \.isKeyWindow) ?? ASPresentationAnchor()
    }
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let token = credential.identityToken.flatMap({ String(data: $0, encoding: .utf8) }),
              let code = credential.authorizationCode.flatMap({ String(data: $0, encoding: .utf8) }) else {
            complete(.failure(ServiceError.invalidResponse)); return
        }
        complete(.success(AppleTokens(idToken: token, code: code, nonce: nonce)))
    }
    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) { complete(.failure(error)) }
    private func complete(_ result: Result<AppleTokens, Error>) { continuation?.resume(with: result); continuation = nil; controller = nil; nonce = "" }
}
#endif

public actor AppleAuthService: AuthService {
    private let cloud: CloudClient
    public init(cloud: CloudClient) { self.cloud = cloud }
    public func state() async -> AuthState {
        guard let user = cloud.client.auth.currentUser else { return .signedOut }
        return .signedIn(userID: user.id)
    }
    public func signIn() async throws {
        #if os(iOS)
        let driver = await AppleAuthorization()
        let credential = try await driver.authorize()
        _ = try await cloud.client.auth.signInWithIdToken(credentials: .init(provider: .apple, idToken: credential.idToken, nonce: credential.nonce))
        #else
        throw ServiceError.notConfigured
        #endif
    }
    public func signOut() async throws { try await cloud.client.auth.signOut(scope: .local) }
    public func deleteAccount() async throws {
        #if os(iOS)
        guard let user = cloud.client.auth.currentUser else { throw ServiceError.unauthenticated }
        let driver = await AppleAuthorization()
        let credential = try await driver.authorize()
        struct Body: Encodable, Sendable { var idToken: String; var authorizationCode: String; var nonce: String }
        struct Reply: Decodable, Sendable { var deleted: Bool }
        let reply: Reply = try await cloud.call("account-delete", body: Body(idToken: credential.idToken, authorizationCode: credential.code, nonce: credential.nonce), expectedUser: user.id)
        guard reply.deleted else { throw ServiceError.invalidResponse }
        try await cloud.client.auth.signOut(scope: .local)
        #else
        throw ServiceError.notConfigured
        #endif
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

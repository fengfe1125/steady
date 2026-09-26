import Foundation
import SteadyCore

public struct LiveConfiguration: Sendable {
    public let url: URL
    public let publishableKey: String
    public init(url: String, publishableKey: String) throws {
        guard let parsed = URL(string: url), parsed.scheme == "https", parsed.host != nil,
              publishableKey.hasPrefix("sb_publishable_"), !publishableKey.contains("$(") else {
            throw ServiceError.invalidInput("请配置 Supabase HTTPS 地址和公开 publishable key。")
        }
        self.url = parsed; self.publishableKey = publishableKey
    }
}

import Testing
@testable import SteadyLive
@Test func rejectsPrivilegedKeysAndInsecureEndpoints() {
    #expect(throws: (any Error).self) { try LiveConfiguration(url: "http://example.com", publishableKey: "sb_publishable_test") }
    #expect(throws: (any Error).self) { try LiveConfiguration(url: "https://example.com", publishableKey: "sb_secret_test") }
}

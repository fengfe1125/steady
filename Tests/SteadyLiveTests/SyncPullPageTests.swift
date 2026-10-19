import Foundation
import Testing
import SteadyCore
@testable import SteadyLive

struct SyncPullPageTests {
    @Test func unknownKindsAdvanceCursorButKnownMalformedRecordsFail() throws {
        let json = #"{"records":[{"kind":"futureType","payload":"opaque"}],"cursor":12,"hasMore":true}"#
        let page = try JSONDecoder().decode(SyncPullPage.self, from: Data(json.utf8))
        #expect(page.records.isEmpty); #expect(page.cursor == 12); #expect(page.hasMore)
        #expect(!page.supportedKinds.contains("workoutLogs"))
        let bad = json.replacingOccurrences(of: "futureType", with: "workoutLogs")
        #expect(throws: (any Error).self) { try JSONDecoder().decode(SyncPullPage.self, from: Data(bad.utf8)) }
    }
}

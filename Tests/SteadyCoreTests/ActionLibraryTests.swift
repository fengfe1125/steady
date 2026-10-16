import Foundation
import Testing
@testable import SteadyCore

struct ActionLibraryTests {
    private static let repo = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()

    @Test func chestLibraryLoadsAllApprovedMoves() throws {
        let rows = try ActionLibrary.entries(part: "chest")
        #expect(rows.count == 280)
        #expect(Set(rows.map(\.id)).count == rows.count)
        let groups = try ActionLibrary.groups(part: "chest")
        #expect(groups.map(\.title) == ["俯卧撑", "其他徒手", "哑铃与壶铃", "杠铃", "器械与绳索", "弹力带与悬挂带", "球与小器材", "拉伸放松"])
        #expect(groups.reduce(0) { $0 + $1.entries.count } == rows.count)
    }

    @Test func everyPageUsesTheBundledRuntimeAndNeverCitesTheSourceVideo() throws {
        for row in try ActionLibrary.entries(part: "chest") {
            let url = try #require(row.artworkURL, "\(row.id) has no page")
            #expect(try TrainingArtworkDocument.usesBundledAnatomy(at: url), "\(row.id)")
            let html = try String(contentsOf: url, encoding: .utf8)
            #expect(!html.contains("原片") && !html.contains("视频") && !html.contains("sourceSeconds"), "\(row.id) mentions the source video")
            #expect(row.animation.steps.allSatisfy { $0.startSeconds <= $0.endSeconds && $0.endSeconds <= row.animation.durationSeconds + 0.001 }, "\(row.id)")
        }
    }

    @Test func everyMoveHasLightAndDarkIcons() throws {
        let icons = Self.repo.appendingPathComponent("Steady/Assets.xcassets/ActionLibraryIcons")
        for row in try ActionLibrary.entries(part: "chest") {
            let set = icons.appendingPathComponent("\(row.iconName).imageset")
            for name in ["light.png", "dark.png", "Contents.json"] {
                #expect(FileManager.default.fileExists(atPath: set.appendingPathComponent(name).path), "\(row.iconName)/\(name)")
            }
        }
    }

    @Test func unknownPartsAreRejected() {
        #expect(throws: TrainingCollectionLoadError.self) { try ActionLibrary.entries(part: "../chest") }
    }
}

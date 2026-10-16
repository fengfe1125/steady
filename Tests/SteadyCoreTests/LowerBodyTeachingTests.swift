import Foundation
import Testing
@testable import SteadyCore

struct LowerBodyTeachingTests {
    private let ids = ["chair-sit-to-stand", "floor-glute-bridge", "supported-calf-raise", "bodyweight-squat", "supported-split-squat", "side-lying-hip-abduction", "unloaded-hip-hinge"].map { "legs-basic-" + $0 }

    @Test func supplementalLessonsResolveOfflineWithCompleteTeachingStages() throws {
        let catalog = try AnimatedTrainingCatalog.legsCandidate()
        let lessons = try #require(catalog.collection.sections.first { $0.id == "legs-basic-supplemental" }).lessons
        #expect(Set(lessons.map(\.id)) == Set(ids))
        for lesson in lessons {
            #expect(lesson.origin == .supplemental)
            #expect(lesson.videoRange == nil)
            #expect(lesson.frames.isEmpty)
            #expect(lesson.steps.count == 6)
            #expect(lesson.references.count >= 2)
            #expect(lesson.references.allSatisfy { $0.url.scheme == "https" })
            #expect(!lesson.checks.isEmpty && !lesson.mistakes.isEmpty)
            let animation = try #require(catalog.animations[lesson.id])
            #expect(animation.steps.count == 6)
            #expect(animation.durationSeconds == 8)
            #expect(animation.steps.map(\.startSeconds) == [0, 1, 2, 4, 5, 7])
            #expect(animation.steps.map(\.instruction) == lesson.steps.map(\.detail))
            #expect(animation.stepIndex(at: 8) == 5)
            let url = try #require(catalog.artworkURL(for: lesson.id))
            let html = try String(contentsOf: url, encoding: .utf8)
            #expect(html.contains("legs-basic-renderer.js"))
            #expect(!html.contains("<iframe") && !html.contains("<video") && !html.contains("<img"))
            #expect(try TrainingArtworkDocument.usesBundledAnatomy(at: url))
            #expect(FileManager.default.isReadableFile(atPath: url.deletingLastPathComponent().appendingPathComponent("legs-basic-renderer.js").path))
        }
    }

    @Test func referencesKeepFloorBridgeDistinctFromBallBridgeAndHingeFromSquat() throws {
        let course = try AnimatedTrainingCatalog.legsCandidate().collection
        let bridge = try #require(course.lesson(id: "legs-basic-floor-glute-bridge"))
        #expect(bridge.references.contains { $0.url.path.contains("/49/glute-bridge") })
        #expect(!bridge.references.contains { $0.url.path.contains("/66/") })
        let hinge = try #require(course.lesson(id: "legs-basic-unloaded-hip-hinge"))
        #expect(hinge.dosage.contains("不是力量主练"))
        #expect(hinge.steps[2].detail.contains("膝弯曲幅度基本保持"))
        let seated = try #require(course.lesson(id: "legs-basic-chair-sit-to-stand"))
        #expect(seated.equipment.contains("稳定"))
    }
}

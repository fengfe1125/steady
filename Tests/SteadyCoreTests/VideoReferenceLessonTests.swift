import Foundation
import Testing
@testable import SteadyCore

struct VideoReferenceLessonTests {
    @Test func sixExamplesResolveWithoutChangingPlanCatalog() throws {
        let examples = try VideoReferenceLesson.loadAll()
        #expect(examples.count == 6)
        #expect(examples.filter(\.compatible).count == 3)
        let catalog = try ExerciseCatalog.load(version: 2)
        for example in examples {
            #expect(example.lesson.origin == .supplemental)
            #expect(example.lesson.videoRange == nil)
            #expect(example.lesson.references.isEmpty)
            #expect(example.animation.steps.count == 6)
            #expect(example.animation.steps.first?.startSeconds == 0)
            #expect(example.animation.steps.last?.endSeconds == example.animation.durationSeconds)
            for (index, step) in example.animation.steps.enumerated() {
                #expect(step.startSeconds < step.endSeconds)
                #expect(step.previewSeconds >= 0 && step.previewSeconds <= example.animation.durationSeconds)
                if index > 0 { #expect(step.startSeconds == example.animation.steps[index - 1].endSeconds) }
            }
            let artwork = try #require(example.artworkURL)
            #expect(try TrainingArtworkDocument.usesBundledAnatomy(at: artwork))
            let decoded = try TrainingArtworkDocument.anatomyExplanations(at: artwork, lessonID: example.lesson.id)
            let explanations = try #require(decoded)
            #expect(explanations.detailExplanation == example.animation.detailExplanation)
            #expect(explanations.mistakeExplanation.contains("教学示意"))
            #expect(catalog.exercises.contains { $0.defaultTeaching.lessonID == example.existingLessonID })
            #expect(VideoReferenceLesson.matching(lessonID: example.existingLessonID)?.id == example.id)
        }
        #expect(VideoReferenceLesson.matching(lessonID: "unknown") == nil)
        #expect(VideoReferenceLesson.matching(lessonID: examples[0].lesson.id) == nil) // no recursive link
        #expect(catalog.exercises.count == 92)
        #expect(catalog.exercises.filter { $0.status == "approved" }.count == 39)
    }
}

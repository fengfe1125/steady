import Foundation
import Testing
@testable import SteadyCore

struct TrainingArtworkDocumentTests {
    private struct EquipmentHandoff: Decodable {
        let id: String
        let resource: String
        let timing: EquipmentTiming
        let detailExplanation: String
        let mistakeExplanation: String
    }

    @Test func allFourteenEquipmentExplanationsMatchTheDrawingHandoff() throws {
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        let receipt = root.appendingPathComponent("docs/verification/equipment-anatomy-upgrade/native-handoff.json")
        let handoff = try JSONDecoder().decode([EquipmentHandoff].self, from: Data(contentsOf: receipt))
        #expect(Set(handoff.map(\.id)) == Set(EquipmentLessonID.equipmentLibrary.map(\.rawValue)))
        #expect(handoff.count == 14)
        for row in handoff {
            let id = try #require(EquipmentLessonID(rawValue: row.id))
            let definition = EquipmentLessonDefinition.lesson(id)
            #expect(row.resource == definition.resource + ".html")
            #expect(row.timing == definition.timing)
            let url = root.appendingPathComponent("Steady/" + row.resource)
            let native = try #require(try TrainingArtworkDocument.anatomyExplanations(at: url, lessonID: row.id))
            #expect(native.detailExplanation == row.detailExplanation)
            #expect(native.mistakeExplanation == row.mistakeExplanation)
        }
    }

    @Test func nativeExplanationRejectsTheWrongLessonIdentity() throws {
        let collection = try AnimatedTrainingCatalog.shouldersCandidate()
        let url = try #require(collection.artworkURL(for: "shoulders-light-warmup"))
        #expect(throws: (any Error).self) {
            try TrainingArtworkDocument.anatomyExplanations(at: url, lessonID: "another-lesson")
        }
    }

    @Test func shoulderUsesItsAdjacentBundledEngine() throws {
        let collection = try AnimatedTrainingCatalog.shouldersCandidate()
        let url = try #require(collection.artworkURL(for: "shoulders-light-warmup"))
        #expect(try TrainingArtworkDocument.usesBundledAnatomy(at: url))
    }

    @Test func missingEngineCannotFallBackToTheLegacyRuntime() throws {
        let collection = try AnimatedTrainingCatalog.shouldersCandidate()
        let source = try #require(collection.artworkURL(for: "shoulders-light-warmup"))
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let url = directory.appendingPathComponent(source.lastPathComponent)
        try FileManager.default.copyItem(at: source, to: url)
        #expect(throws: TrainingCollectionLoadError.self) {
            try TrainingArtworkDocument.usesBundledAnatomy(at: url)
        }
    }

    @Test func legacyAndIncompleteAnatomyDocumentsAreDistinct() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let url = directory.appendingPathComponent("lesson.html")
        try "<script>window.renderEquipment = () => {};</script>".write(to: url, atomically: true, encoding: .utf8)
        #expect(try !TrainingArtworkDocument.usesBundledAnatomy(at: url))
        try "<script>window.SteadyLesson={};</script>".write(to: url, atomically: true, encoding: .utf8)
        #expect(throws: TrainingCollectionLoadError.self) {
            try TrainingArtworkDocument.usesBundledAnatomy(at: url)
        }
    }
}

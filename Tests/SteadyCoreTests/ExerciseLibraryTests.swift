import Foundation
import Testing
@testable import SteadyCore

@Suite struct ExerciseLibraryTests {
    @Test func bundledLibraryLoadsWithLabelsAndSource() throws {
        let library = try ExerciseLibrary.load()
        #expect(library.exercises.count == 1324)
        #expect(library.source.license == "MIT")
        #expect(library.source.licenseText.hasPrefix("MIT License"))
        let press = try #require(library.entry(id: "edb-0025"))
        #expect(press.name == "杠铃卧推")
        #expect(library.label(press.equipment) == "杠铃")
        #expect(library.label(press.target) == "胸大肌")
        #expect(!press.steps.isEmpty)
    }

    @Test func searchMatchesChineseEnglishAndPinyin() throws {
        let library = try ExerciseLibrary.load()
        #expect(library.search("杠铃卧推").first?.id == "edb-0025")
        #expect(library.search("barbell bench press").first?.id == "edb-0025")
        #expect(library.search("gangling wotui").first?.id == "edb-0025")
        #expect(library.search("glwt").contains { $0.id == "edb-0025" })
        #expect(library.search("卧推").count > 10)
        #expect(library.search("not an exercise at all").isEmpty)
    }

    @Test func filtersAndHidesMovementsTheCatalogCovers() throws {
        let library = try ExerciseLibrary.load()
        let dumbbells = library.search("", equipment: "dumbbell")
        #expect(!dumbbells.isEmpty && dumbbells.allSatisfy { $0.equipment == "dumbbell" })
        #expect(library.search("", bodyPart: "chest").allSatisfy { $0.bodyPart == "chest" })
        // Lat pulldown and goblet squat are reviewed catalog entries, so the library copy stays hidden.
        #expect(library.entry(id: "edb-0198")?.catalogEquivalents == ["lat-pulldown"])
        #expect(!library.search("").contains { $0.id == "edb-0198" || $0.id == "edb-1760" })
        #expect(library.search("").count == library.exercises.filter(\.catalogEquivalents.isEmpty).count)
    }

    @Test func libraryMoveKeepsStableIdentityThroughCoding() throws {
        let library = try ExerciseLibrary.load()
        let row = try #require(library.entry(id: "edb-0541"))
        let move = WorkoutMove(library: row)
        #expect(move.identity == "library:edb-0541")
        #expect(move.libraryID == "edb-0541")
        #expect(move.catalogID == nil && move.teaching == nil)
        #expect(move.perSide && move.metric == .weightReps)
        try move.validate()
        let decoded = try JSONDecoder().decode(WorkoutMove.self, from: JSONEncoder().encode(move))
        #expect(decoded == move)
        #expect(library.entry(identity: decoded.identity)?.id == "edb-0541")
        #expect(library.entry(identity: "custom:\(UUID().uuidString)") == nil)
        #expect(try WorkoutMove(library: #require(library.entry(id: "edb-1511"))).metric == .duration)
        #expect(try WorkoutMove(library: #require(library.entry(id: "edb-0662"))).metric == .reps)
    }
}

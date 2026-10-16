import CoreGraphics
import Foundation
import Testing
@testable import SteadyCore

@Suite struct SVGPathTests {
    @Test func parsesCompactNumbersAndImplicitCommands() throws {
        let commands = try SVGPath.parse("M1-2.5.5.5l1 1 2 2H10v-1zm1,1")
        #expect(commands == [
            .move(CGPoint(x: 1, y: -2.5)), .line(CGPoint(x: 0.5, y: 0.5)),
            .line(CGPoint(x: 1.5, y: 1.5)), .line(CGPoint(x: 3.5, y: 3.5)),
            .line(CGPoint(x: 10, y: 3.5)), .line(CGPoint(x: 10, y: 2.5)), .close,
            .move(CGPoint(x: 2, y: -1.5)),
        ])
    }

    @Test func resolvesRelativeAndSmoothCurves() throws {
        let commands = try SVGPath.parse("M0 0c1 1 2 1 3 0s2-1 3 0q1 1 2 0t2 0")
        #expect(commands == [
            .move(.zero),
            .cubic(control1: CGPoint(x: 1, y: 1), control2: CGPoint(x: 2, y: 1), to: CGPoint(x: 3, y: 0)),
            .cubic(control1: CGPoint(x: 4, y: -1), control2: CGPoint(x: 5, y: -1), to: CGPoint(x: 6, y: 0)),
            .quad(control: CGPoint(x: 7, y: 1), to: CGPoint(x: 8, y: 0)),
            .quad(control: CGPoint(x: 9, y: -1), to: CGPoint(x: 10, y: 0)),
        ])
    }

    @Test func readsArcFlagsWithoutSeparatorsAndEndsOnTheTarget() throws {
        // "01.94.03": large-arc 0, sweep 1, then x .94 and y .03 — the form MuscleMap's data uses.
        let compact = try SVGPath.parse("M10 10a1.24 1.21-42.6 01.94.03")
        let spaced = try SVGPath.parse("M10 10 a 1.24 1.21 -42.6 0 1 0.94 0.03")
        #expect(compact == spaced)
        guard case .cubic(_, _, let end) = try #require(compact.last) else { Issue.record("arc should become cubics"); return }
        #expect(abs(end.x - 10.94) < 1e-9 && abs(end.y - 10.03) < 1e-9)
    }

    @Test func approximatesASemicircleWithinTheEllipse() throws {
        let commands = try SVGPath.parse("M0 0A10 10 0 0 1 20 0")
        #expect(commands.count == 3) // move + two quarter-turn cubics
        let bounds = SVGPath.bounds(commands)
        #expect(abs(bounds.minY - -10) < 0.01 || abs(bounds.maxY - 10) < 0.01)
        #expect(bounds.width <= 20.01)
    }

    @Test func rejectsMalformedData() {
        #expect(throws: SVGPath.ParseError.self) { try SVGPath.parse("10 10") }
        #expect(throws: SVGPath.ParseError.self) { try SVGPath.parse("M10") }
        #expect(throws: SVGPath.ParseError.self) { try SVGPath.parse("M0 0a1 1 0 2 1 3 3") }
    }
}

@Suite struct MuscleMapTests {
    @Test func bundledMapLoadsBothSidesWithItsLicense() throws {
        let map = try MuscleMapArtwork.load()
        #expect(map.source.license == "MIT")
        #expect(map.source.licenseText.hasPrefix("MIT License"))
        #expect(map.source.licenseText.contains("Copyright (c) 2026 Melih Colpan"))
        #expect(map.source.commit == "3aa662bd5147463b20d523f95d74e1a12c7c8b2e")
        let notice = try #require(Bundle.module.url(forResource: "LICENSE", withExtension: nil, subdirectory: "MuscleMap"))
        #expect(try String(contentsOf: notice, encoding: .utf8) == map.source.licenseText)
        for side in MuscleMapArtwork.Side.allCases {
            let view = try #require(map.view(side))
            #expect(view.regions.count > 15)
            for region in view.regions {
                #expect(!region.commands.isEmpty, "\(side) \(region.id) has no drawing")
                // Every region sits inside its view, so the two figures never overlap or clip.
                let bounds = SVGPath.bounds(region.commands)
                #expect(view.bounds.insetBy(dx: -2, dy: -2).contains(bounds), "\(side) \(region.id) leaves the view box")
            }
        }
    }

    @Test func everyLibraryMuscleIsMappedOrListedAsUnmapped() throws {
        let library = try ExerciseLibrary.load()
        let map = try MuscleMapArtwork.load()
        let ids = Set(library.muscles.map(\.id))
        let mapped = Set(MuscleRegions.regions.keys), unmapped = Set(MuscleRegions.unmapped.keys)
        #expect(mapped.isDisjoint(with: unmapped))
        #expect(ids.subtracting(mapped).subtracting(unmapped).isEmpty, "new library muscles need a region or an unmapped reason: \(ids.subtracting(mapped).subtracting(unmapped).sorted())")
        // No stale rows for IDs the library no longer uses.
        #expect(mapped.union(unmapped).subtracting(ids).isEmpty)
        #expect(Set(MuscleRegions.approximate.keys).isSubset(of: mapped))
        for (id, regions) in MuscleRegions.regions {
            #expect(!regions.isEmpty, "\(id) maps to nothing; list it in unmapped instead")
            for region in regions { #expect(map.regionIDs.contains(region), "\(id) → \(region) is not drawn") }
        }
        #expect(MuscleRegions.unmapped.keys.sorted() == ["cardiovascular system"])
    }

    @Test func everyLibraryExerciseWithAMappableTargetLightsUp() throws {
        let library = try ExerciseLibrary.load()
        let map = try MuscleMapArtwork.load()
        for entry in library.exercises where MuscleRegions.regions[entry.target] != nil {
            let highlights = MuscleRegions.highlights(target: [entry.target], secondary: entry.secondaryMuscles)
            let lit = MuscleMapArtwork.Side.allCases.flatMap { map.fills($0, highlights: highlights) }.filter { $0.emphasis == .target }
            #expect(!lit.isEmpty, "\(entry.id) target \(entry.target) draws nothing")
        }
        let cardio = library.exercises.filter { MuscleRegions.unmapped[$0.target] != nil }
        #expect(cardio.allSatisfy { $0.bodyPart == "cardio" })
    }

    @Test func benchPressShowsChestStrongAndHelpersLighter() throws {
        let map = try MuscleMapArtwork.load()
        let library = try ExerciseLibrary.load()
        let press = try #require(library.entry(id: "edb-0025"))
        let highlights = MuscleRegions.highlights(target: [press.target], secondary: press.secondaryMuscles)
        #expect(highlights == ["chest": .target, "triceps": .secondary, "deltoids": .secondary])
        let front = Dictionary(map.fills(.front, highlights: highlights).map { ($0.region.id, $0.emphasis) }, uniquingKeysWith: { $1 })
        #expect(front["chest"] == .target)
        #expect(front["triceps"] == .secondary)
        #expect(front["abs"] == .some(nil))
        #expect(front["upper-chest"] == nil) // details stay hidden unless highlighted
    }

    @Test func detailsDrawOnlyWhenTheyAddToTheirParent() throws {
        let map = try MuscleMapArtwork.load()
        func detail(_ highlights: [String: MuscleEmphasis]) -> MuscleEmphasis?? {
            map.fills(.front, highlights: highlights).first { $0.region.id == "upper-chest" }.map(\.emphasis)
        }
        #expect(detail(["upper-chest": .target]) == .some(.target))
        #expect(detail(["upper-chest": .target, "chest": .secondary]) == .some(.target))
        #expect(detail(["upper-chest": .secondary, "chest": .target]) == nil)
        // A carved region takes its host's highlight so the back has no hole.
        let back = map.fills(.back, highlights: ["upper-back": .target])
        #expect(back.first { $0.region.id == "rotator-cuff" }?.emphasis == .target)
        // Cosmetic parts never light up.
        #expect(map.fills(.front, highlights: ["head": .target]).first { $0.region.id == "head" }?.emphasis == .some(nil))
    }

    @Test func targetWinsOverSecondary() {
        let highlights = MuscleRegions.highlights(target: ["glutes"], secondary: ["abductors", "hamstrings"])
        #expect(highlights == ["gluteal": .target, "hamstring": .secondary])
        #expect(MuscleRegions.highlights(target: ["cardiovascular system"], secondary: []).isEmpty)
    }
}

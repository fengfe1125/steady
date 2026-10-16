import Foundation
import Testing
@testable import SteadyCore

@MainActor struct WorkoutEngineTests {
    let day = Date(timeIntervalSince1970: 1792110000)
    func bench(perSide: Bool = false, loadBasis: LoadBasis = .total, metric: WorkoutMetric = .weightReps) -> WorkoutMove {
        var move = WorkoutMove(name: "杠铃卧推", metric: metric); move.identity = "library:edb-0025"
        move.perSide = perSide; move.loadBasis = loadBasis; move.target.sets = 1; move.target.incrementKG = 2.5
        return move
    }
    func set(_ weight: Double?, _ reps: Int, warmup: Bool = false, at offset: Double = 0, side: WorkoutSide = .both) -> SetLog {
        var value = SetLog(side: side); value.weightKG = weight; value.reps = reps; value.warmup = warmup
        value.completedAt = day.addingTimeInterval(offset); return value
    }
    func log(_ move: WorkoutMove, _ sets: [SetLog], daysAgo: Double, finished: Bool = true) throws -> WorkoutLog {
        let start = day.addingTimeInterval(-daysAgo * 86400)
        var value = try WorkoutLog(template: WorkoutTemplate(title: "训练", moves: [move]), now: start)
        value.exercises[0].sets = sets.map { var s = $0; s.completedAt = s.completedAt.map { _ in start.addingTimeInterval(60) }; return s }
        if finished { value.finish(at: start.addingTimeInterval(600)) }
        return value
    }
    func kinds(_ records: [PersonalRecord]?) -> Set<PersonalRecord.Kind> { Set((records ?? []).map(\.kind)) }

    // MARK: Estimated 1RM

    @Test func epleyAndBrzyckiMatchPublishedFormulas() throws {
        #expect(abs(try #require(OneRepMax.epley(weightKG: 100, reps: 5)) - 116.6667) < 0.001)
        #expect(OneRepMax.epley(weightKG: 100, reps: 1) == 100)
        #expect(abs(try #require(OneRepMax.brzycki(weightKG: 100, reps: 5)) - 112.5) < 0.0001)
        #expect(OneRepMax.brzycki(weightKG: 100, reps: 1) == 100)
        #expect(OneRepMax.brzycki(weightKG: 100, reps: 11) == nil)
        #expect(OneRepMax.epley(weightKG: 0, reps: 5) == nil)
        #expect(OneRepMax.epley(weightKG: 100, reps: 0) == nil)
        #expect(OneRepMax.epley(weightKG: .nan, reps: 5) == nil)
    }
    @Test func estimateUsesBrzyckiUpToTenRepsThenEpleyWithoutAJump() throws {
        #expect(OneRepMax.estimate(weightKG: 100, reps: 5) == OneRepMax.brzycki(weightKG: 100, reps: 5))
        #expect(OneRepMax.estimate(weightKG: 100, reps: 12) == OneRepMax.epley(weightKG: 100, reps: 12))
        let ten = try #require(OneRepMax.estimate(weightKG: 90, reps: 10))
        let epleyTen = try #require(OneRepMax.epley(weightKG: 90, reps: 10))
        #expect(abs(ten - epleyTen) < 0.0001)
        #expect(try #require(OneRepMax.estimate(weightKG: 90, reps: 11)) > ten)
        #expect(OneRepMax.estimate(weightKG: 100, reps: 20) != nil)
        #expect(OneRepMax.estimate(weightKG: 100, reps: 21) == nil)
    }
    @Test func estimateExcludesWarmupsAndUnfinishedSets() throws {
        #expect(OneRepMax.estimate(set(100, 5)) != nil)
        #expect(OneRepMax.estimate(set(100, 5, warmup: true)) == nil)
        var open = set(100, 5); open.completedAt = nil
        #expect(OneRepMax.estimate(open) == nil)
        let move = bench()
        let history = [try log(move, [set(140, 3, warmup: true), set(100, 5), set(100, 3)], daysAgo: 2)]
        #expect(OneRepMax.best(move: move, history: history) == OneRepMax.estimate(weightKG: 100, reps: 5))
    }
    @Test func bestEstimateMatchesTheSameIdentityMetricSideAndLoadBasis() throws {
        let total = bench(), perSideLoad = bench(loadBasis: .perSide)
        let history = [try log(total, [set(100, 5)], daysAgo: 3), try log(perSideLoad, [set(30, 10)], daysAgo: 2)]
        #expect(OneRepMax.best(move: total, history: history) == OneRepMax.estimate(weightKG: 100, reps: 5))
        #expect(OneRepMax.best(move: perSideLoad, history: history) == OneRepMax.estimate(weightKG: 30, reps: 10))
        var other = total; other.identity = "library:edb-0047"
        #expect(OneRepMax.best(move: other, history: history) == nil)
        #expect(OneRepMax.best(move: bench(metric: .reps), history: history) == nil)
    }

    // MARK: Personal records

    @Test func firstEverSetIsNotARecord() throws {
        let move = bench()
        let today = try log(move, [set(100, 5)], daysAgo: 0, finished: false)
        #expect(WorkoutRecords.records(in: today, history: []).isEmpty)
    }
    @Test func heavierSetBeatsWeightAndEstimateButNotRepsWithoutHeavierHistory() throws {
        let move = bench()
        let history = [try log(move, [set(100, 5), set(90, 10)], daysAgo: 7)]
        let today = try log(move, [set(102.5, 3)], daysAgo: 0, finished: false)
        let found = WorkoutRecords.records(in: today, history: history)[today.exercises[0].sets[0].id]
        #expect(kinds(found) == [.heaviestWeight])
        #expect(found?.first?.previous == 100)
        #expect(found?.first?.title == "最大重量 102.5 kg（此前 100 kg）")
        let fractional = try log(move, [set(101.25, 1)], daysAgo: 0, finished: false)
        #expect(WorkoutRecords.records(in: fractional, history: history)[fractional.exercises[0].sets[0].id]?.first?.title == "最大重量 101.25 kg（此前 100 kg）")
        let strong = try log(move, [set(102.5, 7)], daysAgo: 0, finished: false)
        #expect(kinds(WorkoutRecords.records(in: strong, history: history)[strong.exercises[0].sets[0].id]) == [.heaviestWeight, .bestEstimatedOneRM])
    }
    @Test func mostRepsCountsSetsAtThisWeightOrHeavier() throws {
        let move = bench()
        let history = [try log(move, [set(100, 8)], daysAgo: 7)]
        let more = try log(move, [set(100, 9)], daysAgo: 0, finished: false)
        let found = WorkoutRecords.records(in: more, history: history)[more.exercises[0].sets[0].id]
        #expect(kinds(found) == [.mostReps, .bestEstimatedOneRM])
        #expect(found?.first { $0.kind == .mostReps }?.weightKG == 100)
        let lighter = try log(move, [set(95, 9)], daysAgo: 0, finished: false)
        #expect(kinds(WorkoutRecords.records(in: lighter, history: history)[lighter.exercises[0].sets[0].id]) == [.mostReps])
        let dominated = try log(move, [set(95, 8)], daysAgo: 0, finished: false)
        #expect(WorkoutRecords.records(in: dominated, history: history).isEmpty)
    }
    @Test func tiesAreNotRecords() throws {
        let move = bench()
        let history = [try log(move, [set(100, 5)], daysAgo: 7)]
        let same = try log(move, [set(100, 5)], daysAgo: 0, finished: false)
        #expect(WorkoutRecords.records(in: same, history: history).isEmpty)
    }
    @Test func warmupsNeitherSetNorBlockRecords() throws {
        let move = bench()
        let history = [try log(move, [set(140, 2, warmup: true), set(100, 5)], daysAgo: 7)]
        let today = try log(move, [set(120, 5, warmup: true), set(105, 5)], daysAgo: 0, finished: false)
        let records = WorkoutRecords.records(in: today, history: history)
        #expect(records[today.exercises[0].sets[0].id] == nil)
        #expect(kinds(records[today.exercises[0].sets[1].id]) == [.heaviestWeight, .bestEstimatedOneRM])
    }
    @Test func recordsStayWithinTheSameSideAndLoadBasis() throws {
        let total = bench(), perSideLoad = bench(loadBasis: .perSide), unilateral = bench(perSide: true)
        let history = [try log(total, [set(100, 5)], daysAgo: 7), try log(perSideLoad, [set(30, 8)], daysAgo: 6),
                       try log(unilateral, [set(40, 8, side: .left), set(40, 8, side: .right)], daysAgo: 5)]
        let perSideToday = try log(perSideLoad, [set(32.5, 8)], daysAgo: 0, finished: false)
        #expect(kinds(WorkoutRecords.records(in: perSideToday, history: history)[perSideToday.exercises[0].sets[0].id]) == [.heaviestWeight, .bestEstimatedOneRM])
        let unilateralToday = try log(unilateral, [set(42.5, 8, side: .left), set(40, 8, side: .right)], daysAgo: 0, finished: false)
        let records = WorkoutRecords.records(in: unilateralToday, history: history)
        #expect(kinds(records[unilateralToday.exercises[0].sets[0].id]) == [.heaviestWeight, .bestEstimatedOneRM])
        #expect(records[unilateralToday.exercises[0].sets[1].id] == nil)
    }
    @Test func repeatingTheRecordLaterInTheSameWorkoutIsNotFlaggedAgain() throws {
        let move = bench()
        let history = [try log(move, [set(100, 5)], daysAgo: 7)]
        var today = try log(move, [], daysAgo: 0, finished: false)
        today.exercises[0].sets = [set(102.5, 5, at: 60), set(102.5, 5, at: 180), set(105, 3, at: 300)]
        let records = WorkoutRecords.records(in: today, history: history)
        #expect(kinds(records[today.exercises[0].sets[0].id]) == [.heaviestWeight, .bestEstimatedOneRM])
        #expect(records[today.exercises[0].sets[1].id] == nil)
        #expect(kinds(records[today.exercises[0].sets[2].id]) == [.heaviestWeight])
    }
    @Test func historyIgnoresLaterOngoingAndUnfinishedWork() throws {
        let move = bench()
        let later = try log(move, [set(150, 5)], daysAgo: -1)
        let otherOngoing = try log(move, [set(150, 5)], daysAgo: 1, finished: false)
        var unfinished = set(150, 5); unfinished.completedAt = nil
        let pastOpen = try log(move, [set(100, 5), unfinished], daysAgo: 7)
        let today = try log(move, [set(110, 5)], daysAgo: 0, finished: false)
        #expect(kinds(WorkoutRecords.records(in: today, history: [later, otherOngoing, pastOpen, today])[today.exercises[0].sets[0].id]) == [.heaviestWeight, .bestEstimatedOneRM])
    }
    @Test func repsOnlyMovesTrackMostRepsAndDurationTracksNothing() throws {
        let move = bench(metric: .reps)
        let history = [try log(move, [set(nil, 12)], daysAgo: 7)]
        let today = try log(move, [set(nil, 15)], daysAgo: 0, finished: false)
        let found = WorkoutRecords.records(in: today, history: history)[today.exercises[0].sets[0].id]
        #expect(kinds(found) == [.mostReps]); #expect(found?.first?.title == "最多次数 15 次（此前 12 次）")
        var hold = bench(metric: .duration); hold.identity = "library:edb-9999"
        var a = SetLog(); a.durationSeconds = 30; a.completedAt = day
        var b = SetLog(); b.durationSeconds = 60; b.completedAt = day
        #expect(WorkoutRecords.records(in: try log(hold, [b], daysAgo: 0, finished: false), history: [try log(hold, [a], daysAgo: 3)]).isEmpty)
    }

    // MARK: Warm-up ramp

    @Test func warmupRampRoundsToTheIncrement() {
        #expect(WarmupRamp.suggest(workingWeightKG: 100, incrementKG: 2.5) == [WarmupSet(weightKG: 40, reps: 8), WarmupSet(weightKG: 60, reps: 5), WarmupSet(weightKG: 80, reps: 3)])
        #expect(WarmupRamp.suggest(workingWeightKG: 47, incrementKG: 2.5).map(\.weightKG) == [20, 27.5, 37.5])
        #expect(WarmupRamp.suggest(workingWeightKG: 62.5, incrementKG: 5).map(\.weightKG) == [25, 40, 50])
        #expect(WarmupRamp.suggest(workingWeightKG: 33, incrementKG: 1.25).map(\.weightKG) == [13.75, 20, 26.25])
        #expect(WarmupRamp.round(18.8, toIncrement: 2.5) == 20)
        #expect(WarmupRamp.round(0.3 * 3, toIncrement: 0.1) == 0.9)
    }
    @Test func warmupRampRespectsTheBarAndDropsDuplicatesAndWorkingWeight() {
        #expect(WarmupRamp.suggest(workingWeightKG: 30, incrementKG: 2.5, minimumKG: 20) == [WarmupSet(weightKG: 20, reps: 8), WarmupSet(weightKG: 25, reps: 3)])
        #expect(WarmupRamp.suggest(workingWeightKG: 20, incrementKG: 2.5, minimumKG: 20).isEmpty)
        #expect(WarmupRamp.suggest(workingWeightKG: 5, incrementKG: 5).map(\.weightKG) == [])
        #expect(WarmupRamp.suggest(workingWeightKG: 0, incrementKG: 2.5).isEmpty)
        #expect(WarmupRamp.suggest(workingWeightKG: 100, incrementKG: 0).isEmpty)
    }

    // MARK: Plate math

    @Test func plateMathUsesTheFewestPlatesPerSide() throws {
        let standard = PlateInventory.standard
        #expect(standard.barKG == 20)
        #expect(standard.plates.map(\.weightKG) == [25, 20, 15, 10, 5, 2.5, 1.25])
        #expect(PlateMath.load(targetKG: 100, inventory: standard)?.perSide == [25, 15])
        #expect(PlateMath.load(targetKG: 60, inventory: standard)?.perSide == [20])
        #expect(PlateMath.load(targetKG: 142.5, inventory: standard)?.perSide == [25, 25, 10, 1.25])
        let bar = try #require(PlateMath.load(targetKG: 20, inventory: standard))
        #expect(bar.perSide.isEmpty); #expect(bar.shortfallKG == 0); #expect(bar.totalKG == 20)
        #expect(PlateMath.load(targetKG: 15, inventory: standard) == nil)
        #expect(PlateMath.load(targetKG: .infinity, inventory: standard) == nil)
    }
    @Test func plateMathReportsTheClosestLighterLoadWhenInexact() throws {
        let odd = try #require(PlateMath.load(targetKG: 101, inventory: .standard))
        #expect(odd.perSide == [25, 15]); #expect(odd.totalKG == 100); #expect(odd.shortfallKG == 1)
        let max = try #require(PlateMath.load(targetKG: 500, inventory: .standard))
        #expect(max.perSide == [25, 25, 25, 25, 20, 20, 15, 15, 10, 10, 5, 5, 2.5, 2.5, 1.25, 1.25])
        #expect(max.totalKG == 435); #expect(max.shortfallKG == 65)
    }
    @Test func plateMathHonoursOwnedPairsBeyondGreedy() throws {
        let inventory = PlateInventory(barKG: 20, plates: [.init(weightKG: 25, pairs: 1), .init(weightKG: 20, pairs: 2)])
        #expect(PlateMath.load(targetKG: 100, inventory: inventory)?.perSide == [20, 20])
        let noFives = PlateInventory(barKG: 15, plates: [20, 15, 10].map { .init(weightKG: $0, pairs: 1) })
        let load = try #require(PlateMath.load(targetKG: 65, inventory: noFives))
        #expect(load.perSide == [15, 10]); #expect(load.barKG == 15); #expect(load.totalKG == 65)
        let tie = PlateInventory(barKG: 20, plates: [20, 15, 10, 5].map { .init(weightKG: $0, pairs: 2) })
        #expect(PlateMath.load(targetKG: 70, inventory: tie)?.perSide == [20, 5])
        let empty = try #require(PlateMath.load(targetKG: 30, inventory: PlateInventory(barKG: 20, plates: [])))
        #expect(empty.perSide.isEmpty); #expect(empty.shortfallKG == 10)
    }
    @Test func plateInventoryRoundTripsAsLocalPreferenceData() throws {
        var inventory = PlateInventory.standard; inventory.barKG = 15; inventory.plates[0].pairs = 0
        let data = try JSONEncoder().encode(inventory)
        #expect(try JSONDecoder().decode(PlateInventory.self, from: data) == inventory)
    }
    @Test func onlyFreeBarbellMovesWithTotalLoadGetPlateMath() throws {
        let catalog = try ExerciseCatalog.load(version: 2), library = try #require(ExerciseLibrary.shared)
        #expect(PlateMath.loadsPlates(WorkoutMove(library: try #require(library.entry(id: "edb-0025"))), catalog: catalog, library: library))
        let curl = try #require(catalog.exercise(id: "arms-extra-standing-barbell-curl"))
        #expect(PlateMath.loadsPlates(WorkoutMove(catalog: curl, version: 2), catalog: catalog, library: library))
        let dumbbell = try #require(library.exercises.first { $0.equipment == "dumbbell" && $0.metric == .weightReps })
        #expect(!PlateMath.loadsPlates(WorkoutMove(library: dumbbell), catalog: catalog, library: library))
        let smith = try #require(library.exercises.first { $0.equipment == "smith machine" && $0.metric == .weightReps })
        #expect(!PlateMath.loadsPlates(WorkoutMove(library: smith), catalog: catalog, library: library))
        var perSideLoad = WorkoutMove(library: try #require(library.entry(id: "edb-0025"))); perSideLoad.loadBasis = .perSide
        #expect(!PlateMath.loadsPlates(perSideLoad, catalog: catalog, library: library))
        #expect(!PlateMath.loadsPlates(WorkoutMove(name: "杠铃卧推"), catalog: catalog, library: library))
    }

    // MARK: Sync schema guard

    /// supabase/functions/_shared/workout.ts parses these objects with .strict(); this batch must not add keys.
    @Test func workoutRecordsKeepTheStrictSyncShape() throws {
        var move = bench(); move.target.weightKG = 60; move.catalogID = "x"; move.catalogVersion = 2; move.prescription = "p"
        var value = try log(move, [set(60, 5)], daysAgo: 0)
        value.templateID = UUID(); value.planID = UUID(); value.sessionID = UUID(); value.effort = 5; value.restUntil = day
        value.exercises[0].sets[0].durationSeconds = 30
        let json = try #require(try JSONSerialization.jsonObject(with: JSONEncoder().encode(value)) as? [String: Any])
        let exercise = try #require((json["exercises"] as? [[String: Any]])?.first)
        let encodedMove = try #require(exercise["move"] as? [String: Any])
        #expect(Set(json.keys).isSubset(of: ["metadata", "title", "templateID", "planID", "sessionID", "startedAt", "endedAt", "status", "runningSince", "elapsedSeconds", "restUntil", "effort", "note", "exercises"]))
        #expect(Set(exercise.keys) == ["id", "move", "sets"])
        #expect(Set(encodedMove.keys).isSubset(of: ["id", "identity", "name", "catalogID", "catalogVersion", "teaching", "metric", "perSide", "loadBasis", "target", "prescription"]))
        #expect(Set(try #require(encodedMove["target"] as? [String: Any]).keys) == ["sets", "minReps", "maxReps", "durationSeconds", "restSeconds", "weightKG", "incrementKG"])
        #expect(Set(try #require((exercise["sets"] as? [[String: Any]])?.first).keys) == ["id", "side", "warmup", "weightKG", "reps", "durationSeconds", "completedAt"])
    }
}

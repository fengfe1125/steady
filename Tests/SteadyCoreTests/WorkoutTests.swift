import Foundation
import Testing
@testable import SteadyCore

@MainActor struct WorkoutTests {
    func template(perSide: Bool = false) -> WorkoutTemplate {
        var move = WorkoutMove(name: "测试推举"); move.target.sets = 2; move.perSide = perSide
        move.target.incrementKG = 2.5
        var template = WorkoutTemplate(title: "测试训练", moves: [move])
        template.metadata.createdAt = Date(timeIntervalSince1970: 1792110000); template.metadata.updatedAt = template.metadata.createdAt
        return template
    }
    func completed(_ template: WorkoutTemplate) throws -> WorkoutLog {
        let now = Date(timeIntervalSince1970: 1792110000)
        var log = try WorkoutLog(template: template, now: now)
        log.metadata.createdAt = now; log.metadata.updatedAt = now
        for i in log.exercises[0].sets.indices { log.exercises[0].sets[i].weightKG = 10; log.exercises[0].sets[i].reps = 12; log.exercises[0].sets[i].completedAt = now.addingTimeInterval(60) }
        log.finish(at: now.addingTimeInterval(120)); return log
    }
    @Test func bodyweightSupportsNeverRequireLoadAndLearningOnlyStaysSeparate() throws {
        let catalog = try ExerciseCatalog.load(version: 2)
        let wall = try #require(catalog.exercise(id: "wall-push-up"))
        #expect(WorkoutMove(catalog: wall, version: 2).metric == .reps)
        #expect(catalog.exercises.filter { $0.status == "approved" }.count == 39)
    }
    @Test func diskReopenPreservesLogTemplateAndNextPerformance() throws {
        let dir = FileManager.default.temporaryDirectory.appending(path: "Workout-\(UUID())")
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: dir) }
        let url = dir.appending(path: "records.store"), t = template()
        let finished = try completed(t)
        do { let store = try DeviceRepository(url: url); try store.saveWorkoutTemplate(t); try store.saveWorkoutLog(finished) }
        let reopened = try DeviceRepository(url: url)
        #expect(try reopened.workoutTemplates() == [t]); #expect(try reopened.workoutLogs() == [finished])
        let previous = WorkoutProgression.previous(move: t.moves[0], history: try reopened.workoutLogs())
        #expect(previous?.sets[0].weightKG == 10)
        #expect(WorkoutProgression.suggestion(move: t.moves[0], history: [finished])?.weightKG == 12.5)
    }
    @Test func pauseResumeRestAndEarlyFinishUseWallClock() throws {
        let start = Date(timeIntervalSince1970: 1000)
        var log = try WorkoutLog(template: template(), now: start)
        log.restUntil = start.addingTimeInterval(90)
        #expect(log.remainingRest(at: start.addingTimeInterval(60)) == 30)
        #expect(log.remainingRest(at: start.addingTimeInterval(100)) == 0)
        log.pause(at: start.addingTimeInterval(60)); log.pause(at: start.addingTimeInterval(100))
        #expect(log.elapsed(at: start.addingTimeInterval(300)) == 60); #expect(log.restUntil == nil)
        log.resume(at: start.addingTimeInterval(300)); log.finish(at: start.addingTimeInterval(330))
        log.finish(at: start.addingTimeInterval(500))
        #expect(log.elapsedSeconds == 90); #expect(log.status == .partial)
        try log.validate()
    }
    @Test func ongoingIsUniqueAndDeletionAllowsNewSession() throws {
        let store = try DeviceRepository(inMemory: true), t = template()
        var a = try WorkoutLog(template: t); try store.saveWorkoutLog(a); try store.saveWorkoutLog(a)
        #expect(try store.workoutLogs().count == 1)
        #expect(throws: ServiceError.self) { try store.saveWorkoutLog(WorkoutLog(template: t)) }
        a.pause(); try store.saveWorkoutLog(a)
        #expect(throws: ServiceError.self) { try store.saveWorkoutLog(WorkoutLog(template: t)) }
        try store.deleteWorkout(id: a.id, template: false); try store.saveWorkoutLog(WorkoutLog(template: t))
        #expect(try store.workoutLogs().count == 1)
    }
    @Test func concurrentOfflineSessionsStayVisibleAndCanBeResolved() throws {
        let store = try DeviceRepository(inMemory: true), t = template()
        var local = try WorkoutLog(template: t); try store.saveWorkoutLog(local)
        let remote = try WorkoutLog(template: t)
        try store.accept(CloudRecord(id: remote.id, kind: .workoutLogs, logicalID: remote.id.uuidString,
            payload: String(decoding: try WireCodec.encoder().encode(remote), as: UTF8.self), version: 1))
        #expect(try store.workoutLogs().filter(\.isOngoing).count == 2)
        #expect(throws: ServiceError.self) { try store.saveWorkoutLog(WorkoutLog(template: t)) }
        local.pause(); try store.saveWorkoutLog(local)
        local.finish(); try store.saveWorkoutLog(local)
        #expect(try store.workoutLogs().filter(\.isOngoing).count == 1)
    }
    @Test func invalidSetCannotBeAcknowledgedOrPersisted() throws {
        let store = try DeviceRepository(inMemory: true)
        var log = try WorkoutLog(template: template()); try store.saveWorkoutLog(log)
        log.exercises[0].sets[0].completedAt = Date()
        #expect(throws: ServiceError.self) { try store.saveWorkoutLog(log) }
        #expect(try store.workoutLogs()[0].completedSets == 0)
        log.exercises[0].sets[0].reps = 12; log.exercises[0].sets[0].weightKG = .nan
        #expect(throws: ServiceError.self) { try store.saveWorkoutLog(log) }
    }
    @Test func progressionRequiresFullWorkAndMatchingMeasurement() throws {
        let t = template(); var log = try completed(t)
        log.exercises[0].sets[0].reps = 10
        #expect(WorkoutProgression.suggestion(move: t.moves[0], history: [log]) == nil)
        log = try completed(t); log.status = .partial
        #expect(WorkoutProgression.suggestion(move: t.moves[0], history: [log]) == nil)
        log = try completed(t); var move = t.moves[0]; move.target.incrementKG = nil
        #expect(WorkoutProgression.suggestion(move: move, history: [log]) == nil)
        move = t.moves[0]; move.loadBasis = .perSide
        #expect(WorkoutProgression.previous(move: move, history: [log]) == nil)
        move = t.moves[0]; move.target.sets = 3
        #expect(WorkoutProgression.suggestion(move: move, history: [log]) == nil)
        log = try completed(t); var warmup = SetLog(); warmup.warmup = true; warmup.reps = 2; warmup.weightKG = 1; warmup.completedAt = Date()
        log.exercises[0].sets.append(warmup)
        #expect(WorkoutProgression.suggestion(move: t.moves[0], history: [log])?.weightKG == 12.5)
    }
    @Test func unilateralWorkRequiresBothSidesAndCannotCompareTotalLoad() throws {
        let t = template(perSide: true); var log = try completed(t)
        #expect(log.exercises[0].sets.count == 4); try log.validate()
        log.exercises[0].sets[0].completedAt = nil
        #expect(!log.exercises[0].allWorkCompleted)
        #expect(throws: ServiceError.self) { try log.validate() }
    }
    @Test func historyEditsAndDeleteRecomputeSuggestion() throws {
        let store = try DeviceRepository(inMemory: true), t = template()
        var log = try completed(t); try store.saveWorkoutLog(log)
        #expect(WorkoutProgression.suggestion(move: t.moves[0], history: try store.workoutLogs()) != nil)
        log.exercises[0].sets[0].reps = 8; try store.saveWorkoutLog(log)
        #expect(WorkoutProgression.suggestion(move: t.moves[0], history: try store.workoutLogs()) == nil)
        try store.deleteWorkout(id: log.id, template: false)
        #expect(WorkoutProgression.previous(move: t.moves[0], history: try store.workoutLogs()) == nil)
    }
    @Test func accountIsolationConflictAndTombstone() throws {
        let store = try DeviceRepository(inMemory: true), user = UUID(), other = UUID()
        store.select(userID: user)
        var log = try completed(template()); try store.saveWorkoutLog(log)
        let mutation = try #require(store.pending().first)
        var remote = mutation.record; remote.version = 1
        try store.accept(remote, mutationID: mutation.id)
        log.note = "本机修改"; try store.saveWorkoutLog(log)
        remote.version = 2; try store.accept(remote)
        #expect(try store.conflicts().count == 1); #expect(try store.workoutLogs()[0].note == "本机修改")
        try store.resolve(id: log.id, useLocal: true)
        #expect(try store.pending().first?.record.version == 2)
        store.select(userID: other); #expect(try store.workoutLogs().isEmpty)
        store.select(userID: user); try store.deleteWorkout(id: log.id, template: false)
        #expect(try store.pending().first?.record.deleted == true)
        #expect(try store.workoutLogs().isEmpty)
    }
    @Test func snapshotsSurviveTemplateChangesAndLegacySessionIsNotFabricated() throws {
        var t = template(); let log = try completed(t); t.moves[0].name = "改名"
        #expect(log.exercises[0].move.name == "测试推举")
        let session = WorkoutSession(title: "旧计划", scheduledAt: Date(), minutes: 20, exercises: [Exercise(name: "旧动作", prescription: "自由练习")])
        let snapshot = WorkoutTemplate(session: session)
        #expect(snapshot.moves[0].prescription == "自由练习"); #expect(snapshot.moves[0].teaching == nil)
        let newLog = try WorkoutLog(template: snapshot)
        #expect(newLog.completedSets == 0)
    }
}

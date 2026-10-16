import Foundation
import Testing
import SteadyCore
@testable import SteadyAppState

@MainActor struct WorkoutStateTests {
    final class FailingStore: WorkoutRepository {
        func workoutTemplates() throws -> [WorkoutTemplate] { [] }
        func workoutLogs() throws -> [WorkoutLog] { [] }
        func saveWorkoutTemplate(_ value: WorkoutTemplate) throws { throw ServiceError.simulatedFailure }
        func saveWorkoutLog(_ value: WorkoutLog) throws { throw ServiceError.simulatedFailure }
        func deleteWorkout(id: UUID, template: Bool) throws { throw ServiceError.simulatedFailure }
    }
    @Test func saveFailureNeverClaimsStartedOrSaved() throws {
        let model = try AppModel(planStore: LocalPlanRepository(inMemory: true), journalStore: LocalJournalRepository(inMemory: true), workoutStore: FailingStore())
        let t = WorkoutTemplate(title: "训练", moves: [WorkoutMove(name: "推举")])
        #expect(!model.saveWorkoutTemplate(t)); #expect(model.workoutTemplates.isEmpty)
        #expect(model.startWorkout(t) == nil); #expect(model.ongoingWorkout == nil); #expect(model.error != nil)
    }
    @Test func doubleStartAndAccountSwitchKeepLogsIsolated() throws {
        let store = try DeviceRepository(inMemory: true)
        let model = try AppModel(planStore: store, journalStore: store, liveStore: store)
        let t = WorkoutTemplate(title: "训练", moves: [WorkoutMove(name: "推举")])
        let first = try #require(model.startWorkout(t))
        #expect(model.startWorkout(t) == nil); #expect(model.workoutLogs.count == 1)
        try model.activate(.signedIn(userID: UUID())); #expect(model.workoutLogs.isEmpty)
        try model.activate(.signedOut); #expect(model.ongoingWorkout?.id == first)
    }
}

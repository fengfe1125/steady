import Foundation
import SteadyCore

extension AppModel {
    func reloadWorkouts() throws {
        let templates = try workoutStore.workoutTemplates(), logs = try workoutStore.workoutLogs()
        workoutTemplates = templates; workoutLogs = logs
    }
    @discardableResult func saveWorkoutTemplate(_ input: WorkoutTemplate) -> Bool {
        do {
            var value = input; value.metadata.updatedAt = Date()
            try workoutStore.saveWorkoutTemplate(value); try reloadWorkouts(); scheduleSync(); return true
        } catch { self.error = error.localizedDescription; return false }
    }
    @discardableResult func saveWorkout(_ input: WorkoutLog, creating: Bool = false) -> Bool {
        do {
            guard creating || workoutLogs.contains(where: { $0.id == input.id }) else { throw ServiceError.invalidInput("账户或训练记录已变化，请返回重新打开。") }
            var value = input; value.metadata.updatedAt = Date()
            try workoutStore.saveWorkoutLog(value); try reloadWorkouts(); scheduleSync(); return true
        } catch { self.error = error.localizedDescription; return false }
    }
    func startWorkout(_ template: WorkoutTemplate, planID: UUID? = nil, sessionID: UUID? = nil) -> UUID? {
        guard ongoingWorkout == nil else { error = "请先继续或结束当前训练。"; return nil }
        do {
            var log = try WorkoutLog(template: template); log.planID = planID; log.sessionID = sessionID
            return saveWorkout(log, creating: true) ? log.id : nil
        } catch { self.error = error.localizedDescription; return nil }
    }
    @discardableResult func deleteWorkout(id: UUID, template: Bool = false) -> Bool {
        do { try workoutStore.deleteWorkout(id: id, template: template); try reloadWorkouts(); scheduleSync(); return true }
        catch { self.error = error.localizedDescription; return false }
    }
}

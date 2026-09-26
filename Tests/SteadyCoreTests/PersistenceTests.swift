import Foundation
import Testing
@testable import SteadyCore

@MainActor struct PersistenceTests {
    @Test func savesEditsAndFeedbackAcrossRepositoryReopen() async throws {
        let directory = FileManager.default.temporaryDirectory.appending(path: "SteadyTests-\(UUID())")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: false)
        defer { try? FileManager.default.removeItem(at: directory) }
        let url = directory.appending(path: "plans.store")
        let coach = DemoCoachService(delay: .milliseconds(1))
        var plan = try await coach.planDraft(preferences: UserPreferences(), scenario: .normal)
        try plan.confirm()
        var workout = plan.sessions[0]
        workout.feedback = try WorkoutFeedback(completed: true, perceivedEffort: 5, note: "持久化测试备注")
        workout.exercises[0].name = "室内步行"
        try plan.updateSession(workout)
        do {
            let repository = try LocalPlanRepository(url: url)
            try repository.save(plan)
            try repository.save(plan) // Upsert must not duplicate.
            #expect(try repository.plans().count == 1)
        }
        let reopened = try LocalPlanRepository(url: url)
        #expect(try reopened.plans() == [plan])
        try reopened.delete(id: plan.id)
        #expect(try reopened.plans().isEmpty)
    }
}

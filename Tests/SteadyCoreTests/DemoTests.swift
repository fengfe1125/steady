import Foundation
import Testing
@testable import SteadyCore

struct DemoTests {
    let coach = DemoCoachService(delay: .milliseconds(1))

    @Test func fixedThirtyDaysAndStableIDs() {
        let a = DemoData.summaries()
        #expect(a.count == 30)
        #expect(a.first?.dayKey == "2026-08-23")
        #expect(a.last?.dayKey == "2026-09-21")
        #expect(a == DemoData.summaries())
        #expect(Set(a.map(\.id)).count == 30)
    }

    @Test func missingIsNotZero() async throws {
        let data = DemoData.summaries(missing: true)
        let day = try #require(data.last)
        #expect(day.sleepMinutes == nil)
        #expect(day.steps == nil)
        let report = try await coach.report(for: day, history: data, scenario: .missing)
        #expect(report.sections.count == 4)
        #expect(report.sections[0].evidence.isEmpty)
        #expect(report.sections[2].body.contains("缺少"))
    }

    @Test func offlineStillReadsHistory() async throws {
        let records = try await DemoHealthDataService().summaries(scenario: .offline)
        #expect(records.count == 30)
        await #expect(throws: ServiceError.offline) {
            try await coach.report(for: records[29], history: records, scenario: .offline)
        }
    }

    @Test func requestFailureIsExplicit() async {
        await #expect(throws: ServiceError.simulatedFailure) {
            try await coach.planDraft(preferences: UserPreferences(), scenario: .failure)
        }
    }

    @Test func cancelledReportDoesNotSucceed() async {
        let task = Task {
            try await DemoCoachService(delay: .seconds(5)).report(
                for: DemoData.summaries()[29], history: DemoData.summaries(), scenario: .normal)
        }
        task.cancel()
        await #expect(throws: CancellationError.self) { try await task.value }
    }

    @Test func streamedAnswerHasEvidenceAndCompletion() async throws {
        var text = ""
        var refs: [EvidenceReference] = []
        var complete = false
        for try await event in coach.answer(question: "今天怎么运动？", summary: DemoData.summaries()[29], scenario: .normal) {
            switch event {
            case .delta(let part): text += part
            case .evidence(let evidence): refs = evidence
            case .complete: complete = true
            }
        }
        #expect(text.contains("演示回复"))
        #expect(refs.count == 2)
        #expect(complete)
    }

    @Test func draftRequiresConfirmationAndEditsRoundTrip() async throws {
        var plan = try await coach.planDraft(preferences: UserPreferences(), scenario: .normal)
        #expect(plan.status == .draft)
        var workout = plan.sessions[0]
        workout.exercises[1].name = "坐站练习"
        workout.scheduledAt = DemoData.today.addingTimeInterval(86_400)
        workout.feedback = try WorkoutFeedback(completed: true, perceivedEffort: 4, note: "今天感觉轻松")
        try plan.updateSession(workout)
        try plan.confirm()
        let data = try JSONEncoder().encode(plan)
        let restored = try JSONDecoder().decode(TrainingPlan.self, from: data)
        #expect(restored == plan)
        #expect(restored.status == .confirmed)
        #expect(restored.sessions[0].feedback?.note == "今天感觉轻松")
    }

    @Test func consentSwitchesAreIndependent() {
        var preferences = UserPreferences()
        preferences.healthRead = true
        #expect(!preferences.cloudSync)
        #expect(!preferences.aiProcessing)
    }

    @Test func restrictionsAreNotSilentlyIgnored() async {
        var preferences = UserPreferences()
        preferences.limitations = "膝盖不适"
        await #expect(throws: ServiceError.self) {
            try await coach.planDraft(preferences: preferences, scenario: .normal)
        }
    }
}

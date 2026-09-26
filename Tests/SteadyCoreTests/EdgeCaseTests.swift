import Foundation
import Testing
@testable import SteadyCore

@Test func streamCanBeCancelledAfterFirstToken() async throws {
    let (started, checkpoint) = AsyncStream<Void>.makeStream()
    let task = Task {
        do {
            for try await event in DemoCoachService(delay: .milliseconds(10)).answer(
                question: "今天怎样", summary: DemoData.summaries().last, scenario: .normal) {
                if case .delta = event { checkpoint.yield(()) }
                try Task.checkCancellation()
            }
            // AsyncThrowingStream may end with nil when its consumer is cancelled.
            try Task.checkCancellation()
            return false
        } catch is CancellationError { return true }
        catch { return false }
    }
    for await _ in started { break }
    task.cancel()
    #expect(await task.value)
    checkpoint.finish()
}

@Test func entirelyMissingSummaryHasNoFabricatedEvidence() async throws {
    var summary = DemoData.summaries().last!
    summary.weightKG = nil; summary.sleepMinutes = nil; summary.steps = nil; summary.activeMinutes = nil
    let report = try await DemoCoachService(delay: .zero).report(for: summary, history: [summary], scenario: .missing)
    #expect(report.sections[0].evidence.isEmpty)
    #expect(report.sections[0].body.contains("暂无"))
    #expect(report.sections[1].body.contains("不能判断趋势"))
}

@Test func invalidFeedbackAndEmptyPlanAreRejected() {
    #expect(throws: ServiceError.self) { try WorkoutFeedback(completed: true, perceivedEffort: 0, note: "") }
    var plan = TrainingPlan(title: "空草案", sessions: [])
    #expect(throws: ServiceError.self) { try plan.confirm() }
    #expect(plan.status == .draft)
}

import Foundation
import Testing
@testable import SteadyCore

@Test @MainActor func journalSurvivesReopen() async throws {
    let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: dir) }
    let url = dir.appendingPathComponent("journal.store")
    var state = JournalState()
    state.preferences.onboardingComplete = true
    state.preferences.healthRead = true
    state.notes["2026-09-21"] = "今天精神不错"
    state.conversations = [Conversation(title: "日记", messages: [ChatMessage(role: .user, content: "今天怎么样")])]
    state.reports = [try await DemoCoachService(delay: .zero).report(for: DemoData.summaries().last!, history: DemoData.summaries(), scenario: .normal)]
    state.seeded = true
    do { let store = try LocalJournalRepository(url: url); try store.save(state) }
    let reopened = try LocalJournalRepository(url: url)
    let loaded = try reopened.load()
    #expect(loaded.notes == state.notes)
    #expect(loaded.preferences == state.preferences)
    #expect(loaded.conversations == state.conversations)
    #expect(loaded.reports == state.reports)
    #expect(!loaded.preferences.cloudSync && !loaded.preferences.aiProcessing)
}

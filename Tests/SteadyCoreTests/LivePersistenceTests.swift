import Foundation
import Testing
@testable import SteadyCore

@Test @MainActor func liveRecordsAndOutboxSurviveReopenAndStayAccountScoped() throws {
    let url = FileManager.default.temporaryDirectory.appending(path: UUID().uuidString + ".store")
    let user = UUID()
    do {
        let store = try DeviceRepository(url: url); store.select(userID: user)
        var journal = JournalState(); journal.notes["2026-09-23"] = "离线修改"; journal.preferences.cloudSync = true
        try store.save(journal)
        #expect(try store.pending().contains { $0.record.kind == .notes })
    }
    let reopened = try DeviceRepository(url: url); reopened.select(userID: user)
    #expect(try reopened.load().notes["2026-09-23"] == "离线修改")
    #expect(try reopened.load().preferences.cloudSync)
    reopened.select(userID: UUID())
    #expect(try reopened.load().notes.isEmpty)
    #expect(try reopened.pending().isEmpty)
    #expect(try !reopened.load().preferences.cloudSync)
}

@Test @MainActor func inFlightAcknowledgementKeepsNewerLocalEdit() throws {
    let store = try DeviceRepository(inMemory: true); store.select(userID: UUID())
    var journal = JournalState(); journal.notes["2026-09-23"] = "first"; try store.save(journal)
    let first = try #require(store.pending().first { $0.record.kind == .notes })
    journal.notes["2026-09-23"] = "second"; try store.save(journal)
    var accepted = first.record; accepted.version = 1
    try store.accept(accepted, mutationID: first.id)
    let second = try #require(store.pending().first { $0.record.kind == .notes })
    #expect(second.id != first.id)
    #expect(second.record.version == 1)
    #expect(try store.load().notes["2026-09-23"] == "second")
}

@Test @MainActor func remoteConflictAndDeletionDoNotSilentlyOverwrite() throws {
    let store = try DeviceRepository(inMemory: true); store.select(userID: UUID())
    var journal = JournalState(); journal.notes["2026-09-23"] = "local"; try store.save(journal)
    let pending = try #require(store.pending().first { $0.record.kind == .notes })
    var deleted = pending.record; deleted.version = 2; deleted.deleted = true; deleted.payload = "{}"
    try store.accept(deleted)
    #expect(try store.conflicts().count == 1)
    #expect(try store.load().notes["2026-09-23"] == "local")
    try store.resolve(id: pending.record.id, useLocal: true)
    #expect(try store.load().notes["2026-09-23"] == "local")
    #expect(try store.pending().contains { $0.record.kind == .notes && $0.record.id != pending.record.id && $0.record.version == 0 })
    #expect(try !store.pending().contains { $0.record.id == pending.record.id })
}

@Test @MainActor func consentRevisionAndGuestImportAreExplicit() throws {
    let store = try DeviceRepository(inMemory: true)
    var guest = JournalState(); guest.notes["2026-09-23"] = "guest"; try store.save(guest)
    store.select(userID: UUID()); #expect(try store.load().notes.isEmpty)
    try store.importGuest(); #expect(try store.load().notes.count == 1)
    let before = try store.consent()
    var journal = try store.load(); journal.preferences.aiProcessing = true; try store.save(journal)
    let after = try store.consent()
    #expect(after.revision == before.revision + 1)
    #expect(!after.cloudSync && !after.healthRead)
}

@Test func sleepMergesSourcesButDoesNotCountAwakeIntervals() {
    var calendar = Calendar(identifier: .gregorian); calendar.timeZone = TimeZone(secondsFromGMT: 0)!
    let day = Date(timeIntervalSince1970: 0)
    let samples = [SleepInterval(start: day.addingTimeInterval(23 * 3600), end: day.addingTimeInterval(26 * 3600)),
                   SleepInterval(start: day.addingTimeInterval(24 * 3600), end: day.addingTimeInterval(26 * 3600)),
                   SleepInterval(start: day.addingTimeInterval(26.5 * 3600), end: day.addingTimeInterval(31 * 3600))]
    #expect(HealthAggregation.sleepMinutes(samples, calendar: calendar) == ["1970-01-02": 450])
    #expect(HealthAggregation.sleepMinutes([], calendar: calendar).isEmpty)
}

@Test @MainActor func cloudJSONWhitespaceDoesNotRequeueUnchangedRecords() throws {
    let store = try DeviceRepository(inMemory: true); store.select(userID: UUID())
    var journal = JournalState(); journal.notes["2026-09-23"] = "same"; try store.save(journal)
    for pending in try store.pending() {
        var remote = pending.record; remote.version = 1
        let json = try JSONSerialization.jsonObject(with: Data(remote.payload.utf8))
        remote.payload = String(decoding: try JSONSerialization.data(withJSONObject: json, options: [.prettyPrinted]), as: UTF8.self)
        try store.accept(remote, mutationID: pending.id)
    }
    try store.save(store.load())
    #expect(try store.pending().isEmpty)
}

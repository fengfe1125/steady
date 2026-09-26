import Foundation
import SwiftData

public enum RecordKind: String, Codable, CaseIterable, Sendable {
    case profiles, summaries, reports, conversations, messages, plans, sessions, notes
    public var order: Int { Self.allCases.firstIndex(of: self)! }
}
public struct CloudRecord: Codable, Sendable {
    public var id: UUID
    public var kind: RecordKind
    public var logicalID: String
    public var parentID: UUID?
    public var payload: String
    public var version: Int
    public var deleted: Bool
    public init(id: UUID, kind: RecordKind, logicalID: String, parentID: UUID? = nil, payload: String, version: Int = 0, deleted: Bool = false) {
        self.id = id; self.kind = kind; self.logicalID = logicalID; self.parentID = parentID
        self.payload = payload; self.version = version; self.deleted = deleted
    }
}
public struct PendingMutation: Codable, Sendable, Identifiable {
    public var id: UUID
    public var record: CloudRecord
    public var attempt: Int
    public var retryAt: Date
}
public struct RecordConflict: Identifiable, Sendable {
    public var id: UUID
    public var kind: RecordKind
    public var local: String
    public var remote: CloudRecord
}

@Model final class DeviceRecord {
    @Attribute(.unique) var key: String
    var partition: String
    var recordData: Data
    var pendingData: Data?
    var conflictData: Data?
    init(key: String, partition: String, recordData: Data) { self.key = key; self.partition = partition; self.recordData = recordData }
}
@Model final class DeviceState {
    @Attribute(.unique) var partition: String
    var cursor: Int = 0
    var lastSync: Date?
    var healthRead: Bool = false
    var cloudSync: Bool = false
    var aiProcessing: Bool = false
    var onboarded: Bool = false
    var deviceID: UUID = UUID()
    var consentRevision: Int = 1
    var healthCache: Data?
    init(partition: String) { self.partition = partition }
}

/// All live records and outbox envelopes share a single explicit transaction boundary.
@MainActor public final class DeviceRepository: PlanRepository, JournalRepository {
    private let container: ModelContainer
    private let context: ModelContext
    public private(set) var partition = "guest"
    public private(set) var epoch = 0
    public init(url: URL? = nil, inMemory: Bool = false) throws {
        let schema = Schema([DeviceRecord.self, DeviceState.self])
        let config: ModelConfiguration
        if let url { config = ModelConfiguration("SteadyLiveV1", schema: schema, url: url, cloudKitDatabase: .none) }
        else { config = ModelConfiguration("SteadyLiveV1", schema: schema, isStoredInMemoryOnly: inMemory, cloudKitDatabase: .none) }
        container = try ModelContainer(for: schema, configurations: [config]); context = ModelContext(container); context.autosaveEnabled = false
    }
    public func select(userID: UUID?) { partition = userID?.uuidString.lowercased() ?? "guest"; epoch += 1 }
    private func state() throws -> DeviceState {
        let scope = partition
        if let existing = try context.fetch(FetchDescriptor<DeviceState>(predicate: #Predicate { $0.partition == scope })).first { return existing }
        let new = DeviceState(partition: scope); context.insert(new); return new
    }
    private func rows(in scope: String? = nil) throws -> [DeviceRecord] {
        let scope = scope ?? partition
        return try context.fetch(FetchDescriptor<DeviceRecord>(predicate: #Predicate { $0.partition == scope }))
    }
    private func decoded(_ row: DeviceRecord) throws -> CloudRecord { try WireCodec.decoder().decode(CloudRecord.self, from: row.recordData) }
    private func transaction(_ body: () throws -> Void) throws {
        do { try body(); try context.save() } catch { context.rollback(); throw error }
    }
    private func put<T: Encodable>(_ value: T, kind: RecordKind, logicalID: String, id: UUID, parentID: UUID? = nil, deleted: Bool = false, enqueue: Bool = true) throws {
        let old = try rows().first {
            guard let record = try? decoded($0) else { return false }
            return record.kind == kind && record.logicalID == logicalID && !record.deleted
        }
        let previous = try old.map(decoded)
        let key = "\(partition)|\(kind.rawValue)|\(logicalID)|\((previous?.id ?? id).uuidString)"
        var object = try JSONSerialization.jsonObject(with: WireCodec.encoder().encode(value)) as? [String: Any] ?? [:]
        if var metadata = object["metadata"] as? [String: Any] { metadata["id"] = (previous?.id ?? id).uuidString; object["metadata"] = metadata }
        let payload = deleted ? "{}" : String(decoding: try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys]), as: UTF8.self)
        if let previous, previous.deleted == deleted,
           let oldObject = try? JSONSerialization.jsonObject(with: Data(previous.payload.utf8)) as? NSDictionary,
           let newObject = try? JSONSerialization.jsonObject(with: Data(payload.utf8)) as? NSDictionary,
           oldObject == newObject { return }
        let record = CloudRecord(id: previous?.id ?? id, kind: kind, logicalID: logicalID, parentID: parentID, payload: payload, version: previous?.version ?? 0, deleted: deleted)
        let data = try WireCodec.encoder().encode(record)
        let row = old ?? DeviceRecord(key: key, partition: partition, recordData: data)
        if old == nil { context.insert(row) }
        row.recordData = data
        row.pendingData = enqueue ? try WireCodec.encoder().encode(PendingMutation(id: UUID(), record: record, attempt: 0, retryAt: .distantPast)) : nil
    }
    private func values<T: Decodable>(_ type: T.Type, kind: RecordKind) throws -> [T] {
        try rows().map(decoded).filter { $0.kind == kind && !$0.deleted }.map { try WireCodec.decoder().decode(T.self, from: Data($0.payload.utf8)) }
    }
    public func load() throws -> JournalState {
        var journal = JournalState()
        journal.preferences = try values(UserPreferences.self, kind: .profiles).first ?? UserPreferences()
        let state = try state()
        journal.preferences.healthRead = state.healthRead; journal.preferences.cloudSync = state.cloudSync
        journal.preferences.aiProcessing = state.aiProcessing; journal.preferences.onboardingComplete = state.onboarded
        journal.reports = try values(HealthReport.self, kind: .reports).sorted { $0.metadata.createdAt > $1.metadata.createdAt }
        let records = try rows().map(decoded).filter { !$0.deleted }
        journal.conversations = try values(Conversation.self, kind: .conversations).map { chat in
            var chat = chat
            chat.messages = try records.filter { $0.kind == .messages && $0.parentID == chat.id }.map { try WireCodec.decoder().decode(ChatMessage.self, from: Data($0.payload.utf8)) }.sorted { $0.metadata.createdAt < $1.metadata.createdAt }
            return chat
        }.sorted { $0.metadata.createdAt > $1.metadata.createdAt }
        for note in try values(DailyNote.self, kind: .notes) { journal.notes[note.dayKey] = note.text }
        journal.seeded = true
        return journal
    }
    public func save(_ journal: JournalState) throws {
        try transaction {
            let state = try state()
            if state.healthRead != journal.preferences.healthRead || state.cloudSync != journal.preferences.cloudSync || state.aiProcessing != journal.preferences.aiProcessing { state.consentRevision += 1 }
            state.healthRead = journal.preferences.healthRead; state.cloudSync = journal.preferences.cloudSync
            state.aiProcessing = journal.preferences.aiProcessing; state.onboarded = journal.preferences.onboardingComplete
            var prefs = journal.preferences
            prefs.healthRead = false; prefs.cloudSync = false; prefs.aiProcessing = false; prefs.onboardingComplete = false
            prefs.metadata.source = .manual
            try put(prefs, kind: .profiles, logicalID: "profile", id: prefs.metadata.id)
            for report in journal.reports { try put(report, kind: .reports, logicalID: report.id.uuidString, id: report.id) }
            for chat in journal.conversations {
                var header = chat; header.messages = []; header.metadata.source = .manual
                try put(header, kind: .conversations, logicalID: chat.id.uuidString, id: chat.id)
                for var message in chat.messages {
                    message.metadata.source = message.role == .user ? .manual : .generated
                    // Never upload a partially received response.
                    try put(message, kind: .messages, logicalID: message.id.uuidString, id: message.id, parentID: chat.id, enqueue: message.status != .generating)
                }
            }
            for (key, text) in journal.notes { try put(DailyNote(dayKey: key, text: text), kind: .notes, logicalID: key, id: UUID()) }
        }
    }
    public func plans() throws -> [TrainingPlan] {
        let records = try rows().map(decoded).filter { !$0.deleted }
        return try values(TrainingPlan.self, kind: .plans).map { plan in
            var plan = plan
            plan.sessions = try records.filter { $0.kind == .sessions && $0.parentID == plan.id }.map { try WireCodec.decoder().decode(WorkoutSession.self, from: Data($0.payload.utf8)) }.sorted { $0.scheduledAt < $1.scheduledAt }
            return plan
        }.sorted { $0.metadata.createdAt > $1.metadata.createdAt }
    }
    public func save(_ plan: TrainingPlan) throws {
        try transaction {
            var header = plan; header.sessions = []; if header.metadata.source == .demo { header.metadata.source = .manual }
            try put(header, kind: .plans, logicalID: plan.id.uuidString, id: plan.id)
            for var session in plan.sessions {
                if session.metadata.source == .demo { session.metadata.source = .manual }
                try put(session, kind: .sessions, logicalID: session.id.uuidString, id: session.id, parentID: plan.id)
            }
        }
    }
    public func delete(id: UUID) throws {
        try transaction {
            for record in try rows().map(decoded).filter({ $0.id == id || $0.parentID == id }) {
                try put([String: String](), kind: record.kind, logicalID: record.logicalID, id: record.id, parentID: record.parentID, deleted: true)
            }
        }
    }
    public func summaries() throws -> [DailySummary] { try values(DailySummary.self, kind: .summaries).sorted { $0.date < $1.date } }
    public func saveSummaries(_ summaries: [DailySummary]) throws -> [DailySummary] {
        try transaction {
            let previous = try self.summaries()
            for var summary in summaries {
                let key = summary.dayKey + "|" + summary.timeZoneID
                if let old = previous.first(where: { $0.dayKey == summary.dayKey && $0.timeZoneID == summary.timeZoneID }) {
                    summary.metadata = old.metadata
                    if summary == old { continue }
                    summary.metadata.revision = (old.metadata.revision ?? 1) + 1
                    summary.metadata.updatedAt = Date()
                }
                try put(summary, kind: .summaries, logicalID: key, id: summary.id)
            }
        }
        return try self.summaries()
    }
    public func pending(now: Date = Date()) throws -> [PendingMutation] {
        try rows().filter { $0.conflictData == nil }.compactMap { row in
            try row.pendingData.map { try WireCodec.decoder().decode(PendingMutation.self, from: $0) }
        }.filter { $0.retryAt <= now }.sorted { $0.record.kind.order < $1.record.kind.order }
    }
    public func details() throws -> SyncDetails { SyncDetails(lastSync: try state().lastSync, pending: try rows().filter { $0.pendingData != nil }.count) }
    public func cursor() throws -> Int { try state().cursor }
    public func accept(_ remote: CloudRecord, mutationID: UUID? = nil) throws {
        try transaction {
            let all = try rows()
            let existing = all.first { (try? decoded($0).id) == remote.id } ?? (remote.deleted ? nil : all.first {
                guard let record = try? decoded($0) else { return false }
                return !record.deleted && record.kind == remote.kind && record.logicalID == remote.logicalID
            })
            let row = try existing ?? DeviceRecord(key: "\(partition)|\(remote.kind.rawValue)|\(remote.logicalID)|\(remote.id.uuidString)", partition: partition, recordData: try WireCodec.encoder().encode(remote))
            if existing == nil { context.insert(row) }
            if let data = row.pendingData {
                var pending = try WireCodec.decoder().decode(PendingMutation.self, from: data)
                if pending.id == mutationID { row.pendingData = nil; row.conflictData = nil }
                else if mutationID != nil {
                    // An edit made while the previous upload was in flight stays queued against the acknowledged version.
                    pending.record.version = remote.version
                    row.pendingData = try WireCodec.encoder().encode(pending)
                    row.recordData = try WireCodec.encoder().encode(pending.record)
                    return
                } else if remote.version > pending.record.version || remote.id != pending.record.id {
                    row.conflictData = try WireCodec.encoder().encode(remote)
                    return
                } else { return }
            }
            row.recordData = try WireCodec.encoder().encode(remote)
        }
    }
    public func fail(_ mutation: PendingMutation) throws {
        try transaction {
            guard let row = try rows().first(where: { (try? decoded($0).id) == mutation.record.id }),
                  let data = row.pendingData, var pending = try? WireCodec.decoder().decode(PendingMutation.self, from: data), pending.id == mutation.id else { return }
            pending.attempt += 1
            pending.retryAt = Date().addingTimeInterval(min(300, pow(2, Double(min(8, pending.attempt)))) + Double.random(in: 0...1))
            row.pendingData = try WireCodec.encoder().encode(pending)
        }
    }
    public func finishPull(cursor: Int) throws { try transaction { let state = try state(); state.cursor = cursor; state.lastSync = Date() } }
    public func conflicts() throws -> [RecordConflict] {
        try rows().compactMap { row in
            guard let data = row.conflictData else { return nil }
            let record = try decoded(row)
            return RecordConflict(id: record.id, kind: record.kind, local: record.payload, remote: try WireCodec.decoder().decode(CloudRecord.self, from: data))
        }
    }
    public func resolve(id: UUID, useLocal: Bool) throws {
        try transaction {
            guard let row = try rows().first(where: { (try? decoded($0).id) == id }), let data = row.conflictData else { return }
            let remote = try WireCodec.decoder().decode(CloudRecord.self, from: data)
            if useLocal && remote.deleted {
                try restoreAsNew(try decoded(row))
                row.recordData = data; row.pendingData = nil; row.conflictData = nil
                return
            }
            if useLocal {
                var local = try decoded(row); local.id = remote.id; local.version = remote.version
                var object = try JSONSerialization.jsonObject(with: Data(local.payload.utf8)) as! [String: Any]
                if var metadata = object["metadata"] as? [String: Any] { metadata["id"] = remote.id.uuidString; object["metadata"] = metadata }
                local.payload = String(decoding: try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys]), as: UTF8.self)
                row.recordData = try WireCodec.encoder().encode(local)
                row.pendingData = try WireCodec.encoder().encode(PendingMutation(id: UUID(), record: local, attempt: 0, retryAt: .distantPast))
            } else { row.recordData = data; row.pendingData = nil }
            row.conflictData = nil
        }
    }
    private func restoreAsNew(_ record: CloudRecord, parent: UUID? = nil) throws {
        var restored = record; restored.id = UUID(); restored.version = 0; restored.deleted = false
        if UUID(uuidString: restored.logicalID) != nil { restored.logicalID = restored.id.uuidString }
        var object = try JSONSerialization.jsonObject(with: Data(record.payload.utf8)) as! [String: Any]
        if var metadata = object["metadata"] as? [String: Any] { metadata["id"] = restored.id.uuidString; metadata["updatedAt"] = Date().timeIntervalSince1970 * 1000; object["metadata"] = metadata }
        if let parent { restored.parentID = parent }
        else if record.kind == .sessions || record.kind == .messages {
            // Restore a deleted child into a fresh parent; never revive an old deleted parent.
            let newParent = UUID()
            if record.kind == .sessions {
                var plan = TrainingPlan(title: "恢复的训练草案", sessions: [])
                plan.metadata.id = newParent; plan.metadata.source = .manual
                try put(plan, kind: .plans, logicalID: newParent.uuidString, id: newParent)
            } else {
                var conversation = Conversation(title: "恢复的会话")
                conversation.metadata.id = newParent; conversation.metadata.source = .manual
                try put(conversation, kind: .conversations, logicalID: newParent.uuidString, id: newParent)
            }
            restored.parentID = newParent
        }
        restored.payload = String(decoding: try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys]), as: UTF8.self)
        let row = DeviceRecord(key: "\(partition)|\(restored.kind.rawValue)|\(restored.logicalID)|\(restored.id.uuidString)", partition: partition, recordData: try WireCodec.encoder().encode(restored))
        row.pendingData = try WireCodec.encoder().encode(PendingMutation(id: UUID(), record: restored, attempt: 0, retryAt: .distantPast))
        context.insert(row)
        if record.kind == .plans || record.kind == .conversations {
            for child in try rows().map(decoded).filter({ $0.parentID == record.id && !$0.deleted }) { try restoreAsNew(child, parent: restored.id) }
        }
    }
    public func hasGuestRecords() throws -> Bool { try !rows(in: "guest").filter { (try? decoded($0).kind) != .profiles }.isEmpty }
    public func importGuest() throws {
        guard partition != "guest" else { return }
        try transaction {
            for row in try rows(in: "guest") {
                let record = try decoded(row)
                guard record.kind != .profiles else { continue }
                let key = "\(partition)|\(record.kind.rawValue)|\(record.logicalID)|\(record.id.uuidString)"
                guard try !rows().contains(where: {
                    guard let old = try? decoded($0) else { return false }
                    return !old.deleted && old.kind == record.kind && old.logicalID == record.logicalID
                }) else { continue }
                var imported = record; imported.version = 0
                let new = DeviceRecord(key: key, partition: partition, recordData: try WireCodec.encoder().encode(imported))
                new.pendingData = try WireCodec.encoder().encode(PendingMutation(id: UUID(), record: imported, attempt: 0, retryAt: .distantPast))
                context.insert(new)
            }
        }
    }
    public func purgeCurrentPartition() throws { try purge(partition: partition) }
    public func purge(partition scope: String) throws {
        try transaction {
            for row in try rows(in: scope) { context.delete(row) }
            for state in try context.fetch(FetchDescriptor<DeviceState>(predicate: #Predicate { $0.partition == scope })) { context.delete(state) }
        }
        if scope == partition { epoch += 1 }
    }
    public func consent() throws -> DeviceConsent {
        let s = try state()
        return DeviceConsent(deviceID: s.deviceID, revision: s.consentRevision, healthRead: s.healthRead, cloudSync: s.cloudSync, aiProcessing: s.aiProcessing)
    }
    public func readHealthCache() throws -> Data? { try state().healthCache }
    public func writeHealthCache(_ data: Data) throws { try transaction { try state().healthCache = data } }
}
private struct DailyNote: Codable { var dayKey: String; var text: String }

public struct DeviceConsent: Codable, Sendable {
    public var deviceID: UUID
    public var revision: Int
    public var healthRead: Bool
    public var cloudSync: Bool
    public var aiProcessing: Bool
    public var policyVersion = "2026-09-23"
}

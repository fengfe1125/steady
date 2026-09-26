import Foundation
import SwiftData

public struct JournalState: Codable, Sendable {
    public var preferences = UserPreferences()
    public var reports: [HealthReport] = []
    public var conversations: [Conversation] = []
    public var notes: [String: String] = [:]
    public var seeded = false
    public init() {}
}

@MainActor public protocol JournalRepository {
    func load() throws -> JournalState
    func save(_ state: JournalState) throws
}

@Model final class LocalJournalRecord {
    @Attribute(.unique) var key: String
    var payload: Data
    init(payload: Data) { key = "journal-v1"; self.payload = payload }
}

@MainActor public final class LocalJournalRepository: JournalRepository {
    private let container: ModelContainer
    private let context: ModelContext

    public init(url: URL? = nil, inMemory: Bool = false) throws {
        let schema = Schema([LocalJournalRecord.self])
        let configuration: ModelConfiguration
        if let url {
            configuration = ModelConfiguration("SteadyJournal", schema: schema, url: url, cloudKitDatabase: .none)
        } else {
            configuration = ModelConfiguration("SteadyJournal", schema: schema,
                isStoredInMemoryOnly: inMemory, cloudKitDatabase: .none)
        }
        container = try ModelContainer(for: schema, configurations: [configuration])
        context = ModelContext(container)
        context.autosaveEnabled = false
    }

    public func load() throws -> JournalState {
        guard let record = try context.fetch(FetchDescriptor<LocalJournalRecord>()).first else { return JournalState() }
        return try JSONDecoder().decode(JournalState.self, from: record.payload)
    }

    public func save(_ state: JournalState) throws {
        let payload = try JSONEncoder().encode(state)
        if let record = try context.fetch(FetchDescriptor<LocalJournalRecord>()).first {
            record.payload = payload
        } else {
            context.insert(LocalJournalRecord(payload: payload))
        }
        do { try context.save() } catch { context.rollback(); throw error }
    }
}

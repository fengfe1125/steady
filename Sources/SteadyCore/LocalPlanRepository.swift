import Foundation
import SwiftData

@Model final class LocalPlanRecord {
    @Attribute(.unique) var id: UUID
    var payload: Data
    init(id: UUID, payload: Data) {
        self.id = id
        self.payload = payload
    }
}

/// Device-only repository. No CloudKit entitlements or implicit cloud synchronization.
/// Encoding completes before mutation; any save failure rolls the context back.
@MainActor public final class LocalPlanRepository: PlanRepository {
    private let container: ModelContainer
    private let context: ModelContext

    public init(url: URL? = nil, inMemory: Bool = false) throws {
        let schema = Schema([LocalPlanRecord.self])
        let config: ModelConfiguration
        if let url {
            config = ModelConfiguration("SteadyPlans", schema: schema, url: url, cloudKitDatabase: .none)
        } else {
            config = ModelConfiguration("SteadyPlans", schema: schema,
                isStoredInMemoryOnly: inMemory, cloudKitDatabase: .none)
        }
        container = try ModelContainer(for: schema, configurations: [config])
        context = ModelContext(container)
        context.autosaveEnabled = false
    }

    public func plans() throws -> [TrainingPlan] {
        try context.fetch(FetchDescriptor<LocalPlanRecord>()).map {
            try JSONDecoder().decode(TrainingPlan.self, from: $0.payload)
        }.sorted { $0.metadata.createdAt > $1.metadata.createdAt }
    }

    public func save(_ plan: TrainingPlan) throws {
        let payload = try JSONEncoder().encode(plan)
        let id = plan.id
        let descriptor = FetchDescriptor<LocalPlanRecord>(predicate: #Predicate { $0.id == id })
        if let existing = try context.fetch(descriptor).first {
            existing.payload = payload
        } else {
            context.insert(LocalPlanRecord(id: id, payload: payload))
        }
        do { try context.save() }
        catch { context.rollback(); throw error }
    }

    public func delete(id: UUID) throws {
        let descriptor = FetchDescriptor<LocalPlanRecord>(predicate: #Predicate { $0.id == id })
        for record in try context.fetch(descriptor) { context.delete(record) }
        do { try context.save() }
        catch { context.rollback(); throw error }
    }

    /// Call only after the user confirms reset of this app's demo plans.
    public func reset() throws {
        for record in try context.fetch(FetchDescriptor<LocalPlanRecord>()) { context.delete(record) }
        do { try context.save() }
        catch { context.rollback(); throw error }
    }
}

import Foundation
import Testing
@testable import SteadyCore

@Suite struct ExerciseCatalogTests {
    private func preferences(_ catalog: ExerciseCatalog) -> UserPreferences {
        var p = UserPreferences()
        p.availableEquipmentIDs = catalog.equipment.map(\.id)
        p.experience = "偶尔运动"; p.availableMinutes = 90
        return p
    }
    private func object<T: Encodable>(_ value: T) throws -> [String: Any] {
        try #require(JSONSerialization.jsonObject(with: JSONEncoder().encode(value)) as? [String: Any])
    }
    private func decode<T: Decodable>(_ type: T.Type, object: [String: Any]) throws -> T {
        try JSONDecoder().decode(type, from: JSONSerialization.data(withJSONObject: object))
    }
    private let catalogKeys = ["catalogID", "catalogVersion", "templateID", "role"]

    @Test func bundledCatalogResolvesEveryTeachingAndSharesHash() throws {
        let catalog = try ExerciseCatalog.load()
        #expect(catalog.contentHash?.count == 64)
        let collections = [
            "arms": try AnimatedTrainingCatalog.armsCandidate(), "chest": try AnimatedTrainingCatalog.chestCandidate(),
            "shoulders": try AnimatedTrainingCatalog.shouldersCandidate(), "abs": try AnimatedTrainingCatalog.abdominalCandidate(),
            "arms-extra": try AnimatedTrainingCatalog.armsExtraCandidate(), "functional": try AnimatedTrainingCatalog.functionalCandidate(),
            "legs": try AnimatedTrainingCatalog.legsCandidate(), "back": try AnimatedTrainingCatalog.backCandidate()
        ]
        let refs = catalog.exercises.flatMap { [$0.defaultTeaching] + $0.otherTeachings } + catalog.learningOnly.map(\.teaching)
        #expect(refs.count == 97)
        #expect(Set(refs).count == 97)
        for ref in refs {
            if ref.kind == "collection" {
                let collection = try #require(collections[ref.topic ?? ""])
                #expect(collection.collection.lesson(id: ref.lessonID) != nil)
                let url = try #require(collection.artworkURL(for: ref.lessonID))
                #expect(FileManager.default.fileExists(atPath: url.path))
            } else { #expect(EquipmentLessonID(rawValue: ref.lessonID) != nil) }
        }
    }
    @Test func unconfirmedEquipmentAndRestrictionsCannotGenerate() throws {
        let catalog = try ExerciseCatalog.load()
        #expect(throws: ServiceError.self) { try PlanGenerationContext(preferences: UserPreferences()) }
        var p = preferences(catalog); p.limitations = "膝盖疼痛"
        #expect(throws: ServiceError.self) { try catalog.demoPlan(preferences: p, today: DemoData.today, calendar: DemoData.calendar) }
        var c = try PlanGenerationContext(preferences: preferences(catalog)); c.availableEquipmentIDs = ["made-up"]
        #expect(throws: ServiceError.self) { try catalog.validateContext(c) }
    }
    @Test func generatedDraftUsesTemplatesAndRoundTrips() throws {
        let catalog = try ExerciseCatalog.load(), prefs = preferences(try ExerciseCatalog.load())
        let plan = try catalog.demoPlan(preferences: prefs, today: DemoData.today, calendar: DemoData.calendar)
        try catalog.validateGeneratedPlan(plan, preferences: prefs)
        #expect(plan.status == .draft)
        for session in plan.sessions {
            #expect(session.exercises.map(\.role) == ["warmup", "main", "cooldown"])
            for entry in session.exercises { #expect(catalog.teaching(for: entry) != nil) }
        }
        #expect(try JSONDecoder().decode(TrainingPlan.self, from: JSONEncoder().encode(plan)) == plan)
        let wire = try WireCodec.decoder().decode(TrainingPlan.self, from: WireCodec.encoder().encode(plan))
        #expect(wire.generationContext == plan.generationContext)
        #expect(wire.sessions.map(\.exercises) == plan.sessions.map(\.exercises))
        #expect(abs(wire.metadata.createdAt.timeIntervalSince(plan.metadata.createdAt)) < 0.001)
    }
    @Test func replacementKeepsSlotIdentityAndChecksEligibility() throws {
        let catalog = try ExerciseCatalog.load(), context = try PlanGenerationContext(preferences: preferences(try ExerciseCatalog.load()))
        var tested = false
        for item in catalog.eligibleExercises(context: context, role: "main") {
            let old = try catalog.makeExercise(id: item.id, role: "main", context: context)
            guard let candidate = catalog.replacementCandidates(for: old, context: context).first else { continue }
            let replacement = try catalog.replacing(old, with: candidate.id, context: context)
            #expect(replacement.id == old.id)
            #expect(replacement.catalogID != old.catalogID)
            #expect(replacement.templateID != nil)
            #expect(catalog.teaching(for: replacement) == candidate.defaultTeaching)
            #expect(throws: ServiceError.self) { try catalog.replacing(old, with: "unknown", context: context) }
            tested = true; break
        }
        #expect(tested, "Catalog must contain at least one reviewed replacement pair")
    }
    @Test func generatedPlanRejectsTamperingAndTimeOverflow() throws {
        let catalog = try ExerciseCatalog.load(), prefs = preferences(try ExerciseCatalog.load())
        let source = try catalog.demoPlan(preferences: prefs, today: DemoData.today, calendar: DemoData.calendar)
        var changed = source; changed.sessions[0].exercises[1].catalogID = "unknown"
        #expect(throws: ServiceError.self) { try catalog.validateGeneratedPlan(changed, preferences: prefs) }
        changed = source; changed.sessions[0].exercises.reverse()
        #expect(throws: ServiceError.self) { try catalog.validate(changed) }
        changed = source; changed.sessions[0].exercises.append(changed.sessions[0].exercises[1])
        #expect(throws: ServiceError.self) { try catalog.validate(changed) }
        changed = source; changed.sessions[0].minutes = 1
        #expect(throws: ServiceError.self) { try catalog.validate(changed) }
        changed = source; changed.sessions[0].exercises[0].prescription = "AI编造的训练量"
        #expect(throws: ServiceError.self) { try catalog.validateGeneratedPlan(changed, preferences: prefs) }
        changed = source; changed.sessions[1].scheduledAt = changed.sessions[0].scheduledAt
        #expect(throws: ServiceError.self) { try catalog.validate(changed) }
    }
    @Test func customDoseClearsTemplateButKeepsTeaching() throws {
        let catalog = try ExerciseCatalog.load(), prefs = preferences(try ExerciseCatalog.load())
        var plan = try catalog.demoPlan(preferences: prefs, today: DemoData.today, calendar: DemoData.calendar)
        let old = plan.sessions[0].exercises[1]
        plan.sessions[0].exercises[1].setCustomPrescription("用户调整的用量")
        let updated = plan.sessions[0].exercises[1]
        #expect(updated.templateID == nil)
        #expect(updated.catalogID == old.catalogID)
        #expect(catalog.teaching(for: updated) == catalog.teaching(for: old))
        try catalog.validate(plan)
        #expect(throws: ServiceError.self) { try catalog.validateReplacement(in: plan) }
    }
    @Test func legacyJSONPreservesOmissionsWhileNewRecordsEncodeNulls() throws {
        let entry = Exercise(name: "旧自定义动作", prescription: "原来的说明")
        var raw = try object(entry)
        for key in catalogKeys {
            #expect(raw[key] is NSNull)
            raw.removeValue(forKey: key)
        }
        let restored = try decode(Exercise.self, object: raw)
        #expect(restored == entry, "Encoding presence must not change domain equality")
        let written = try object(restored)
        for key in catalogKeys { #expect(written[key] == nil) }
        #expect(Set(written.keys) == Set(["id", "name", "prescription"]))
        let roundTrip = try JSONDecoder().decode(Exercise.self, from: JSONEncoder().encode(restored))
        for key in catalogKeys { #expect(try object(roundTrip)[key] == nil) }
        var future = restored
        future.catalogID = "future-action"; future.catalogVersion = 999
        future.templateID = "future-template"; future.role = "main"
        future.setCustomPrescription("用户调整的用量")
        let futureRaw = try object(future)
        #expect(futureRaw["catalogID"] as? String == "future-action")
        #expect(futureRaw["catalogVersion"] as? Int == 999)
        #expect(futureRaw["templateID"] is NSNull)
        #expect(futureRaw["role"] as? String == "main")
        #expect(try decode(Exercise.self, object: futureRaw) == future)
        #expect(try ExerciseCatalog.load().teaching(for: future) == nil)
    }
    @Test func eachCatalogFieldPreservesMissingNullAndValueIndependently() throws {
        var entry = Exercise(name: "未来动作", prescription: "未来用量")
        entry.catalogID = "future-action"; entry.catalogVersion = 999
        entry.templateID = "future-template"; entry.role = "main"
        let source = try object(entry)
        for key in catalogKeys {
            var raw = source; raw.removeValue(forKey: key)
            var restored = try decode(Exercise.self, object: raw)
            let written = try object(restored)
            #expect(written[key] == nil)
            for other in catalogKeys where other != key {
                #expect(NSDictionary(dictionary: [other: try #require(written[other])])
                    == NSDictionary(dictionary: [other: try #require(source[other])]))
            }
            // Even assigning nil to a legacy nil is an intentional clear.
            switch key {
            case "catalogID": restored.catalogID = nil
            case "catalogVersion": restored.catalogVersion = nil
            case "templateID": restored.templateID = nil
            default: restored.role = nil
            }
            #expect(try object(restored)[key] is NSNull)
            let roundTrip = try decode(Exercise.self, object: object(restored))
            #expect(try object(roundTrip)[key] is NSNull)
        }
    }
    @Test func legacyCustomDoseOnlyClearsTemplate() throws {
        let entry = Exercise(name: "旧自定义动作", prescription: "原来的说明")
        var raw = try object(entry)
        for key in catalogKeys { raw.removeValue(forKey: key) }
        var restored = try decode(Exercise.self, object: raw)
        restored.setCustomPrescription(restored.prescription)
        #expect(try object(restored)["templateID"] == nil)
        restored.setCustomPrescription("用户调整的用量")
        let written = try object(restored)
        #expect(written["templateID"] is NSNull)
        for key in ["catalogID", "catalogVersion", "role"] { #expect(written[key] == nil) }
    }
    @Test func generationContextPreservesAbsenceUntilAssigned() throws {
        let plan = TrainingPlan(title: "旧计划", sessions: [])
        var raw = try object(plan)
        #expect(raw["generationContext"] is NSNull)
        raw.removeValue(forKey: "generationContext")
        var restored = try decode(TrainingPlan.self, object: raw)
        #expect(restored == plan)
        restored.title = "改标题"
        #expect(try object(restored)["generationContext"] == nil)
        restored.generationContext = nil
        #expect(try object(restored)["generationContext"] is NSNull)
        #expect(try object(decode(TrainingPlan.self, object: object(restored)))["generationContext"] is NSNull)
        restored = try decode(TrainingPlan.self, object: raw)
        restored.generationContext = PlanGenerationContext(experience: "初学者", availableEquipmentIDs: ["wall"], availableMinutes: 15)
        #expect(try decode(TrainingPlan.self, object: object(restored)).generationContext == restored.generationContext)
    }
    @Test @MainActor func legacyEquipmentSurvivesRepositorySaveUntilExplicitlyAssigned() throws {
        let prefs = UserPreferences()
        var raw = try object(prefs)
        #expect(raw["availableEquipmentIDs"] is NSNull)
        raw.removeValue(forKey: "availableEquipmentIDs")
        var restored = try decode(UserPreferences.self, object: raw)
        #expect(restored == prefs)
        restored.goal = "保持活动"; restored.healthRead = true
        let directory = FileManager.default.temporaryDirectory.appending(path: "LegacyEquipmentRestart-\(UUID())")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: false)
        defer { try? FileManager.default.removeItem(at: directory) }
        let url = directory.appending(path: "synced.store"), userID = UUID()
        do {
            let store = try DeviceRepository(url: url); store.select(userID: userID)
            var journal = JournalState(); journal.preferences = restored
            try store.save(journal)
        }
        let store = try DeviceRepository(url: url); store.select(userID: userID)
        var loaded = try store.load()
        #expect(try object(loaded.preferences)["availableEquipmentIDs"] == nil)
        loaded.preferences.availableMinutes = 20
        try store.save(loaded)
        var pending = try #require(store.pending().first { $0.record.kind == .profiles })
        var payload = try #require(JSONSerialization.jsonObject(with: Data(pending.record.payload.utf8)) as? [String: Any])
        #expect(payload["availableEquipmentIDs"] == nil)
        loaded.preferences.availableEquipmentIDs = nil
        try store.save(loaded)
        pending = try #require(store.pending().first { $0.record.kind == .profiles })
        payload = try #require(JSONSerialization.jsonObject(with: Data(pending.record.payload.utf8)) as? [String: Any])
        #expect(payload["availableEquipmentIDs"] is NSNull)
        loaded.preferences.availableEquipmentIDs = []
        try store.save(loaded)
        #expect(try store.load().preferences.availableEquipmentIDs == [])
        #expect(try object(store.load().preferences)["availableEquipmentIDs"] as? [String] == [])
        loaded.preferences.availableEquipmentIDs = ["wall"]
        try store.save(loaded)
        #expect(try store.load().preferences.availableEquipmentIDs == ["wall"])
    }
    @Test @MainActor func offlineUpgradeRetainsOmissionsThroughRestartDateFeedbackAndDoseEdits() throws {
        let session = WorkoutSession(title: "旧训练", scheduledAt: DemoData.today, minutes: 15,
                                     exercises: [Exercise(name: "旧动作", prescription: "原来的说明")])
        var raw = try object(TrainingPlan(title: "旧计划", sessions: [session]))
        raw.removeValue(forKey: "generationContext")
        var sessions = try #require(raw["sessions"] as? [[String: Any]])
        var exercises = try #require(sessions[0]["exercises"] as? [[String: Any]])
        for key in catalogKeys { exercises[0].removeValue(forKey: key) }
        sessions[0]["exercises"] = exercises; raw["sessions"] = sessions
        let legacy = try decode(TrainingPlan.self, object: raw)
        let directory = FileManager.default.temporaryDirectory.appending(path: "LegacyCatalogRestart-\(UUID())")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: false)
        defer { try? FileManager.default.removeItem(at: directory) }
        let localURL = directory.appending(path: "local.store"), syncedURL = directory.appending(path: "synced.store")
        let userID = UUID()
        do {
            let local = try LocalPlanRepository(url: localURL)
            try local.save(legacy)
            let store = try DeviceRepository(url: syncedURL); store.select(userID: userID)
            try store.save(legacy)
        }
        let localPlan = try #require(LocalPlanRepository(url: localURL).plans().first)
        #expect(try object(localPlan)["generationContext"] == nil)
        for key in catalogKeys { #expect(try object(localPlan.sessions[0].exercises[0])[key] == nil) }
        let store = try DeviceRepository(url: syncedURL); store.select(userID: userID)
        var plan = try #require(store.plans().first)
        #expect(try object(plan)["generationContext"] == nil)
        var updated = plan.sessions[0]
        updated.scheduledAt = updated.scheduledAt.addingTimeInterval(86400)
        updated.feedback = try WorkoutFeedback(completed: true, perceivedEffort: 5, note: "完成")
        try plan.updateSession(updated)
        try store.save(plan)
        let pendingPlan = try #require(store.pending().first { $0.record.kind == .plans })
        let planPayload = try #require(JSONSerialization.jsonObject(with: Data(pendingPlan.record.payload.utf8)) as? [String: Any])
        #expect(planPayload["generationContext"] == nil)
        let pendingSession = try #require(store.pending().first { $0.record.kind == .sessions })
        let sessionPayload = try #require(JSONSerialization.jsonObject(with: Data(pendingSession.record.payload.utf8)) as? [String: Any])
        let written = try #require((sessionPayload["exercises"] as? [[String: Any]])?.first)
        for key in catalogKeys { #expect(written[key] == nil) }
        let reloaded = try #require(store.plans().first)
        #expect(reloaded.sessions[0].feedback?.note == "完成")
        #expect(reloaded.sessions[0].scheduledAt == updated.scheduledAt)
        plan.sessions[0].exercises[0].setCustomPrescription("用户调整的用量")
        try store.save(plan)
        let dose = try #require(store.plans().first).sessions[0].exercises[0]
        #expect(try object(dose)["templateID"] is NSNull)
        for key in ["catalogID", "catalogVersion", "role"] { #expect(try object(dose)[key] == nil) }
    }
    @Test func historicalUnknownAndLegacyRenamedEntriesRemainEditable() throws {
        let catalog = try ExerciseCatalog.load(), prefs = preferences(try ExerciseCatalog.load())
        var plan = try catalog.demoPlan(preferences: prefs, today: DemoData.today, calendar: DemoData.calendar)
        plan.sessions[0].exercises[1].catalogID = "future-action"
        plan.sessions[0].exercises[1].catalogVersion = 99
        try catalog.validate(plan)
        #expect(throws: ServiceError.self) { try catalog.validateGeneratedPlan(plan, preferences: prefs) }
        plan.sessions[0].exercises[1] = Exercise(name: "旧端修改的动作", prescription: "保留自定义说明")
        try catalog.validate(plan)
        #expect(throws: ServiceError.self) { try catalog.validateReplacement(in: plan) }
    }
    @Test @MainActor func localAndSyncedRepositoryPreserveCatalogAfterRestart() throws {
        let catalog = try ExerciseCatalog.load(), prefs = preferences(try ExerciseCatalog.load())
        let plan = try catalog.demoPlan(preferences: prefs, today: DemoData.today, calendar: DemoData.calendar)
        let directory = FileManager.default.temporaryDirectory.appending(path: "CatalogRestart-\(UUID())")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: false)
        defer { try? FileManager.default.removeItem(at: directory) }
        let localURL = directory.appending(path: "local.store")
        let syncedURL = directory.appending(path: "synced.store")
        do {
            let local = try LocalPlanRepository(url: localURL)
            try local.save(plan)
            let store = try DeviceRepository(url: syncedURL)
            try store.save(plan)
        }
        #expect(try LocalPlanRepository(url: localURL).plans().first == plan)
        let reopened = try DeviceRepository(url: syncedURL).plans().first
        #expect(reopened?.sessions[0].exercises == plan.sessions[0].exercises)
        #expect(reopened?.generationContext == plan.generationContext)
    }
}

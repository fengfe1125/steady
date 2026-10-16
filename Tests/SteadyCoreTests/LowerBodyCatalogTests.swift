import Foundation
import Testing
@testable import SteadyCore

struct LowerBodyCatalogTests {
    private func preferences(equipment: [String] = [], experience: String = "初学者", minutes: Int = 30) throws -> UserPreferences {
        let catalog = try ExerciseCatalog.load(version: 2)
        var p = UserPreferences(); p.availableEquipmentIDs = equipment; p.experience = experience; p.availableMinutes = minutes
        p.movementConditions = (catalog.conditions ?? []).map { .init(conditionID: $0.id, version: $0.version, status: .ready) }
        return p
    }
    @Test func allSixteenTargetsResolveAndOriginalTeachingReferencesRemain() throws {
        let v1 = try ExerciseCatalog.load(), v2 = try ExerciseCatalog.load(version: 2)
        let old = Set(v1.exercises.flatMap { [$0.defaultTeaching] + $0.otherTeachings } + v1.learningOnly.map(\.teaching))
        let new = Set(v2.exercises.flatMap { [$0.defaultTeaching] + $0.otherTeachings } + v2.learningOnly.map(\.teaching))
        #expect(old.count == 97); #expect(new.count == 104); #expect(new.isSuperset(of: old))
        let lower = v2.exercises.filter { $0.trainingSlot != nil }
        #expect(lower.count == 16); #expect(lower.allSatisfy { $0.status == "approved" && !($0.requiredConditions ?? []).isEmpty })
        #expect(v1.contentHash == "86292e526103697d6e9ac58f4199062b325fddbd214183ca7b7517ae251207d4")
        for item in lower {
            if item.defaultTeaching.kind == "collection", item.defaultTeaching.topic == "legs" {
                #expect(try AnimatedTrainingCatalog.legsCandidate().collection.lesson(id: item.defaultTeaching.lessonID) != nil)
            }
        }
    }
    @Test func conditionsAreRequiredAndEquipmentCannotStandInForAbility() throws {
        let catalog = try ExerciseCatalog.load(version: 2)
        let p = try preferences(equipment: ["dumbbells"])
        var context = try PlanGenerationContext(preferences: p, programKind: "lowerBodyBasics")
        #expect(catalog.eligibleExercises(context: context, role: "main").contains { $0.id == "functional-dumbbell-romanian-deadlift" })
        for status in [MovementConditionStatus.unsure, .unable] {
            context.movementConditions = [.init(conditionID: "hip-hinge", version: 1, status: status), .init(conditionID: "dumbbell-control", version: 1, status: .ready)]
            #expect(!catalog.eligibleExercises(context: context, role: "main").contains { $0.id == "functional-dumbbell-romanian-deadlift" })
        }
        context.movementConditions = [.init(conditionID: "hip-hinge", version: 0, status: .ready)]
        #expect(throws: ServiceError.self) { try catalog.validateContext(context) }
        context.movementConditions = nil
        #expect(catalog.eligibleExercises(context: context, role: "main").isEmpty)
    }
    @Test func threeScenesAndNoObjectBodyweightGenerateBothRequiredPatterns() throws {
        let catalog = try ExerciseCatalog.load(version: 2)
        for equipment in [[], ["stable-chair", "fixed-support"], ["dumbbells"], ["leg-press-machine", "leg-curl-machine", "prone-leg-curl-machine"]] {
            let p = try preferences(equipment: equipment)
            let plan = try catalog.demoPlan(preferences: p, today: DemoData.today, calendar: DemoData.calendar)
            #expect(plan.sessions.count == 2)
            for session in plan.sessions {
                let main = session.exercises.filter { $0.role == "main" }.compactMap { catalog.exercise(id: $0.catalogID ?? "")?.trainingSlot }
                #expect(main.filter { $0 == "kneeDominant" }.count == 1)
                #expect(main.filter { $0 == "hipDominant" }.count == 1)
                let context = try #require(plan.generationContext)
                let seconds = try #require(catalog.sessionEstimatedSeconds(session.exercises, context: context))
                #expect(seconds <= session.minutes * 60)
            }
        }
    }
    @Test func templateEstimatesIncludeBothSidesRestSetupAndTransitions() throws {
        let catalog = try ExerciseCatalog.load(version: 2), p = try preferences(equipment: ["dumbbells", "fixed-support"])
        let context = try PlanGenerationContext(preferences: p, programKind: "lowerBodyBasics")
        let expectations = ["functional-dumbbell-romanian-deadlift":214, "bodyweight-squat":184, "floor-glute-bridge":154, "supported-split-squat":278, "side-lying-hip-abduction":248]
        for (id, seconds) in expectations {
            let entry = try catalog.makeExercise(id: id, role: "main", context: context)
            #expect(catalog.estimatedSeconds(for: entry, context: context) == seconds)
        }
        let entries = try ["bodyweight-squat", "floor-glute-bridge"].map { try catalog.makeExercise(id: $0, role: "main", context: context) }
        #expect(catalog.sessionEstimatedSeconds(entries, context: context) == 368)
    }
    @Test func invalidCoverageBudgetGroupCountAndDatesAreRejected() throws {
        let catalog = try ExerciseCatalog.load(version: 2), p = try preferences(equipment: ["fixed-support"])
        let original = try catalog.demoPlan(preferences: p, today: DemoData.today, calendar: DemoData.calendar)
        var plan = original
        let hipIndex = try #require(plan.sessions[0].exercises.firstIndex { catalog.exercise(id: $0.catalogID ?? "")?.trainingSlot == "hipDominant" })
        plan.sessions[0].exercises.remove(at: hipIndex)
        #expect(throws: ServiceError.self) { try catalog.validateReplacement(in: plan) }
        plan = original; plan.sessions[1].scheduledAt = DemoData.calendar.date(byAdding: .day, value: 1, to: plan.sessions[0].scheduledAt)!
        #expect(throws: ServiceError.self) { try catalog.validateLowerBodyDates(plan, calendar: DemoData.calendar) }
        plan = original; plan.sessions[0].minutes = 10
        #expect(throws: ServiceError.self) { try catalog.validateReplacement(in: plan) }
        let context = try #require(plan.generationContext)
        let main = try ["supported-split-squat", "floor-glute-bridge", "side-lying-hip-abduction"].map { try catalog.makeExercise(id: $0, role: "main", context: context) }
        var session = original.sessions[0]; session.exercises = [session.exercises[0]] + main + [try #require(session.exercises.last)]
        #expect(throws: ServiceError.self) { try catalog.validateLowerBodySession(session, context: context) }
    }
    @Test func replacementUsesExplicitRelationsAndRevocationExcludesActions() throws {
        let catalog = try ExerciseCatalog.load(version: 2), p = try preferences(equipment: ["dumbbells", "leg-extension-machine"])
        var context = try PlanGenerationContext(preferences: p, programKind: "lowerBodyBasics")
        let squat = try catalog.makeExercise(id: "bodyweight-squat", role: "main", context: context)
        #expect(catalog.replacementCandidates(for: squat, context: context).contains { $0.id == "dumbbell-goblet-squat" })
        #expect(!catalog.replacementCandidates(for: squat, context: context).contains { $0.id == "seated-leg-extension" })
        let new = try catalog.replacing(squat, with: "dumbbell-goblet-squat", context: context)
        #expect(new.id == squat.id); #expect(new.catalogVersion == 2)
        context.movementConditions?.removeAll { $0.conditionID == "dumbbell-control" }
        #expect(!catalog.replacementCandidates(for: squat, context: context).contains { $0.id == "dumbbell-goblet-squat" })
        #expect(catalog.teaching(for: new)?.lessonID == "dumbbell-goblet-squat")
        let legacy = try ExerciseCatalog.load().makeExercise(id: "wall-push-up", role: "main", context: .init(experience: "初学者", availableEquipmentIDs: ["wall"], availableMinutes: 30))
        #expect(catalog.teaching(for: legacy) == (try ExerciseCatalog.load()).teaching(for: legacy))
    }
    @Test func extendedFieldsPreserveOmissionAndExplicitClearing() throws {
        let p = try preferences(), context = try PlanGenerationContext(preferences: p, programKind: "lowerBodyBasics")
        func object<T: Encodable>(_ x: T) throws -> [String: Any] { try #require(JSONSerialization.jsonObject(with: JSONEncoder().encode(x)) as? [String: Any]) }
        var legacyProfile = try object(p); legacyProfile.removeValue(forKey: "movementConditions")
        var decoded = try JSONDecoder().decode(UserPreferences.self, from: JSONSerialization.data(withJSONObject: legacyProfile))
        decoded.availableMinutes += 5
        #expect(try object(decoded)["movementConditions"] == nil)
        decoded.movementConditions = nil
        #expect(try object(decoded)["movementConditions"] is NSNull)
        var raw = try object(context)
        for key in ["movementConditions", "programKind", "rulesVersion"] { raw.removeValue(forKey: key) }
        var oldContext = try JSONDecoder().decode(PlanGenerationContext.self, from: JSONSerialization.data(withJSONObject: raw))
        oldContext.availableMinutes += 5
        for key in ["movementConditions", "programKind", "rulesVersion"] { #expect(try object(oldContext)[key] == nil) }
        oldContext.programKind = nil
        #expect(try object(oldContext)["programKind"] is NSNull)
    }
    @Test func revokedConditionsAllowRepairingOneHistoricalSlotAtATime() throws {
        let catalog = try ExerciseCatalog.load(version: 2), p = try preferences(equipment: ["dumbbells"])
        let plan = try catalog.demoPlan(preferences: p, today: DemoData.today, calendar: DemoData.calendar)
        let old = try #require(plan.sessions[0].exercises.first { $0.catalogID == "floor-glute-bridge" })
        var answers = p.movementConditions!
        answers.removeAll { $0.conditionID == "floor-access" }
        let replaced = try catalog.replacing(in: plan, sessionID: plan.sessions[0].id, entryID: old.id, candidateID: "functional-dumbbell-romanian-deadlift", currentAnswers: answers)
        #expect(replaced.sessions[0].exercises.contains { $0.id == old.id && $0.catalogID == "functional-dumbbell-romanian-deadlift" })
        #expect(replaced.sessions[1].exercises.contains { $0.catalogID == "floor-glute-bridge" })
        #expect(!catalog.conditionsSatisfied(for: catalog.exercise(id: "floor-glute-bridge")!, answers: answers))
        #expect(throws: ServiceError.self) {
            try catalog.replacing(in: replaced, sessionID: replaced.sessions[0].id, entryID: old.id, candidateID: "floor-glute-bridge", currentAnswers: answers)
        }
    }
    @Test func lowerBodyWarmupCannotUseUnrelatedUpperBodyLesson() throws {
        let catalog = try ExerciseCatalog.load(version: 2), p = try preferences()
        let context = try PlanGenerationContext(preferences: p, programKind: "lowerBodyBasics")
        #expect(Set(catalog.eligibleExercises(context: context, role: "warmup").map(\.id)).isSubset(of: ExerciseCatalog.lowerBodyWarmupIDs))
        #expect(Set(catalog.eligibleExercises(context: context, role: "cooldown").map(\.id)).isSubset(of: ExerciseCatalog.lowerBodyCooldownIDs))
    }

    private struct ParityOption: Decodable, Equatable {
        let exerciseID: String, role: String
        let estimatedSeconds: Int
    }
    private struct ParityCase: Decodable {
        let id: String, experience: String, equipment: String
        let availableMinutes: Int, availableEquipmentIDs: [String], movementConditions: [MovementConditionAnswer]
        let options: [ParityOption]?, minimumBaseSeconds: Int?
    }
    private struct ParityFixture: Decodable { let catalogSHA256: String, cases: [ParityCase] }
    @Test func swiftAndBackendCandidatesAndBaseBudgetsMatchAllTwelveFixtures() throws {
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        let data = try Data(contentsOf: root.appending(path: "docs/verification/lower-body-v2/candidate-parity.json"))
        let fixture = try JSONDecoder().decode(ParityFixture.self, from: data)
        let catalog = try ExerciseCatalog.load(version: 2)
        #expect(catalog.contentHash == fixture.catalogSHA256); #expect(fixture.cases.count == 12)
        for item in fixture.cases {
            var p = UserPreferences(); p.experience = item.experience; p.equipment = item.equipment
            p.availableMinutes = item.availableMinutes; p.availableEquipmentIDs = item.availableEquipmentIDs; p.movementConditions = item.movementConditions
            let context = try PlanGenerationContext(preferences: p, programKind: "lowerBodyBasics")
            guard let expected = item.options else {
                #expect(throws: ServiceError.self) { try catalog.demoPlan(preferences: p, today: DemoData.today, calendar: DemoData.calendar) }
                continue
            }
            var actual: [ParityOption] = []
            for role in ["warmup", "main", "cooldown"] {
                for exercise in catalog.eligibleExercises(context: context, role: role) {
                    let seconds = exercise.template(role: role, experience: context.experience)!.estimatedSeconds
                    actual.append(ParityOption(exerciseID: exercise.id, role: role, estimatedSeconds: seconds))
                }
            }
            actual.sort { $0.exerciseID == $1.exerciseID ? $0.role < $1.role : $0.exerciseID < $1.exerciseID }
            #expect(actual == expected, "Candidate mismatch: \(item.id)")
            var costs: [Int] = []
            for w in actual where w.role == "warmup" && w.exerciseID != "unloaded-hip-hinge" {
                for k in actual where k.role == "main" && catalog.exercise(id: k.exerciseID)?.trainingSlot == "kneeDominant" {
                    for h in actual where h.role == "main" && catalog.exercise(id: h.exerciseID)?.trainingSlot == "hipDominant" {
                        for c in actual where c.role == "cooldown" && Set([w.exerciseID,k.exerciseID,h.exerciseID,c.exerciseID]).count == 4 {
                            costs.append(w.estimatedSeconds+k.estimatedSeconds+h.estimatedSeconds+c.estimatedSeconds+90)
                        }
                    }
                }
            }
            #expect(costs.min() == item.minimumBaseSeconds, "Budget mismatch: \(item.id)")
        }
    }

    @Test func allFourApprovedAcceptanceCombinationsFitCompleteTemplates() throws {
        let catalog = try ExerciseCatalog.load(version: 2)
        let samples: [([String], [String])] = [
            (["stable-chair", "fixed-support"], ["chair-sit-to-stand", "floor-glute-bridge", "supported-calf-raise"]),
            ([], ["bodyweight-squat", "floor-glute-bridge", "side-lying-hip-abduction"]),
            (["dumbbells"], ["dumbbell-goblet-squat", "functional-dumbbell-romanian-deadlift", "legs-calf-raise"]),
            (["leg-press-machine", "leg-curl-machine"], ["seated-leg-press", "floor-glute-bridge", "seated-leg-curl"])
        ]
        for (equipment, mains) in samples {
            let p = try preferences(equipment: equipment)
            let context = try PlanGenerationContext(preferences: p, programKind: "lowerBodyBasics")
            let selections = [("march-in-place", "warmup")] + mains.map { ($0, "main") } + [("walk", "cooldown")]
            let sessions = try [0,3].map { day in
                WorkoutSession(title: "基础组合", scheduledAt: DemoData.calendar.date(byAdding: .day, value: day, to: DemoData.today)!, minutes: 30,
                    exercises: try selections.map { try catalog.makeExercise(id: $0.0, role: $0.1, context: context) })
            }
            var plan = TrainingPlan(title: "下肢基础草案", sessions: sessions); plan.generationContext = context
            try catalog.validateGeneratedPlan(plan, preferences: p)
        }
    }

    @Test func interchangeableCalfVariantsCannotFillBothAuxiliarySlots() throws {
        let catalog = try ExerciseCatalog.load(version: 2), p = try preferences(equipment: ["fixed-support"])
        var plan = try catalog.demoPlan(preferences: p, today: DemoData.today, calendar: DemoData.calendar)
        let context = try #require(plan.generationContext)
        let selections = [("march-in-place","warmup"),("bodyweight-squat","main"),("floor-glute-bridge","main"),("supported-calf-raise","main"),("legs-calf-raise","main"),("walk","cooldown")]
        plan.sessions[0].exercises = try selections.map { try catalog.makeExercise(id: $0.0, role: $0.1, context: context) }
        #expect(throws: ServiceError.self) { try catalog.validateReplacement(in: plan) }
    }

}

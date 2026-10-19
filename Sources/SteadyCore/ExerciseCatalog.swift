import Foundation
import CryptoKit

public struct TeachingReference: Codable, Equatable, Hashable, Sendable {
    public let kind: String
    public let topic: String?
    public let lessonID: String
}
public struct CatalogEquipment: Codable, Identifiable, Sendable {
    public let id: String
    public let name: String
    public let scenes: [String]
}
public struct CatalogCondition: Codable, Identifiable, Sendable {
    public let id: String
    public let version: Int
    public let title: String
    public let detail: String
    public let teaching: TeachingReference
}
public struct CatalogTimeEstimate: Codable, Sendable {
    public let repSeconds: Int
    public let setupSeconds: Int
    public let sideSwitchSeconds: Int
}
public struct CatalogTemplate: Codable, Identifiable, Sendable {
    public let id: String
    public let role: String
    public let experiences: [String]
    public let sets: Int?
    public let reps: Int?
    public let durationSeconds: Int?
    public let perSide: Bool
    public let restSeconds: Int
    public let estimatedSeconds: Int
    public let prescription: String
    public let estimate: CatalogTimeEstimate?
}
public struct CatalogExercise: Codable, Identifiable, Sendable {
    public struct Review: Codable, Sendable { public let basis: String; public let reason: String }
    public let id: String
    public let name: String
    public let aliases: [String]
    public let pattern: String
    public let equipment: [String]
    public let experiences: [String]
    public let status: String
    public let review: Review
    public let defaultTeaching: TeachingReference
    public let otherTeachings: [TeachingReference]
    public let templates: [CatalogTemplate]
    public let requiredConditions: [String]?
    public let trainingSlot: String?
    public let replacementIDs: [String]?
    public func template(role: String, experience: String) -> CatalogTemplate? {
        let matches = templates.filter { $0.role == role && $0.experiences.contains(experience) }
        return matches.count == 1 ? matches[0] : nil
    }
}

/// Shared, versioned selection rules. The catalog owns identity and templates;
/// teaching prose and artwork remain in their original bundled resources.
public struct ExerciseCatalog: Decodable, Sendable {
    public struct LearningOnly: Decodable, Sendable { public let teaching: TeachingReference; public let reason: String }
    public let schemaVersion: Int
    public let catalogVersion: Int
    public let equipment: [CatalogEquipment]
    public let exercises: [CatalogExercise]
    public let conditions: [CatalogCondition]?
    public let learningOnly: [LearningOnly]
    public private(set) var contentHash: String?
    public static let roles = ["warmup", "main", "cooldown"]
    public static let experiences = ["初学者", "偶尔运动", "规律运动"]

    public static func load(version: Int = 1) throws -> Self {
        guard let url = Bundle.module.url(forResource: "exercise-catalog.v\(version)", withExtension: "json", subdirectory: "TrainingCollections") else {
            throw ServiceError.invalidInput("动作目录暂时无法读取，请保留计划并稍后重试。")
        }
        let data = try Data(contentsOf: url)
        var result = try JSONDecoder().decode(Self.self, from: data)
        result.contentHash = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        try result.checkIntegrity()
        return result
    }
    public func exercise(id: String) -> CatalogExercise? { exercises.first { $0.id == id } }
    public func teaching(for entry: Exercise) -> TeachingReference? {
        guard let version = entry.catalogVersion, let id = entry.catalogID else { return nil }
        if version != catalogVersion { return (try? Self.load(version: version))?.exercise(id: id)?.defaultTeaching }
        return exercise(id: id)?.defaultTeaching
    }
    public func eligibleExercises(context: PlanGenerationContext, role: String) -> [CatalogExercise] {
        let available = Set(context.availableEquipmentIDs)
        return exercises.filter {
            $0.status == "approved" && $0.experiences.contains(context.experience)
            && Set($0.equipment).isSubset(of: available)
            && $0.template(role: role, experience: context.experience) != nil
            && conditionsSatisfied(for: $0, answers: context.movementConditions)
            && (context.programKind != "lowerBodyBasics" || (role == "main" ? Self.lowerBodySlots.contains($0.trainingSlot ?? "") : (role == "warmup" ? Self.lowerBodyWarmupIDs : Self.lowerBodyCooldownIDs).contains($0.id)))
        }
    }
    public func replacementCandidates(for entry: Exercise, context: PlanGenerationContext) -> [CatalogExercise] {
        guard entry.catalogVersion == catalogVersion, let id = entry.catalogID,
              let original = exercise(id: id), let role = entry.role else { return [] }
        return eligibleExercises(context: context, role: role).filter {
            $0.id != id && (catalogVersion == 2 ? (original.replacementIDs ?? []).contains($0.id) : $0.pattern == original.pattern)
        }
    }
    public func makeExercise(id: String, role: String, context: PlanGenerationContext) throws -> Exercise {
        guard let item = eligibleExercises(context: context, role: role).first(where: { $0.id == id }),
              let template = item.template(role: role, experience: context.experience) else {
            throw ServiceError.invalidInput("这个动作暂不适合所选器械、经验或训练用途。")
        }
        var result = Exercise(name: item.name, prescription: template.prescription)
        result.catalogID = item.id; result.catalogVersion = catalogVersion
        result.templateID = template.id; result.role = role
        return result
    }
    public func replacing(_ original: Exercise, with candidateID: String, context: PlanGenerationContext) throws -> Exercise {
        guard replacementCandidates(for: original, context: context).contains(where: { $0.id == candidateID }), let role = original.role else {
            throw ServiceError.invalidInput("没有符合当前动作用途和器械条件的替代项。")
        }
        var result = try makeExercise(id: candidateID, role: role, context: context)
        result.id = original.id
        return result
    }
    public func estimatedSeconds(for entry: Exercise, context: PlanGenerationContext) -> Int? {
        guard entry.catalogVersion == catalogVersion, let id = entry.catalogID,
              let item = exercise(id: id), let role = entry.role,
              let template = item.template(role: role, experience: context.experience),
              entry.templateID == template.id, entry.prescription == template.prescription else { return nil }
        return template.estimatedSeconds
    }
    public func validateContext(_ context: PlanGenerationContext) throws {
        guard Self.experiences.contains(context.experience), (10...90).contains(context.availableMinutes),
              Set(context.availableEquipmentIDs).count == context.availableEquipmentIDs.count,
              Set(context.availableEquipmentIDs).isSubset(of: Set(equipment.map(\.id))) else {
            throw ServiceError.invalidInput("训练条件无效，请重新确认经验、器械和可用时间。")
        }
        if context.programKind == "lowerBodyBasics" {
            guard catalogVersion == 2, context.rulesVersion == 2, context.movementConditions != nil else { throw ServiceError.invalidResponse }
            let answers = context.movementConditions ?? []
            guard Set(answers.map(\.conditionID)).count == answers.count,
                  answers.allSatisfy({ answer in (conditions ?? []).contains { $0.id == answer.conditionID && $0.version == answer.version } }) else {
                throw ServiceError.invalidInput("动作条件已更新，请重新确认后生成计划。")
            }
        }
    }
    /// Editing a custom prescription intentionally relinquishes its template claim.
    /// Only fully templated sessions can have a reliable automatic time estimate.
    public func validate(_ plan: TrainingPlan) throws {
        guard let context = plan.generationContext else { return }
        try validateContext(context)
        guard !plan.sessions.isEmpty, plan.sessions.count <= 7,
              Set(plan.sessions.map(\.id)).count == plan.sessions.count else { throw ServiceError.invalidResponse }
        if context.programKind == "lowerBodyBasics" { try validateLowerBodyDates(plan) }
        var dates = Set<Date>()
        for session in plan.sessions {
            guard dates.insert(Calendar.current.startOfDay(for: session.scheduledAt)).inserted,
                  (10...context.availableMinutes).contains(session.minutes), !session.exercises.isEmpty,
                  session.exercises.count <= 20, Set(session.exercises.map(\.id)).count == session.exercises.count else {
                throw ServiceError.invalidInput("请检查训练日期、时长和动作，避免同一天重复安排。")
            }
            var ids = Set<String>(), ranks: [Int] = [], total = 0, estimated = true, completeIdentity = true
            for entry in session.exercises {
                guard !entry.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                      !entry.prescription.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                    throw ServiceError.invalidInput("请保留动作名称和训练说明。")
                }
                // Legacy edits and future catalog identities remain editable text snapshots.
                // Generation/replacement additionally require every entry to resolve a template.
                guard let id = entry.catalogID, entry.catalogVersion == catalogVersion,
                      let item = exercise(id: id) else {
                    estimated = false; completeIdentity = false; continue
                }
                guard let role = entry.role, let rank = Self.roles.firstIndex(of: role), item.name == entry.name,
                      eligibleExercises(context: context, role: role).contains(where: { $0.id == id }),
                      ids.insert(id).inserted,
                      !entry.prescription.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                    throw ServiceError.invalidInput("动作关联或适用条件无效。原记录仍保留，请重新选择动作。")
                }
                ranks.append(rank)
                if let templateID = entry.templateID, item.templates.contains(where: { $0.id == templateID }) {
                    guard let seconds = estimatedSeconds(for: entry, context: context) else { throw ServiceError.invalidResponse }
                    total += seconds
                } else { estimated = false }
            }
            guard !completeIdentity || (ranks == ranks.sorted() && Set(ranks) == Set([0, 1, 2])) else {
                throw ServiceError.invalidInput("训练应依次包含热身、主练和整理动作。")
            }
            if catalogVersion == 2 { total += max(0, session.exercises.count - 1) * 30 }
            if context.programKind == "lowerBodyBasics", completeIdentity { try validateLowerBodySession(session, context: context) }
            if estimated && total > session.minutes * 60 {
                throw ServiceError.invalidInput("动作模板预计用时超过本次预算，请调整动作或增加可用时长。")
            }
        }
    }
    public func validateReplacement(in plan: TrainingPlan) throws {
        try validate(plan)
        guard let context = plan.generationContext else { throw ServiceError.invalidResponse }
        guard plan.sessions.allSatisfy({ $0.exercises.allSatisfy { entry in
            guard entry.catalogVersion == catalogVersion, let id = entry.catalogID,
                  let item = exercise(id: id), let role = entry.role else { return false }
            return item.template(role: role, experience: context.experience) != nil
        } }) else {
            throw ServiceError.invalidInput("计划含自定义或暂不可解析的历史动作，无法自动估时；请保留现有计划，重新生成草案后再使用自动替换。")
        }
        guard plan.sessions.allSatisfy({ $0.exercises.allSatisfy { estimatedSeconds(for: $0, context: context) != nil } }) else {
            throw ServiceError.invalidInput("自定义用量无法自动估时，请先恢复模板用量，再使用自动替换。")
        }
    }
    public func validateGeneratedPlan(_ plan: TrainingPlan, preferences: UserPreferences) throws {
        if catalogVersion == 2, plan.generationContext?.programKind != "lowerBodyBasics" { throw ServiceError.invalidResponse }
        let expected = try PlanGenerationContext(preferences: preferences, programKind: plan.generationContext?.programKind)
        guard plan.status == .draft, plan.generationContext == expected else { throw ServiceError.invalidResponse }
        try validateReplacement(in: plan)
    }
    public func demoPlan(preferences: UserPreferences, today: Date, calendar: Calendar) throws -> TrainingPlan {
        if catalogVersion == 2 { return try lowerBodyDemoPlan(preferences: preferences, today: today, calendar: calendar) }
        let context = try PlanGenerationContext(preferences: preferences)
        try validateContext(context)
        func choices(_ role: String) -> [CatalogExercise] {
            eligibleExercises(context: context, role: role).sorted {
                let a = $0.template(role: role, experience: context.experience)!.estimatedSeconds
                let b = $1.template(role: role, experience: context.experience)!.estimatedSeconds
                return a == b ? $0.id < $1.id : a < b
            }
        }
        var selected: [Exercise] = []
        for role in Self.roles {
            guard let item = choices(role).first(where: { item in !selected.contains { $0.catalogID == item.id } }) else {
                throw ServiceError.invalidInput("这些条件下暂时没有完整的审核模板组合，请调整可用器械或时间。")
            }
            selected.append(try makeExercise(id: item.id, role: role, context: context))
        }
        // Fixed deterministic demo; it is not a personal assessment or real AI response.
        let seconds = selected.reduce(0) { $0 + (estimatedSeconds(for: $1, context: context) ?? 0) }
        guard seconds <= context.availableMinutes * 60 else {
            throw ServiceError.invalidInput("完整模板组合超出可用时间，请增加训练时长或调整器械。")
        }
        let sessions = [0, 2, 4].map { offset in
            var entries = selected
            for i in entries.indices { entries[i].id = UUID() }
            return WorkoutSession(title: "基础练习 · 演示", scheduledAt: calendar.date(byAdding: .day, value: offset, to: today)!,
                                  minutes: preferences.availableMinutes, exercises: entries)
        }
        var plan = TrainingPlan(title: "\(preferences.goal) · 演示草案", sessions: sessions)
        plan.generationContext = context
        try validateGeneratedPlan(plan, preferences: preferences)
        return plan
    }
    private func checkIntegrity() throws {
        guard [1, 2].contains(schemaVersion), schemaVersion == catalogVersion,
              Set(equipment.map(\.id)).count == equipment.count,
              Set(exercises.map(\.id)).count == exercises.count else { throw ServiceError.invalidResponse }
        if catalogVersion == 2 {
            let definitions = conditions ?? []
            guard !definitions.isEmpty, Set(definitions.map(\.id)).count == definitions.count,
                  definitions.allSatisfy({ $0.version > 0 && !$0.title.isEmpty && !$0.detail.isEmpty }) else { throw ServiceError.invalidResponse }
            let conditionIDs = Set(definitions.map(\.id)), exerciseIDs = Set(exercises.map(\.id))
            guard exercises.allSatisfy({ Set($0.requiredConditions ?? []).isSubset(of: conditionIDs) && Set($0.replacementIDs ?? []).isSubset(of: exerciseIDs) }) else { throw ServiceError.invalidResponse }
        }
        let knownEquipment = Set(equipment.map(\.id))
        var references = Set<TeachingReference>(), templateIDs = Set<String>()
        for item in exercises {
            guard ["approved", "learningOnly"].contains(item.status), !item.id.isEmpty, !item.name.isEmpty,
                  Set(item.equipment).isSubset(of: knownEquipment) else { throw ServiceError.invalidResponse }
            for reference in [item.defaultTeaching] + item.otherTeachings {
                guard references.insert(reference).inserted else { throw ServiceError.invalidResponse }
            }
            if item.status == "approved" {
                guard !item.templates.isEmpty, !item.experiences.isEmpty,
                      !item.review.basis.isEmpty else { throw ServiceError.invalidResponse }
            }
            for template in item.templates {
                guard templateIDs.insert(template.id).inserted, Self.roles.contains(template.role),
                      template.estimatedSeconds > 0, template.restSeconds >= 0, !template.prescription.isEmpty,
                      !template.experiences.isEmpty,
                      Set(template.experiences).isSubset(of: Set(item.experiences)) else { throw ServiceError.invalidResponse }
                for experience in template.experiences {
                    guard item.template(role: template.role, experience: experience) != nil else { throw ServiceError.invalidResponse }
                }
            }
        }
        for item in learningOnly {
            guard references.insert(item.teaching).inserted, !item.reason.isEmpty else { throw ServiceError.invalidResponse }
        }
    }
}

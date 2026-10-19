import Foundation

public extension ExerciseCatalog {
    static let lowerBodyWarmupIDs: Set<String> = ["march-in-place", "walk", "unloaded-hip-hinge"]
    static let lowerBodyCooldownIDs: Set<String> = ["walk", "functional-cooldown-calf-stretch", "functional-cooldown-hamstring-stretch"]
    static let lowerBodySlots: Set<String> = ["kneeDominant", "hipDominant", "kneeFlexion", "calf", "hipAdduction", "hipAbduction", "kneeExtension"]
    static func forPlan(_ plan: TrainingPlan) throws -> Self {
        try load(version: plan.generationContext?.rulesVersion == 2 || plan.sessions.flatMap(\.exercises).contains(where: { $0.catalogVersion == 2 }) ? 2 : 1)
    }
    /// Project only the generation request onto this catalog's capabilities.
    /// The caller retains complete equipment and future condition preference records.
    func preferencesForGeneration(_ preferences: UserPreferences) -> UserPreferences {
        if catalogVersion == 2 {
            var result = preferences
            let knownConditions = Set((conditions ?? []).map(\.id))
            result.movementConditions = preferences.movementConditions?.filter { knownConditions.contains($0.conditionID) }
            return result
        }
        guard catalogVersion == 1, let ids = preferences.availableEquipmentIDs,
              let current = try? Self.load(version: 2) else { return preferences }
        let historical = Set(equipment.map(\.id)), known = Set(current.equipment.map(\.id))
        var result = preferences
        result.availableEquipmentIDs = ids.filter { historical.contains($0) || !known.contains($0) }
        return result
    }
    func replacing(in plan: TrainingPlan, sessionID: UUID, entryID: UUID, candidateID: String, currentAnswers: [MovementConditionAnswer]? = nil) throws -> TrainingPlan {
        guard var context = plan.generationContext,
              let sessionIndex = plan.sessions.firstIndex(where: { $0.id == sessionID }),
              let exerciseIndex = plan.sessions[sessionIndex].exercises.firstIndex(where: { $0.id == entryID }) else {
            throw ServiceError.invalidInput("这份旧计划缺少生成条件，请重新生成草案后再替换动作。")
        }
        if self.catalogVersion == 2 { context.movementConditions = currentAnswers ?? [] }
        let original = plan.sessions[sessionIndex].exercises[exerciseIndex]
        var proposed = plan
        if self.catalogVersion == 2 {
            // Existing entries retain their generation-time conditions; only the new
            // candidate must satisfy current confirmations. This permits repairing
            // a historical plan one slot at a time after conditions are revoked.
            var snapshot = plan.generationContext!
            let required = Set(self.exercise(id: candidateID)?.requiredConditions ?? [])
            var answers = snapshot.movementConditions ?? []
            answers.removeAll { required.contains($0.conditionID) }
            answers += (currentAnswers ?? []).filter { required.contains($0.conditionID) }
            snapshot.movementConditions = answers.sorted { $0.conditionID < $1.conditionID }
            proposed.generationContext = snapshot
        }
        proposed.sessions[sessionIndex].exercises[exerciseIndex] = try self.replacing(original, with: candidateID, context: context)
        try self.validateReplacement(in: proposed)
        return proposed
    }
    func conditionsSatisfied(for exercise: CatalogExercise, answers: [MovementConditionAnswer]?) -> Bool {
        (exercise.requiredConditions ?? []).allSatisfy { id in
            guard let condition = conditions?.first(where: { $0.id == id }) else { return false }
            return answers?.contains { $0.conditionID == id && $0.version == condition.version && $0.status == .ready } == true
        }
    }
    func relevantConditions(experience: String, equipmentIDs: [String]) -> [CatalogCondition] {
        let equipment = Set(equipmentIDs)
        let ids = Set(exercises.filter { $0.trainingSlot != nil && $0.status == "approved" && $0.experiences.contains(experience) && Set($0.equipment).isSubset(of: equipment) }.flatMap { $0.requiredConditions ?? [] })
        return (conditions ?? []).filter { ids.contains($0.id) }
    }
    func missingConditions(for exercise: CatalogExercise, answers: [MovementConditionAnswer]?) -> [CatalogCondition] {
        (conditions ?? []).filter { condition in
            (exercise.requiredConditions ?? []).contains(condition.id) && answers?.contains { $0.conditionID == condition.id && $0.version == condition.version && $0.status == .ready } != true
        }
    }
    func validateLowerBodyDates(_ plan: TrainingPlan, calendar: Calendar = .current) throws {
        guard plan.sessions.count == 2 else { throw ServiceError.invalidInput("下肢基础计划每周安排两次训练。") }
        let dates = plan.sessions.map { calendar.startOfDay(for: $0.scheduledAt) }.sorted()
        let gap = calendar.dateComponents([.day], from: dates[0], to: dates[1]).day ?? 0
        guard gap >= 2 else { throw ServiceError.invalidInput("两次下肢训练之间至少留出一个完整休息日。") }
    }
    func validateLowerBodySession(_ session: WorkoutSession, context: PlanGenerationContext) throws {
        guard session.exercises.contains(where: { $0.role == "warmup" && exercise(id: $0.catalogID ?? "")?.trainingSlot != "preparation" }) else {
            throw ServiceError.invalidInput("髋铰链学习不能代替升温热身，请保留一个基础热身动作。")
        }
        let main = session.exercises.filter { $0.role == "main" }
        let slots = main.compactMap { exercise(id: $0.catalogID ?? "")?.trainingSlot }
        guard slots.count == main.count, slots.filter({ $0 == "kneeDominant" }).count == 1,
              slots.filter({ $0 == "hipDominant" }).count == 1, (2...4).contains(slots.count),
              Self.lowerBodySlots.isSuperset(of: slots) else {
            throw ServiceError.invalidInput("每次下肢训练需要一个膝主导和一个髋主导主练，辅助动作不能代替它们。")
        }
        guard Set(slots.prefix(2)) == Set(["kneeDominant", "hipDominant"]),
              !slots.dropFirst(2).contains(where: { $0 == "kneeDominant" || $0 == "hipDominant" }) else {
            throw ServiceError.invalidInput("先安排膝主导与髋主导主练，再安排辅助动作。")
        }
        guard Set(slots.dropFirst(2)).count == slots.dropFirst(2).count else {
            throw ServiceError.invalidInput("辅助动作请覆盖不同训练用途，不要同时安排同类动作的替代变式。")
        }
        let sets = main.reduce(0) { sum, entry in
            guard let item = exercise(id: entry.catalogID ?? ""), let template = item.template(role: "main", experience: context.experience) else { return sum }
            return sum + (template.sets ?? 0) * (template.perSide ? 2 : 1)
        }
        guard sets <= (context.experience == "初学者" ? 8 : 10) else { throw ServiceError.invalidInput("工作组总数超过这份基础计划的上限，请减少辅助动作。") }
    }
    func sessionEstimatedSeconds(_ entries: [Exercise], context: PlanGenerationContext) -> Int? {
        let times = entries.compactMap { estimatedSeconds(for: $0, context: context) }
        guard times.count == entries.count else { return nil }
        return times.reduce(0, +) + (catalogVersion == 2 ? max(0, entries.count - 1) * 30 : 0)
    }
    func lowerBodyDemoPlan(preferences: UserPreferences, today: Date, calendar: Calendar) throws -> TrainingPlan {
        let context = try PlanGenerationContext(preferences: preferences, programKind: "lowerBodyBasics")
        try validateContext(context)
        func options(role: String, slot: String? = nil) -> [CatalogExercise] {
            eligibleExercises(context: context, role: role).filter { slot == nil || $0.trainingSlot == slot }.sorted {
                let a = $0.template(role: role, experience: context.experience)!.estimatedSeconds
                let b = $1.template(role: role, experience: context.experience)!.estimatedSeconds
                return a == b ? $0.id < $1.id : a < b
            }
        }
        var selected: [Exercise]?
        // Enumerate complete fixed-template combinations rather than a greedy pick.
        outer: for w in options(role: "warmup") where w.trainingSlot != "preparation" {
            for k in options(role: "main", slot: "kneeDominant") {
                for h in options(role: "main", slot: "hipDominant") {
                    for c in options(role: "cooldown") where Set([w.id,k.id,h.id,c.id]).count == 4 {
                        let entries = try [(w,"warmup"),(k,"main"),(h,"main"),(c,"cooldown")].map { try makeExercise(id: $0.0.id, role: $0.1, context: context) }
                        if let seconds = sessionEstimatedSeconds(entries, context: context), seconds <= context.availableMinutes * 60 {
                            selected = entries; break outer
                        }
                    }
                }
            }
        }
        guard var entries = selected else { throw ServiceError.invalidInput("当前器材、动作条件或时间不能组成完整下肢计划。请确认基础蹲起、地面活动或髋铰链条件，或增加可用时间。") }
        // Optional auxiliaries are added only after the required pair fits.
        for item in options(role: "main") where !["kneeDominant","hipDominant"].contains(item.trainingSlot ?? "") {
            let candidate = try makeExercise(id: item.id, role: "main", context: context)
            var proposed = entries; proposed.insert(candidate, at: proposed.count - 1)
            let session = WorkoutSession(title: "下肢基础", scheduledAt: today, minutes: context.availableMinutes, exercises: proposed)
            if let seconds = sessionEstimatedSeconds(proposed, context: context), seconds <= context.availableMinutes * 60,
               (try? validateLowerBodySession(session, context: context)) != nil {
                entries = proposed
            }
            if entries.filter({ $0.role == "main" }).count == 4 { break }
        }
        let sessions = [0,3].map { offset in
            var copy = entries; for i in copy.indices { copy[i].id = UUID() }
            return WorkoutSession(title: "下肢基础 · 演示", scheduledAt: calendar.date(byAdding: .day, value: offset, to: today)!, minutes: context.availableMinutes, exercises: copy)
        }
        var plan = TrainingPlan(title: "下肢基础 · 演示草案", sessions: sessions); plan.generationContext = context
        try validateGeneratedPlan(plan, preferences: preferences)
        return plan
    }
    func selectionReason(for entry: Exercise) -> String? {
        guard let item = exercise(id: entry.catalogID ?? ""), let slot = item.trainingSlot else { return nil }
        let labels = ["kneeDominant":"承担膝主导蹲起训练", "hipDominant":"承担髋主导训练", "kneeFlexion":"补充腿后侧屈膝训练", "calf":"补充小腿训练", "hipAdduction":"补充髋内收训练", "hipAbduction":"补充髋外展训练", "kneeExtension":"补充膝伸展训练", "preparation":"练习主练所需动作模式"]
        return labels[slot].map { "\($0)；按已确认的器材、动作条件和基础模板安排。" }
    }
}

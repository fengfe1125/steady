import SwiftUI
import SteadyCore

struct MovementConditionsView: View {
    @Binding var preferences: UserPreferences
    var conditionIDs: Set<String>? = nil
    var onConfirm: (() -> Bool)? = nil
    @Environment(\.dismiss) private var dismiss
    private let catalog = try? ExerciseCatalog.load(version: 2)
    private var conditions: [CatalogCondition] {
        guard let catalog else { return [] }
        if let conditionIDs { return (catalog.conditions ?? []).filter { conditionIDs.contains($0.id) } }
        return catalog.relevantConditions(experience: preferences.experience, equipmentIDs: preferences.availableEquipmentIDs ?? [])
    }
    private func status(_ condition: CatalogCondition) -> String {
        preferences.movementConditions?.first { $0.conditionID == condition.id && $0.version == condition.version }?.status.rawValue ?? "unanswered"
    }
    private func update(_ condition: CatalogCondition, value: String) {
        var answers = preferences.movementConditions ?? []
        answers.removeAll { $0.conditionID == condition.id }
        if let status = MovementConditionStatus(rawValue: value) {
            answers.append(.init(conditionID: condition.id, version: condition.version, status: status))
        }
        preferences.movementConditions = answers.sorted { $0.conditionID < $1.conditionID }
    }
    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("按当前能完成的情况选择，不确定时先看教学。看完教学不会自动确认能力。")
                    Text("这是动作自检，不是专业动作评估。不能完成的动作会排除，并优先使用已确认的基础替代。")
                        .font(.footnote).foregroundStyle(SteadyTheme.secondary)
                }
                if catalog == nil { Text("动作条件目录暂时无法加载，请稍后重试。") }
                ForEach(conditions) { condition in
                    Section(condition.title) {
                        Text(condition.detail).font(.subheadline)
                        Picker("当前情况", selection: Binding(get: { status(condition) }, set: { update(condition, value: $0) })) {
                            Text("未确认").tag("unanswered")
                            ForEach(MovementConditionStatus.allCases, id: \.rawValue) { Text($0.title).tag($0.rawValue) }
                        }.pickerStyle(.navigationLink).accessibilityIdentifier("movementCondition_\(condition.id)")
                            .accessibilityValue(MovementConditionStatus(rawValue: status(condition))?.title ?? "未确认")
                        NavigationLink { ExerciseTeachingDestination(reference: condition.teaching) } label: {
                            Label("先看动作教学", systemImage: "play.circle")
                        }.accessibilityIdentifier("conditionTeaching_\(condition.id)")
                    }
                }
                if conditions.isEmpty && catalog != nil { Text("当前场景暂无需要确认的动作条件，请先选择可用器材。") }
            }.journalSurface().navigationTitle("确认动作条件").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    CloseSheet()
                    ToolbarItem(placement: .confirmationAction) {
                        Button("保存") { if onConfirm?() ?? true { dismiss() } }
                            .disabled(catalog == nil).accessibilityIdentifier("saveMovementConditions")
                    }
                }
        }.tint(SteadyTheme.primary)
    }
}

struct LowerBodyPlanNote: View {
    let plan: TrainingPlan
    var currentAnswers: [MovementConditionAnswer]?
    private var changed: Bool {
        guard let catalog = try? ExerciseCatalog.forPlan(plan) else { return false }
        return plan.sessions.flatMap(\.exercises).contains { entry in
            guard let item = catalog.exercise(id: entry.catalogID ?? "") else { return false }
            return !catalog.conditionsSatisfied(for: item, answers: currentAnswers)
        }
    }
    var body: some View {
        if plan.generationContext?.programKind == "lowerBodyBasics" {
            Text("一周两次基础训练，间隔至少一个休息日；先做膝主导与髋主导，再做辅助。用量来自固定基础模板。")
                .font(.footnote).foregroundStyle(SteadyTheme.secondary)
            if changed {
                Text("当前动作条件与生成时不同，请重新检查这些动作。历史计划仍保留；替换时采用当前已确认条件。")
                    .font(.footnote).foregroundStyle(.orange).accessibilityIdentifier("movementConditionsChanged")
            }
        }
    }
}

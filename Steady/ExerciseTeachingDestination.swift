import SwiftUI
import SteadyCore

/// One route from a saved catalog identity to the existing offline teaching screens.
struct ExerciseTeachingDestination: View {
    let reference: TeachingReference

    var body: some View {
        Group {
            if reference.kind == "equipment", let lesson = EquipmentLessonID(rawValue: reference.lessonID) {
                EquipmentLessonView(lesson: lesson)
            } else if reference.kind == "collection", let value = reference.topic,
                      let topic = AnimatedTrainingTopic(rawValue: value), let bundle = try? topic.load(),
                      let lesson = bundle.collection.lesson(id: reference.lessonID),
                      let animation = bundle.animations[lesson.id], let url = bundle.artworkURL(for: lesson.id) {
                AnimatedTrainingLessonView(lesson: lesson, animation: animation, resourceURL: url, runtime: bundle.runtime)
            } else {
                ContentUnavailableView("这节教学暂时无法打开", systemImage: "book.closed",
                    description: Text("训练文字仍然保留，请返回查看。"))
            }
        }
    }
}

struct ExerciseTeachingLink: View {
    let exercise: Exercise
    var identifier = "exerciseLesson"
    private let catalog = try? ExerciseCatalog.load()

    var body: some View {
        if let reference = catalog?.teaching(for: exercise) {
            NavigationLink { ExerciseTeachingDestination(reference: reference) } label: {
                Label("预览动作教学", systemImage: "play.circle")
            }.accessibilityIdentifier(identifier).accessibilityLabel("预览动作教学：\(exercise.name)")
        } else if exercise.catalogID == nil, let lesson = EquipmentLessonID.matching(exerciseName: exercise.name) {
            NavigationLink { EquipmentLessonView(lesson: lesson) } label: {
                Label("预览动作教学", systemImage: "play.circle")
            }.accessibilityIdentifier(identifier).accessibilityLabel("预览动作教学：\(exercise.name)")
        } else {
            Text("此动作暂无已关联的教学").font(.caption).foregroundStyle(SteadyTheme.secondary)
                .accessibilityIdentifier("exerciseTeachingUnavailable")
        }
    }
}

struct ExerciseReplacementRequest: Identifiable {
    let sessionID: UUID
    let exercise: Exercise
    var id: UUID { exercise.id }
}

/// Validate a complete proposed plan before a caller changes local or persisted state.
enum PlanExerciseEditing {
    static func replacing(in plan: TrainingPlan, request: ExerciseReplacementRequest, candidateID: String, currentAnswers: [MovementConditionAnswer]? = nil) throws -> TrainingPlan {
        try ExerciseCatalog.forPlan(plan).replacing(in: plan, sessionID: request.sessionID, entryID: request.exercise.id, candidateID: candidateID, currentAnswers: currentAnswers)
    }
}

struct ExerciseReplacementSheet: View {
    @Bindable var model: AppModel
    let exercise: Exercise
    let context: PlanGenerationContext
    let replace: (String, [MovementConditionAnswer]?) throws -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var error: String?
    @State private var conditionPreferences: UserPreferences
    @State private var showingConditions = false
    @State private var pendingConditions: [MovementConditionAnswer]?
    @State private var conditionsToConfirm: Set<String> = []
    private let catalog: ExerciseCatalog?
    init(model: AppModel, exercise: Exercise, context: PlanGenerationContext, replace: @escaping (String, [MovementConditionAnswer]?) throws -> Void) {
        self.model = model; self.exercise = exercise; self.context = context; self.replace = replace
        catalog = try? ExerciseCatalog.load(version: exercise.catalogVersion ?? 1)
        _conditionPreferences = State(initialValue: model.journal.preferences)
    }
    private var effectiveContext: PlanGenerationContext {
        var current = context
        if catalog?.catalogVersion == 2 { current.movementConditions = model.journal.preferences.movementConditions ?? [] }
        return current
    }
    private var availableCandidates: [CatalogExercise] {
        guard let catalog, let original = catalog.exercise(id: exercise.catalogID ?? ""), let role = exercise.role else { return [] }
        if catalog.catalogVersion == 1 { return catalog.replacementCandidates(for: exercise, context: effectiveContext) }
        return catalog.exercises.filter {
            $0.id != original.id && (original.replacementIDs ?? []).contains($0.id) && $0.status == "approved" && $0.experiences.contains(context.experience)
            && Set($0.equipment).isSubset(of: Set(context.availableEquipmentIDs)) && $0.template(role: role, experience: context.experience) != nil
        }
    }
    private var candidates: [CatalogExercise] {
        availableCandidates.filter { catalog?.conditionsSatisfied(for: $0, answers: effectiveContext.movementConditions) == true }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("替换「\(exercise.name)」")
                    Text("根据这份计划的器材、经验和动作用途选择。先看教学，再确认替换；训练用量会使用对应模板。")
                        .font(.footnote).foregroundStyle(SteadyTheme.secondary)
                    if catalog?.catalogVersion == 2, catalog?.exercise(id: exercise.catalogID ?? "")?.trainingSlot == "hipDominant" {
                        Text("罗马尼亚硬拉练习负重髋铰链，臀桥在地面练习髋伸展。两者可承担基础计划的髋主导位置，但训练方式不完全等效。")
                            .font(.footnote).foregroundStyle(SteadyTheme.secondary)
                    }
                }
                if candidates.isEmpty {
                    Section {
                        Text("暂时没有合适的替代动作")
                        Text("可以保留当前动作，或调整器材与时间后重新生成草案。")
                            .font(.footnote).foregroundStyle(SteadyTheme.secondary)
                    }
                }
                // Keep each teaching route in one stable row while confirmations change.
                ForEach(availableCandidates, id: \.id) { candidate in
                    Section(candidate.name) {
                        if let catalog {
                            let names = candidate.equipment.compactMap { id in catalog.equipment.first { $0.id == id }?.name }
                            Text(names.isEmpty ? "无需额外器械" : names.joined(separator: "、"))
                                .font(.footnote).foregroundStyle(SteadyTheme.secondary)
                        }
                        NavigationLink { ExerciseTeachingDestination(reference: candidate.defaultTeaching) } label: {
                            Label("预览动作教学", systemImage: "play.circle")
                        }.accessibilityIdentifier("replacementPreview_\(candidate.id)")
                        if catalog?.conditionsSatisfied(for: candidate, answers: effectiveContext.movementConditions) == true {
                            Button("替换为\(candidate.name)") {
                                do { try replace(candidate.id, effectiveContext.movementConditions); dismiss() }
                                catch { self.error = error.localizedDescription }
                            }.accessibilityIdentifier("replaceWith_\(candidate.id)")
                        } else {
                            if let catalog {
                                Text(catalog.missingConditions(for: candidate, answers: effectiveContext.movementConditions).map(\.title).joined(separator: "、"))
                                    .font(.footnote).foregroundStyle(SteadyTheme.secondary)
                            }
                            Button("确认这个动作的条件") {
                                conditionPreferences = model.journal.preferences
                                conditionsToConfirm = Set(candidate.requiredConditions ?? [])
                                showingConditions = true
                            }.accessibilityIdentifier("replacementConditions_\(candidate.id)")
                        }
                    }
                }
            }.journalSurface().navigationTitle("选择替代动作").navigationBarTitleDisplayMode(.inline)
                .toolbar { CloseSheet() }
                .sheet(isPresented: $showingConditions, onDismiss: {
                    guard let pendingConditions else { return }
                    self.pendingConditions = nil
                    var saved = model.journal.preferences; saved.movementConditions = pendingConditions
                    if !model.savePreferences(saved) { error = model.error ?? "动作条件保存失败，请重新确认。" }
                }) {
                    MovementConditionsView(preferences: $conditionPreferences, conditionIDs: conditionsToConfirm) {
                        pendingConditions = conditionPreferences.movementConditions ?? []
                        return true
                    }
                }
                .alert("暂时无法替换", isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) {
                    Button("知道了", role: .cancel) { error = nil }
                } message: { Text(error ?? "").accessibilityIdentifier("replacementError") }
        }
    }
}

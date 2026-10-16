import SwiftUI
import SteadyCore

struct PlanLauncher: View {
    @Bindable var model: AppModel
    let title: String
    var fullWidth = false
    var programKind: String? = nil
    @State private var showing = false
    var body: some View {
        Button { model.draft = nil; showing = true } label: {
            Text(title).frame(maxWidth: fullWidth ? .infinity : nil)
        }.disabled(model.busy != nil)
            .accessibilityIdentifier(programKind == nil ? "planLauncher" : "lowerBodyLauncher")
            .sheet(isPresented: $showing) { PlanFormView(model: model, programKind: programKind) }
    }
}

struct PlanFormView: View {
    @Bindable var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var preferences: UserPreferences
    @State private var showingConditions = false
    let programKind: String?
    init(model: AppModel, programKind: String? = nil) {
        self.programKind = programKind
        self.model = model
        _preferences = State(initialValue: model.journal.preferences)
    }
    var body: some View {
        NavigationStack {
            Group {
                if let draft = model.draft {
                    DraftView(model: model, initialPlan: draft) { dismiss() }
                } else {
                    Form {
                        Section { ModeBadge(isDemo: model.isDemo); Text(model.isDemo ? "使用本机动作目录生成演示草案；先确认可用器材，再预览与调整动作。" : "AI 根据目标、经验、器械和时间整理一周草案。有运动限制时不自动编排，确认前可修改。").font(.footnote) }
                        PreferenceFields(preferences: $preferences, catalogVersion: programKind == nil ? 1 : 2) {
                            var saved = model.journal.preferences
                            saved.equipment = preferences.equipment
                            saved.availableEquipmentIDs = preferences.availableEquipmentIDs
                            _ = model.savePreferences(saved)
                        }
                        if programKind == "lowerBodyBasics" {
                            Section("基础动作条件") {
                                Button("确认或修改动作条件") { showingConditions = true }
                                    .accessibilityIdentifier("chooseMovementConditions")
                                    .sheet(isPresented: $showingConditions) {
                                        MovementConditionsView(preferences: $preferences) {
                                            var saved = model.journal.preferences
                                            saved.movementConditions = preferences.movementConditions
                                            return model.savePreferences(saved)
                                        }
                                    }
                                Text("可以选择不确定或不能完成。计划只采用已确认条件的动作；无法组成膝主导与髋主导组合时会明确提示。")
                                    .font(.footnote).foregroundStyle(SteadyTheme.secondary)
                            }
                        }
                        Section {
                            RequestStatus(model: model)
                            Button(model.isDemo ? "生成草案（演示）" : "生成训练草案") { model.generatePlan(preferences, programKind: programKind) }
                                .disabled(model.busy != nil || preferences.goal.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || preferences.availableEquipmentIDs == nil)
                                .accessibilityIdentifier("generatePlan")
                        }
                    }.journalSurface().navigationTitle(programKind == "lowerBodyBasics" ? "下肢基础计划" : "安排适合你的训练").navigationBarTitleDisplayMode(.inline)
                }
            }
            .toolbar { CloseSheet() }
        }.tint(SteadyTheme.primary)
            .interactiveDismissDisabled(model.busy != nil)
            .onDisappear { if model.busy != nil { model.cancel() } }
    }
}

struct PreferenceFields: View {
    @Binding var preferences: UserPreferences
    var catalogVersion: Int = 1
    var equipmentConfirmed: (() -> Void)? = nil
    @State private var showingEquipment = false
    var body: some View {
        Section("目标与经验") {
            TextField("你的目标", text: $preferences.goal)
            Picker("运动经验", selection: $preferences.experience) {
                ForEach(["初学者", "偶尔运动", "规律运动"], id: \.self) { Text($0) }
            }
            Picker("训练场景", selection: Binding(get: { preferences.equipment }, set: { value in
                if preferences.equipment != value {
                    preferences.equipment = value
                    preferences.availableEquipmentIDs = nil
                }
            })) {
                ForEach(["自重", "哑铃", "健身房"], id: \.self) { Text($0) }
            }.pickerStyle(.navigationLink).accessibilityIdentifier("equipmentScene")
        }
        Section("本次可用器材") {
            Button { showingEquipment = true } label: {
                HStack {
                    Text(preferences.availableEquipmentIDs == nil ? "确认具体器材" : "修改已确认器材")
                    Spacer()
                    if let selected = preferences.availableEquipmentIDs {
                        Text(selected.isEmpty ? "仅自重" : "\(selected.count) 项").foregroundStyle(SteadyTheme.secondary)
                    }
                }
            }.accessibilityIdentifier("chooseEquipment")
                .sheet(isPresented: $showingEquipment) {
                    EquipmentSelectionView(preferences: $preferences, catalogVersion: catalogVersion, onConfirm: equipmentConfirmed)
                }
            Text(preferences.availableEquipmentIDs == nil ? "选择你确实能使用的器材。没有器材也需要确认一次。" : "计划只会使用已确认的器材。更换训练场景后需要重新确认。")
                .font(.footnote).foregroundStyle(SteadyTheme.secondary)
        }
        Section("可用时间与限制") {
            Stepper("每次 \(preferences.availableMinutes) 分钟", value: $preferences.availableMinutes, in: 10...90, step: 5)
            TextField("运动限制（如有，请填写）", text: $preferences.limitations, axis: .vertical)
            Text("这不是医疗评估。有疼痛或运动限制时请先咨询专业人士。").font(.footnote).foregroundStyle(SteadyTheme.secondary)
        }
    }
}

struct EquipmentSelectionView: View {
    @Binding var preferences: UserPreferences
    @Environment(\.dismiss) private var dismiss
    @State private var selected: Set<String>
    @State private var searchText = ""
    private let catalog: ExerciseCatalog?
    let onConfirm: (() -> Void)?

    init(preferences: Binding<UserPreferences>, catalogVersion: Int = 1, onConfirm: (() -> Void)? = nil) {
        catalog = try? ExerciseCatalog.load(version: 2)
        self.onConfirm = onConfirm
        _preferences = preferences
        _selected = State(initialValue: Set(preferences.wrappedValue.availableEquipmentIDs ?? []))
    }
    private var matchingEquipment: [CatalogEquipment] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        return (catalog?.equipment ?? []).filter { query.isEmpty || $0.name.localizedStandardContains(query) }
    }

    @ViewBuilder
    private func equipmentSection(_ title: String, items: [CatalogEquipment]) -> some View {
        if !items.isEmpty {
            Section("\(title)（\(items.count)）") {
                ForEach(items) { equipment in
                    Toggle(equipment.name, isOn: Binding(get: { selected.contains(equipment.id) }, set: { enabled in
                        if enabled { selected.insert(equipment.id) } else { selected.remove(equipment.id) }
                    })).accessibilityIdentifier("equipmentOption_\(equipment.id)")
                }
            }
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("已列出全部健身房器械、哑铃和基础器材，不受训练场景限制。只勾选本次确实可以使用的器材。")
                        .font(.subheadline).foregroundStyle(SteadyTheme.secondary)
                    Text("已选择 \(selected.count) 项")
                        .font(.subheadline).accessibilityIdentifier("equipmentSelectionCount")
                    Button("仅自重，无额外器械") { selected = [] }
                        .accessibilityIdentifier("bodyweightOnly")
                }
                if catalog != nil {
                    // Scenes describe where equipment can be used; they must not hide
                    // existing gym equipment from a user confirming availability.
                    let items = matchingEquipment
                    equipmentSection("健身房器械与附件", items: items.filter { !$0.scenes.contains("自重") && !$0.scenes.contains("哑铃") })
                    equipmentSection("哑铃与训练凳", items: items.filter { !$0.scenes.contains("自重") && $0.scenes.contains("哑铃") })
                    equipmentSection("基础器材与支撑", items: items.filter { $0.scenes.contains("自重") })
                    if items.isEmpty {
                        Text("没有匹配的器材，请试试其他名称。")
                            .foregroundStyle(SteadyTheme.secondary)
                    }
                } else {
                    Text("器材目录暂时无法加载，请稍后重试。")
                }
            }.journalSurface().navigationTitle("确认可用器材").navigationBarTitleDisplayMode(.inline)
                .searchable(text: $searchText, placement: .navigationBarDrawer(displayMode: .always), prompt: "搜索器材，如推胸机、腿举机")
                .toolbar {
                    CloseSheet()
                    ToolbarItem(placement: .confirmationAction) {
                        Button("确认") { preferences.availableEquipmentIDs = selected.sorted(); onConfirm?(); dismiss() }
                            .disabled(catalog == nil).accessibilityIdentifier("confirmEquipment")
                    }
                }
        }
    }
}

struct DraftView: View {
    @Bindable var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var plan: TrainingPlan
    @State private var replacement: ExerciseReplacementRequest?
    var onConfirm: (() -> Void)?
    init(model: AppModel, initialPlan: TrainingPlan, onConfirm: (() -> Void)? = nil) {
        self.model = model; _plan = State(initialValue: initialPlan); self.onConfirm = onConfirm
    }
    var body: some View {
        Form {
            Section { ModeBadge(isDemo: model.isDemo); Text("草案尚未加入正式计划。可以调整每次日期、时长和动作，确认后才生效。").font(.subheadline) }
            Section { LowerBodyPlanNote(plan: plan, currentAnswers: model.journal.preferences.movementConditions) }
            ForEach($plan.sessions) { $session in
                Section(session.title) {
                    DatePicker("训练日期", selection: $session.scheduledAt, displayedComponents: .date)
                    Stepper("\(session.minutes)分钟", value: $session.minutes, in: 10...(plan.generationContext?.availableMinutes ?? 90), step: 5)
                    ForEach($session.exercises) { $exercise in
                        PlanExerciseEditor(exercise: $exercise, context: plan.generationContext) {
                            replacement = ExerciseReplacementRequest(sessionID: session.id, exercise: exercise)
                        }
                    }
                    if plan.generationContext == nil { LegacyReplacementNotice() }
                }
            }
            Section {
                RequestStatus(model: model)
                Button("保存草案修改") { if model.savePlan(plan) { model.draft = plan; model.notice = "草案修改已保存在本机。" } }
                Button("确认加入本周") {
                    if model.confirmDraft(plan) { if let onConfirm { onConfirm() } else { dismiss() } }
                }.accessibilityIdentifier("confirmPlan")
            }
        }.scrollDismissesKeyboard(.immediately).journalSurface().navigationTitle("你的训练草案").navigationBarTitleDisplayMode(.inline)
            .sheet(item: $replacement) { request in
                if let context = plan.generationContext {
                    ExerciseReplacementSheet(model: model, exercise: request.exercise, context: context) { candidateID, answers in
                        plan = try PlanExerciseEditing.replacing(in: plan, request: request, candidateID: candidateID, currentAnswers: answers)
                    }
                }
            }
    }
}

struct PlansView: View {
    @Bindable var model: AppModel
    @Environment(\.dynamicTypeSize) private var typeSize
    private var drafts: [TrainingPlan] { model.plans.filter { $0.status == .draft } }

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 24) {
                    HStack(spacing: 18) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("给自己一点时间")
                                .font(JournalFonts.handwriting(29))
                                .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
                                .foregroundStyle(SteadyTheme.primary)
                            Text("安排可以调整，按自己的节奏来")
                                .font(.subheadline).foregroundStyle(SteadyTheme.secondary)
                        }.frame(maxWidth: .infinity, alignment: .leading)
                        SproutView(expression: .happy)
                            .frame(width: 58, height: 76)
                            // Keep the hop and tilt inside the native List row's bounds.
                            .padding(.horizontal, 8)
                            .padding(.vertical, 12)
                    }
                    Divider().overlay(SteadyTheme.line)
                }
                .padding(.top, 8)
                .listRowInsets(EdgeInsets(top: 0, leading: 4, bottom: 0, trailing: 4))
                .listRowBackground(Color.clear).listRowSeparator(.hidden)
            }
            if model.workoutLoopEnabled {
                Section("开始练起来") {
                    NavigationLink("开始训练 / 我的训练模板") { WorkoutHubView(model: model) }.accessibilityIdentifier("workoutHub")
                    if let log = model.ongoingWorkout { NavigationLink("继续：" + log.title) { WorkoutRunView(model: model, id: log.id) } }
                    NavigationLink("训练历史") { WorkoutHistoryView(model: model) }
                }
            }
            Section {
                PlanLauncher(model: model, title: "安排下肢基础训练", fullWidth: true, programKind: "lowerBodyBasics")
                    .buttonStyle(.journalText)
            }
            if model.confirmedPlans.isEmpty {
                Section {
                    VStack(spacing: 16) {
                        Image(systemName: "calendar")
                            .font(.system(size: 34, weight: .regular))
                            .foregroundStyle(Color.accentColor).accessibilityHidden(true)
                        Text("本周还没有安排").font(.title3.weight(.semibold))
                            .foregroundStyle(SteadyTheme.primary).padding(.top, 12)
                        Text("先生成一份草案\n调整并确认后，就会出现在这里")
                            .font(.subheadline).foregroundStyle(SteadyTheme.secondary)
                            .multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
                        PlanLauncher(model: model, title: "生成新草案", fullWidth: true)
                            .buttonStyle(.borderedProminent).tint(SteadyTheme.card)
                            .foregroundStyle(SteadyTheme.primary).controlSize(.large)
                            .padding(.top, 12)
                        Text("计划可以慢慢开始\n也可以随时调整")
                            .font(JournalFonts.handwriting(23))
                            .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
                            .foregroundStyle(SteadyTheme.secondary)
                            .multilineTextAlignment(.center).padding(.top, 28)
                    }
                    .frame(maxWidth: .infinity).padding(.horizontal, typeSize.isAccessibilitySize ? 0 : 28)
                    .padding(.vertical, 28)
                    .listRowInsets(EdgeInsets(top: 0, leading: 4, bottom: 0, trailing: 4))
                    .listRowBackground(Color.clear).listRowSeparator(.hidden)
                }
            } else {
                Section {
                    PlanLauncher(model: model, title: "生成新草案", fullWidth: true)
                        .buttonStyle(.borderedProminent).tint(SteadyTheme.card)
                        .foregroundStyle(SteadyTheme.primary).controlSize(.large)
                        .listRowBackground(Color.clear).listRowSeparator(.hidden)
                }
            }
            ForEach(model.confirmedPlans) { plan in
                Section(plan.title) {
                    ForEach(plan.sessions.sorted { $0.scheduledAt < $1.scheduledAt }) { session in
                        NavigationLink { WorkoutView(model: model, planID: plan.id, sessionID: session.id) } label: {
                            VStack(alignment: .leading, spacing: 5) {
                                Text(session.scheduledAt, format: .dateTime.month().day().weekday()).font(.caption).foregroundStyle(SteadyTheme.secondary)
                                Text("\(session.title) · \(session.minutes)分钟")
                                if let feedback = session.feedback { Text(feedback.completed ? "已完成" : "已记录 · 未完成").font(.caption).foregroundStyle(.tint) }
                            }
                        }.accessibilityIdentifier("workoutRow")
                    }
                }
            }
            if !drafts.isEmpty {
                Section("未确认草案") {
                    ForEach(drafts) { plan in
                        NavigationLink(plan.title) { DraftView(model: model, initialPlan: plan) }
                    }
                }
            }
            Section {
                Text(model.isDemo ? "演示数据 · 不是实际身体分析" : "健康日记 · 非医疗诊断")
                    .font(.footnote).foregroundStyle(SteadyTheme.secondary)
                    .frame(maxWidth: .infinity).multilineTextAlignment(.center)
                    .padding(.vertical, 16)
                    .accessibilityIdentifier(model.isDemo ? "demoBadge" : "plansPrivacyNote")
                    .listRowBackground(Color.clear).listRowSeparator(.hidden)
            }
        }
        .listSectionSpacing(20)
        .journalSurface().navigationTitle("计划")
    }
}

struct WorkoutView: View {
    @Bindable var model: AppModel
    let planID: UUID
    let sessionID: UUID
    @State private var feedback = false
    @State private var activeLogID: UUID?
    @State private var showTraining = false
    @State private var edit = false
    @State private var replacement: ExerciseReplacementRequest?
    var plan: TrainingPlan? { model.plans.first { $0.id == planID } }
    var session: WorkoutSession? { plan?.sessions.first { $0.id == sessionID } }
    var body: some View {
        JournalPage {
            ModeBadge(isDemo: model.isDemo)
            if let session {
                if let plan { LowerBodyPlanNote(plan: plan, currentAnswers: model.journal.preferences.movementConditions) }
                Text(session.scheduledAt, format: .dateTime.month().day().weekday()).font(.subheadline)
                Text("\(session.minutes)分钟 · 按自己的节奏").font(.title2).foregroundStyle(SteadyTheme.primary)
                ForEach(session.exercises) { exercise in
                    JournalCard {
                        Text(exercise.name).font(.headline).foregroundStyle(SteadyTheme.primary)
                        Text(exercise.prescription).foregroundStyle(SteadyTheme.secondary)
                        if let plan, let reason = (try? ExerciseCatalog.forPlan(plan))?.selectionReason(for: exercise) {
                            Text(reason).font(.footnote).foregroundStyle(SteadyTheme.secondary)
                        }
                        ExerciseTeachingLink(exercise: exercise).buttonStyle(.journalText)
                        if plan?.generationContext != nil, exercise.catalogID != nil {
                            Button("替换动作") {
                                replacement = ExerciseReplacementRequest(sessionID: session.id, exercise: exercise)
                            }.buttonStyle(.journalText).accessibilityIdentifier("replaceExercise").accessibilityLabel("替换动作：\(exercise.name)")
                        }
                    }
                }
                if plan?.generationContext == nil { LegacyReplacementNotice() }
                Text("训练建议不是医疗处方；出现不适请停止。").font(.footnote)
                Button("调整日期与动作") { edit = true }.buttonStyle(.journalText)
                if model.workoutLoopEnabled {
                    Button(model.ongoingWorkout == nil ? "开始逐组训练" : "继续进行中的训练") {
                        if let ongoing = model.ongoingWorkout { activeLogID = ongoing.id; showTraining = true }
                        else if let id = model.startWorkout(WorkoutTemplate(session: session), planID: planID, sessionID: session.id) { activeLogID = id; showTraining = true }
                    }.accessibilityIdentifier("startPlanWorkout")
                    if !model.workoutLogs.contains(where: { $0.sessionID == session.id }) { Text("暂无逐组记录").font(.caption).foregroundStyle(.secondary) }
                }
                PrimaryAction(title: "记录训练反馈") { feedback = true }.accessibilityIdentifier("recordFeedback")
                if let f = session.feedback {
                    JournalCard { Text(f.completed ? "已完成" : "未完成").font(.headline).foregroundStyle(SteadyTheme.primary); Text("主观强度 \(f.perceivedEffort)/10"); Text(f.note) }
                }
            }
        }.journalSurface().navigationTitle(session?.title ?? "训练详情").navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showTraining) { if let id = activeLogID { NavigationStack { WorkoutRunView(model: model, id: id) } } }
            .sheet(isPresented: $feedback) { if let plan, let session { FeedbackView(model: model, plan: plan, session: session) } }
            .sheet(isPresented: $edit) {
                if let plan { NavigationStack { SessionEditView(model: model, plan: plan, sessionID: sessionID) } }
            }
            .sheet(item: $replacement) { request in
                if let plan, let context = plan.generationContext {
                    ExerciseReplacementSheet(model: model, exercise: request.exercise, context: context) { candidateID, answers in
                        let proposed = try PlanExerciseEditing.replacing(in: plan, request: request, candidateID: candidateID, currentAnswers: answers)
                        guard model.savePlan(proposed) else {
                            throw ServiceError.invalidInput(model.error ?? "替换暂未保存，请重试。")
                        }
                    }
                }
            }
    }
}

struct SessionEditView: View {
    @Bindable var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State var plan: TrainingPlan
    @State private var replacement: ExerciseReplacementRequest?
    let sessionID: UUID
    var body: some View {
        Form {
            if let i = plan.sessions.firstIndex(where: { $0.id == sessionID }) {
                DatePicker("训练日期", selection: $plan.sessions[i].scheduledAt, displayedComponents: .date)
                Stepper("\(plan.sessions[i].minutes)分钟", value: $plan.sessions[i].minutes, in: 10...(plan.generationContext?.availableMinutes ?? 90), step: 5)
                ForEach($plan.sessions[i].exercises) { $exercise in
                    PlanExerciseEditor(exercise: $exercise, context: plan.generationContext) {
                        replacement = ExerciseReplacementRequest(sessionID: sessionID, exercise: exercise)
                    }
                }
            }
            if plan.generationContext == nil { LegacyReplacementNotice() }
            RequestStatus(model: model)
        }.scrollDismissesKeyboard(.immediately).journalSurface().navigationTitle("调整训练").navigationBarTitleDisplayMode(.inline)
            .sheet(item: $replacement) { request in
                if let context = plan.generationContext {
                    ExerciseReplacementSheet(model: model, exercise: request.exercise, context: context) { candidateID, answers in
                        plan = try PlanExerciseEditing.replacing(in: plan, request: request, candidateID: candidateID, currentAnswers: answers)
                    }
                }
            }
            .toolbar {
                CloseSheet()
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存", systemImage: "checkmark") {
                        if let session = plan.sessions.first(where: { $0.id == sessionID }) {
                            do { try plan.updateSession(session); if model.savePlan(plan) { dismiss() } }
                            catch { model.error = error.localizedDescription }
                        }
                    }.journalPrimaryButton()
                }
            }
    }
}

struct PlanExerciseEditor: View {
    @Binding var exercise: Exercise
    let context: PlanGenerationContext?
    let replace: () -> Void
    @State private var restorationError: String?
    @FocusState private var prescriptionFocused: Bool
    private var catalog: ExerciseCatalog? { try? ExerciseCatalog.load(version: exercise.catalogVersion ?? 1) }
    private var hasKnownTemplate: Bool {
        guard let context else { return false }
        return catalog?.estimatedSeconds(for: exercise, context: context) != nil
    }
    private var canRestoreTemplate: Bool {
        guard let context, exercise.catalogVersion == catalog?.catalogVersion,
              let id = exercise.catalogID, let role = exercise.role else { return false }
        return catalog?.exercise(id: id)?.template(role: role, experience: context.experience) != nil
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if exercise.catalogID == nil {
                TextField("动作名称", text: $exercise.name)
            } else { Text(exercise.name).font(.headline) }
            TextField("动作说明", text: Binding(get: { exercise.prescription }, set: { exercise.setCustomPrescription($0) }), axis: .vertical)
                .font(.subheadline).foregroundStyle(SteadyTheme.secondary)
                .accessibilityIdentifier("exercisePrescription")
                .focused($prescriptionFocused)
            if exercise.catalogID != nil && !hasKnownTemplate {
                Text(exercise.templateID == nil ? "已自定义用量" : "原模板暂不可用").font(.caption).foregroundStyle(SteadyTheme.secondary)
                    .accessibilityIdentifier("customPrescription")
                if canRestoreTemplate, let context, let id = exercise.catalogID, let role = exercise.role {
                    Button("恢复模板用量") {
                        prescriptionFocused = false
                        do {
                            var restored = try ExerciseCatalog.load(version: exercise.catalogVersion ?? 1).makeExercise(id: id, role: role, context: context)
                            restored.id = exercise.id
                            exercise = restored
                        } catch { restorationError = error.localizedDescription }
                    }.buttonStyle(.borderless).accessibilityIdentifier("restorePrescription")
                }
            }
            if let reason = catalog?.selectionReason(for: exercise) { Text(reason).font(.footnote).foregroundStyle(SteadyTheme.secondary) }
            ExerciseTeachingLink(exercise: exercise).buttonStyle(.borderless)
            if context != nil && exercise.catalogID != nil {
                Button("替换动作", action: replace).buttonStyle(.borderless)
                    .accessibilityIdentifier("replaceExercise").accessibilityLabel("替换动作：\(exercise.name)")
            }
        }.padding(.vertical, 4)
            .alert("暂时无法恢复用量", isPresented: Binding(get: { restorationError != nil }, set: { if !$0 { restorationError = nil } })) {
                Button("知道了", role: .cancel) { restorationError = nil }
            } message: { Text(restorationError ?? "") }
    }
}

struct LegacyReplacementNotice: View {
    var body: some View {
        Text("这份旧计划未保存器材与生成条件。仍可查看教学和编辑文字；如需替换动作，请重新生成草案。")
            .font(.footnote).foregroundStyle(SteadyTheme.secondary)
            .accessibilityIdentifier("legacyReplacementNotice")
    }
}

struct FeedbackView: View {
    @Bindable var model: AppModel
    @Environment(\.dismiss) private var dismiss
    let plan: TrainingPlan
    let session: WorkoutSession
    @State private var completed = true
    @State private var effort = 4
    @State private var note = ""
    var body: some View {
        NavigationStack {
            Form {
                Section("训练感受") {
                    Toggle("已完成训练", isOn: $completed)
                    Stepper("主观强度 \(effort)/10", value: $effort, in: 1...10)
                    TextField("感受与备注", text: $note, axis: .vertical).lineLimit(3...8).accessibilityIdentifier("feedbackNote")
                }
                RequestStatus(model: model)
                Button("保存反馈") {
                    do {
                        var updated = session, plan = plan
                        updated.feedback = try WorkoutFeedback(completed: completed, perceivedEffort: effort, note: note)
                        try plan.updateSession(updated)
                        if model.savePlan(plan) { dismiss() }
                    } catch { model.error = error.localizedDescription }
                }.accessibilityIdentifier("saveFeedback")
            }.journalSurface().navigationTitle("记录训练感受").navigationBarTitleDisplayMode(.inline).toolbar { CloseSheet() }
        }.onAppear {
            if let f = session.feedback { completed = f.completed; effort = f.perceivedEffort; note = f.note }
        }
    }
}

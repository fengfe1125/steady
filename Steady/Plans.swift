import SwiftUI
import SteadyCore

struct PlanLauncher: View {
    @Bindable var model: AppModel
    let title: String
    @State private var showing = false
    var body: some View {
        Button(title) { model.draft = nil; showing = true }.disabled(model.busy != nil)
            .accessibilityIdentifier("planLauncher")
            .sheet(isPresented: $showing) { PlanFormView(model: model) }
    }
}

struct PlanFormView: View {
    @Bindable var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var preferences = UserPreferences()
    var body: some View {
        NavigationStack {
            Group {
                if let draft = model.draft {
                    DraftView(model: model, initialPlan: draft) { dismiss() }
                } else {
                    Form {
                        Section { ModeBadge(isDemo: model.isDemo); Text(model.isDemo ? "固定轻量模板。第一阶段不按目标、经验或器械自动优化动作；有运动限制时不生成方案。" : "AI 根据目标、经验、器械和时间整理一周草案。有运动限制时不自动编排，确认前可修改。").font(.footnote) }
                        PreferenceFields(preferences: $preferences)
                        Section {
                            RequestStatus(model: model)
                            Button(model.isDemo ? "生成草案（演示）" : "生成训练草案") { model.generatePlan(preferences) }
                                .disabled(model.busy != nil || preferences.goal.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                                .accessibilityIdentifier("generatePlan")
                        }
                    }.navigationTitle("安排适合你的训练").navigationBarTitleDisplayMode(.inline)
                }
            }
            .toolbar { CloseSheet() }
        }.onAppear { preferences = model.journal.preferences }
            .interactiveDismissDisabled(model.busy != nil)
            .onDisappear { if model.busy != nil { model.cancel() } }
    }
}

struct PreferenceFields: View {
    @Binding var preferences: UserPreferences
    var body: some View {
        Section("目标与经验") {
            TextField("你的目标", text: $preferences.goal)
            Picker("运动经验", selection: $preferences.experience) {
                ForEach(["初学者", "偶尔运动", "规律运动"], id: \.self) { Text($0) }
            }
            Picker("可用器械", selection: $preferences.equipment) {
                ForEach(["自重", "哑铃", "健身房"], id: \.self) { Text($0) }
            }
        }
        Section("可用时间与限制") {
            Stepper("每次 \(preferences.availableMinutes) 分钟", value: $preferences.availableMinutes, in: 10...90, step: 5)
            TextField("运动限制（如有，请填写）", text: $preferences.limitations, axis: .vertical)
            Text("这不是医疗评估。有疼痛或运动限制时请先咨询专业人士。").font(.footnote).foregroundStyle(.secondary)
        }
    }
}

struct DraftView: View {
    @Bindable var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var plan: TrainingPlan
    var onConfirm: (() -> Void)?
    init(model: AppModel, initialPlan: TrainingPlan, onConfirm: (() -> Void)? = nil) {
        self.model = model; _plan = State(initialValue: initialPlan); self.onConfirm = onConfirm
    }
    var body: some View {
        Form {
            Section { ModeBadge(isDemo: model.isDemo); Text("草案尚未加入正式计划。可以调整每次日期、时长和动作，确认后才生效。").font(.subheadline) }
            ForEach($plan.sessions) { $session in
                Section(session.title) {
                    DatePicker("训练日期", selection: $session.scheduledAt, displayedComponents: .date)
                    Stepper("\(session.minutes)分钟", value: $session.minutes, in: 10...90, step: 5)
                    ForEach($session.exercises) { $exercise in
                        VStack(alignment: .leading) {
                            Text(exercise.name)
                            TextField("动作说明", text: $exercise.prescription)
                                .font(.subheadline).foregroundStyle(.secondary)
                        }
                    }
                    Button("替换深蹲为坐站练习") {
                        if let i = session.exercises.firstIndex(where: { $0.name == "自重深蹲" }) {
                            session.exercises[i] = Exercise(name: "坐站练习", prescription: "稳固椅子，2组 × 8次，量力而行")
                        }
                    }.disabled(!session.exercises.contains { $0.name == "自重深蹲" })
                }
            }
            Section {
                RequestStatus(model: model)
                Button("保存草案修改") { if model.savePlan(plan) { model.draft = plan; model.notice = "草案修改已保存在本机。" } }
                Button("确认加入本周") {
                    if model.confirmDraft(plan) { if let onConfirm { onConfirm() } else { dismiss() } }
                }.accessibilityIdentifier("confirmPlan")
            }
        }.navigationTitle("你的训练草案").navigationBarTitleDisplayMode(.inline)
    }
}

struct PlansView: View {
    @Bindable var model: AppModel
    var body: some View {
        List {
            Section { ModeBadge(isDemo: model.isDemo); PlanLauncher(model: model, title: "生成新草案") }
            if model.confirmedPlans.isEmpty {
                ContentUnavailableView("本周还没有安排", systemImage: "calendar", description: Text("生成草案，修改并确认后会显示在这里。"))
            }
            ForEach(model.confirmedPlans) { plan in
                Section(plan.title) {
                    ForEach(plan.sessions.sorted { $0.scheduledAt < $1.scheduledAt }) { session in
                        NavigationLink { WorkoutView(model: model, planID: plan.id, sessionID: session.id) } label: {
                            VStack(alignment: .leading, spacing: 5) {
                                Text(session.scheduledAt, format: .dateTime.month().day().weekday()).font(.caption).foregroundStyle(.secondary)
                                Text("\(session.title) · \(session.minutes)分钟")
                                if let feedback = session.feedback { Text(feedback.completed ? "已完成" : "已记录 · 未完成").font(.caption).foregroundStyle(.tint) }
                            }
                        }.accessibilityIdentifier("workoutRow")
                    }
                }
            }
            Section("未确认草案") {
                ForEach(model.plans.filter { $0.status == .draft }) { plan in
                    NavigationLink(plan.title) { DraftView(model: model, initialPlan: plan) }
                }
            }
        }.navigationTitle("这一周，动一点")
    }
}

struct WorkoutView: View {
    @Bindable var model: AppModel
    let planID: UUID
    let sessionID: UUID
    @State private var feedback = false
    @State private var edit = false
    var plan: TrainingPlan? { model.plans.first { $0.id == planID } }
    var session: WorkoutSession? { plan?.sessions.first { $0.id == sessionID } }
    var body: some View {
        JournalPage {
            ModeBadge(isDemo: model.isDemo)
            if let session {
                Text(session.scheduledAt, format: .dateTime.month().day().weekday()).font(.subheadline)
                Text("\(session.minutes)分钟 · 按自己的节奏").font(.title2)
                ForEach(session.exercises) { exercise in
                    JournalCard { Text(exercise.name).font(.headline); Text(exercise.prescription).foregroundStyle(.secondary) }
                }
                Text("训练建议不是医疗处方；出现不适请停止。").font(.footnote)
                Button("调整日期与动作") { edit = true }
                PrimaryAction(title: "记录训练反馈") { feedback = true }.accessibilityIdentifier("recordFeedback")
                if let f = session.feedback {
                    JournalCard { Text(f.completed ? "已完成" : "未完成").font(.headline); Text("主观强度 \(f.perceivedEffort)/10"); Text(f.note) }
                }
            }
        }.navigationTitle(session?.title ?? "训练详情").navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $feedback) { if let plan, let session { FeedbackView(model: model, plan: plan, session: session) } }
            .sheet(isPresented: $edit) {
                if let plan { NavigationStack { SessionEditView(model: model, plan: plan, sessionID: sessionID) } }
            }
    }
}

struct SessionEditView: View {
    @Bindable var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State var plan: TrainingPlan
    let sessionID: UUID
    var body: some View {
        Form {
            if let i = plan.sessions.firstIndex(where: { $0.id == sessionID }) {
                DatePicker("训练日期", selection: $plan.sessions[i].scheduledAt, displayedComponents: .date)
                Stepper("\(plan.sessions[i].minutes)分钟", value: $plan.sessions[i].minutes, in: 10...90, step: 5)
                ForEach($plan.sessions[i].exercises) { $exercise in
                    TextField("动作名称", text: $exercise.name)
                    TextField("动作说明", text: $exercise.prescription)
                }
            }
            RequestStatus(model: model)
        }.navigationTitle("调整训练").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                CloseSheet()
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存", systemImage: "checkmark") {
                        if let session = plan.sessions.first(where: { $0.id == sessionID }) {
                            do { try plan.updateSession(session); if model.savePlan(plan) { dismiss() } }
                            catch { model.error = error.localizedDescription }
                        }
                    }.buttonStyle(.borderedProminent)
                }
            }
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
            }.navigationTitle("记录训练感受").navigationBarTitleDisplayMode(.inline).toolbar { CloseSheet() }
        }.onAppear {
            if let f = session.feedback { completed = f.completed; effort = f.perceivedEffort; note = f.note }
        }
    }
}

import SwiftUI
import SteadyCore

struct RootView: View {
    @Bindable var model: AppModel
    var body: some View {
        Group {
            if model.journal.preferences.onboardingComplete {
                TabView(selection: $model.selectedTab) {
                    Tab("今天", systemImage: "sun.max", value: 0) { NavigationStack { TodayView(model: model) } }
                    Tab("趋势", systemImage: "chart.xyaxis.line", value: 1) { NavigationStack { TrendsView(model: model) } }
                    Tab(value: 2) { NavigationStack { CoachView(model: model) } } label: { Label { Text("教练") } icon: { Image(uiImage: JournalIcons.exercise) } }
                    Tab("计划", systemImage: "calendar", value: 3) { NavigationStack { PlansView(model: model) } }
                }
            } else { OnboardingView(model: model) }
        }
        .task(id: model.scenario) { await model.load() }
        .sheet(item: $model.presentedReport) { report in
            NavigationStack { ReportView(model: model, report: report).toolbar { CloseSheet() } }
        }
        .sheet(isPresented: $model.showChat) { NavigationStack { ChatView(model: model).toolbar { CloseSheet() } } }
    }
}

struct CloseSheet: ToolbarContent {
    @Environment(\.dismiss) private var dismiss
    var body: some ToolbarContent {
        ToolbarItem(placement: .cancellationAction) {
            Button("关闭", systemImage: "xmark") { dismiss() }
        }
    }
}

struct RequestStatus: View {
    @Bindable var model: AppModel
    var body: some View {
        if let busy = model.busy {
            JournalCard {
                ProgressView(busy)
                Button("取消生成") { model.cancel() }.accessibilityIdentifier("cancelGeneration")
            }
        }
        if let error = model.error {
            JournalCard {
                Label("请求未完成", systemImage: "exclamationmark.circle").font(.headline)
                Text(error).font(.subheadline)
                Button("知道了") { model.error = nil }
            }.accessibilityIdentifier("requestError")
        }
        if let notice = model.notice { Text(notice).font(.footnote).foregroundStyle(.secondary) }
    }
}

struct TodayView: View {
    @Bindable var model: AppModel
    @State private var settings = false
    @State private var note = false
    @Environment(\.dynamicTypeSize) private var typeSize
    private var todaysWorkout: (plan: TrainingPlan, session: WorkoutSession)? {
        var calendar = Calendar.current
        if model.isDemo { calendar.timeZone = TimeZone(identifier: "Asia/Shanghai")! }
        let reference = model.isDemo ? (model.today?.date ?? Date()) : Date()
        return model.confirmedPlans.flatMap { plan in
            plan.sessions.filter { calendar.isDate($0.scheduledAt, inSameDayAs: reference) }
                .map { (plan: plan, session: $0) }
        }.sorted { $0.session.scheduledAt < $1.session.scheduledAt }.first
    }
    var body: some View {
        JournalPage {
            Text(model.isDemo ? "2026年9月21日 · 固定样例日期" : Date().formatted(date: .long, time: .omitted)).font(.subheadline).foregroundStyle(.secondary)
            ModeBadge(isDemo: model.isDemo)
            if model.isDemo && model.scenario != .normal {
                Label("当前场景：\(model.scenario.rawValue)", systemImage: "info.circle").font(.subheadline)
            }
            JournalWelcome(title: "小小的变化\n都值得被看见", subtitle: "按自己的节奏 慢慢来", expression: .happy)
            if let today = model.today {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), alignment: .top), count: typeSize.isAccessibilitySize ? 1 : 2), spacing: 12) {
                    SummaryMetric(title: "睡眠", value: today.sleepMinutes.map { "\($0 / 60)时\($0 % 60)分" } ?? "暂无记录", detail: "昨晚的睡眠")
                    SummaryMetric(title: "步数", value: today.steps.map { $0.formatted() } ?? "暂无记录", detail: "步 · 当天记录")
                    SummaryMetric(title: "运动", value: today.activeMinutes.map(String.init) ?? "暂无记录", detail: "分钟 · Apple 运动")
                    SummaryMetric(title: "体重", value: today.weightKG.map { String(format: "%.1f", $0) } ?? "暂无记录", detail: "kg · 当天记录")
                }
                Text(model.isDemo ? "来源：本地虚构样例 · 缺失指标不计为零" : "来源：苹果健康 · 缺失指标不计为零").font(.caption).foregroundStyle(.secondary)
            } else { Text("暂无可用数据，可在设置中连接苹果健康。") }
            if !model.isDemo {
                Button(model.journal.preferences.healthRead ? "重新读取苹果健康" : "连接苹果健康") { model.connectHealth() }
                    .disabled(model.busy != nil)
                    .accessibilityIdentifier("connectHealth")
            }
            RequestStatus(model: model)
            JournalCard {
                Text("今日训练").font(.headline)
                if let workout = todaysWorkout {
                    NavigationLink { WorkoutView(model: model, planID: workout.plan.id, sessionID: workout.session.id) } label: {
                        Label("\(workout.session.title) · \(workout.session.minutes)分钟", systemImage: "figure.walk")
                    }
                } else {
                    Text("今天还没有确认的安排").foregroundStyle(.secondary)
                    PlanLauncher(model: model, title: "安排训练")
                }
            }
            PrimaryAction(title: model.isDemo ? "生成演示报告" : "生成今日日报") { model.generateReport() }
                .disabled(model.busy != nil || model.today == nil).accessibilityIdentifier("generateReport")
            NavigationLink("查看已有日报") { HistoryView(model: model) }
            JournalCard {
                Text("今天感觉怎么样").font(JournalFonts.handwriting(27))
                Button("补记感受", systemImage: "pencil.line") { note = true }.accessibilityIdentifier("addNote")
            }
            if let text = model.today.flatMap({ model.journal.notes[$0.dayKey] }), !text.isEmpty {
                JournalCard { Text("今日补记").font(.headline); Text(text) }
            }
        }
        .journalSurface().navigationTitle("今天，慢慢来")
        .toolbar { ToolbarItem(placement: .topBarTrailing) {
            Button("设置", systemImage: "gearshape") { settings = true }.accessibilityIdentifier("settings")
        } }
        .sheet(isPresented: $settings) { NavigationStack { SettingsView(model: model).toolbar { CloseSheet() } } }
        .sheet(isPresented: $note) { NoteView(model: model) }
    }
}

struct NoteView: View {
    @Bindable var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var note = ""
    var body: some View {
        NavigationStack {
            Form {
                Section("今天感觉怎么样") { TextField("睡醒感受、疲劳或其他想记的事", text: $note, axis: .vertical).lineLimit(5...12).accessibilityIdentifier("noteInput") }
                Text(model.journal.preferences.cloudSync ? "补记将随记录同步；不会自动发送给 AI。" : "仅保存在这台设备，不发送给 AI。").font(.footnote)
                if let error = model.error { Text(error).foregroundStyle(.red) }
            }
            .journalSurface().navigationTitle("补记感受").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                CloseSheet()
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存", systemImage: "checkmark") { if model.saveNote(note) { dismiss() } }
                        .journalPrimaryButton().accessibilityIdentifier("saveNote")
                }
            }
            .onAppear { note = model.today.flatMap { model.journal.notes[$0.dayKey] } ?? "" }
        }
    }
}

struct ReportView: View {
    @Bindable var model: AppModel
    let report: HealthReport
    @State private var showConversation = false
    var body: some View {
        JournalPage {
            ModeBadge(isDemo: model.isDemo)
            Text(model.summaries.first(where: { $0.id == report.summaryID })?.dayKey ?? report.sections.flatMap(\.evidence).first?.dayKey ?? "健康日报").font(.subheadline)
            ForEach(report.sections) { section in
                JournalCard {
                    Text(section.title).font(.headline)
                    Text(section.body).font(.body)
                    if !section.evidence.isEmpty {
                        DisclosureGroup("查看数据依据") { EvidenceView(evidence: section.evidence).padding(.top, 8) }
                    }
                }
            }
            Button("追问教练") {
                if model.activeConversationID == nil { model.prepareChat() }
                showConversation = model.activeConversationID != nil
            }
                .journalPrimaryButton().accessibilityIdentifier("askCoach")
        }.journalSurface().navigationTitle("今日身体记录").navigationBarTitleDisplayMode(.inline)
            .navigationDestination(isPresented: $showConversation) { ChatView(model: model) }
    }
}

struct HistoryView: View {
    @Bindable var model: AppModel
    var body: some View {
        List {
            Section { ModeBadge(isDemo: model.isDemo) }
            ForEach(model.journal.reports) { report in
                NavigationLink { ReportView(model: model, report: report) } label: {
                    VStack(alignment: .leading) {
                        Text(model.summaries.first(where: { $0.id == report.summaryID })?.dayKey ?? report.sections.flatMap(\.evidence).first?.dayKey ?? "健康日报")
                        Text(model.isDemo ? "演示日报 · 已保存在本机" : "健康日报 · 已保存在本机").font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
        }.journalSurface().navigationTitle("历史日报")
    }
}

private struct SummaryMetric: View {
    let title: String
    let value: String
    let detail: String
    var body: some View {
        JournalCard {
            Text(title).font(.subheadline).foregroundStyle(SteadyTheme.secondary)
            Text(value).font(.title2.weight(.medium)).monospacedDigit().foregroundStyle(SteadyTheme.primary)
            Text(detail).font(.caption).foregroundStyle(SteadyTheme.secondary)
        }.accessibilityElement(children: .combine)
    }
}

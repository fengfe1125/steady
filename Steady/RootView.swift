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
                    Tab("教练", systemImage: "bubble.left.and.bubble.right", value: 2) { NavigationStack { CoachView(model: model) } }
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
    var body: some View {
        JournalPage {
            Text(model.isDemo ? "2026年9月21日 · 固定样例日期" : Date().formatted(date: .long, time: .omitted)).font(.subheadline).foregroundStyle(.secondary)
            ModeBadge(isDemo: model.isDemo)
            if model.isDemo && model.scenario != .normal {
                Label("当前场景：\(model.scenario.rawValue)", systemImage: "info.circle").font(.subheadline)
            }
            JournalCard {
                Text("身体摘要").font(.subheadline).foregroundStyle(.secondary)
                Text("先记录，再了解自己").font(.title2.weight(.semibold))
                Text(model.isDemo ? "每一天的小变化，都值得温柔地看见。样例不是你的真实健康记录。" : "把健康记录和每天的感受放在一起，按自己的节奏慢慢来。")
                    .font(.subheadline).foregroundStyle(.secondary)
            }
            if let today = model.today {
                JournalCard {
                    Text("睡眠与活动").font(.headline)
                    LabeledContent("睡眠", value: today.sleepMinutes.map { "\($0 / 60)小时\($0 % 60)分" } ?? "暂无记录")
                    LabeledContent("步数", value: today.steps.map { "\($0.formatted())步" } ?? "暂无记录")
                    LabeledContent("运动分钟", value: today.activeMinutes.map { "\($0)分钟" } ?? "暂无记录")
                    LabeledContent("体重", value: today.weightKG.map { String(format: "%.1f kg", $0) } ?? "暂无记录")
                    Text(model.isDemo ? "来源：本地虚构样例 · 缺失指标不计为零" : "来源：苹果健康 · 缺失指标不计为零").font(.caption).foregroundStyle(.secondary)
                }
            } else { Text("暂无可用数据，可在设置中连接苹果健康。") }
            if !model.isDemo && !model.journal.preferences.healthRead { Button("连接苹果健康") { model.connectHealth() } }
            JournalCard {
                Text("今日训练").font(.headline)
                if let plan = model.confirmedPlans.first, let session = plan.sessions.first {
                    NavigationLink { WorkoutView(model: model, planID: plan.id, sessionID: session.id) } label: {
                        Label("\(session.title) · \(session.minutes)分钟", systemImage: "figure.walk")
                    }
                } else {
                    Text("今天还没有确认的安排").foregroundStyle(.secondary)
                    PlanLauncher(model: model, title: "安排训练")
                }
            }
            RequestStatus(model: model)
            PrimaryAction(title: model.isDemo ? "生成演示报告" : "生成今日日报") { model.generateReport() }
                .disabled(model.busy != nil || model.today == nil).accessibilityIdentifier("generateReport")
            NavigationLink("查看已有日报") { HistoryView(model: model) }
            Button("补记感受") { note = true }.accessibilityIdentifier("addNote")
            if let text = model.today.flatMap({ model.journal.notes[$0.dayKey] }), !text.isEmpty {
                JournalCard { Text("今日补记").font(.headline); Text(text) }
            }
        }
        .navigationTitle("今天，慢慢来")
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
            .navigationTitle("补记感受").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                CloseSheet()
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存", systemImage: "checkmark") { if model.saveNote(note) { dismiss() } }
                        .buttonStyle(.borderedProminent).accessibilityIdentifier("saveNote")
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
                .buttonStyle(.borderedProminent).accessibilityIdentifier("askCoach")
        }.navigationTitle("今日身体记录").navigationBarTitleDisplayMode(.inline)
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
        }.navigationTitle("历史日报")
    }
}

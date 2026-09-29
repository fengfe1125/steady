import SwiftUI
import Charts
import SteadyCore

struct TrendsView: View {
    @Bindable var model: AppModel
    @State private var days = 7
    @State private var metric = TrendMetric.steps
    private var window: TrendWindow {
        var calendar = Calendar.current
        if model.isDemo { calendar.timeZone = TimeZone(identifier: "Asia/Shanghai")! }
        let reference = model.isDemo ? (model.summaries.map(\.date).max() ?? Date()) : Date()
        return TrendWindow(summaries: model.summaries, days: days, reference: reference, calendar: calendar)
    }
    var body: some View {
        JournalPage {
            ModeBadge(isDemo: model.isDemo)
            Picker("记录范围", selection: $days) { ForEach([7, 14, 30], id: \.self) { Text("\($0)天").tag($0) } }.pickerStyle(.segmented)
            Picker("指标", selection: $metric) { ForEach(TrendMetric.allCases) { Text($0.rawValue).tag($0) } }.pickerStyle(.segmented)
            JournalCard {
                Text("\(metric.rawValue) · \(metric.unit)").font(.headline)
                if window.points(for: metric).isEmpty {
                    ContentUnavailableView("这段时间暂无记录", systemImage: "chart.xyaxis.line")
                } else {
                    Chart {
                        ForEach(window.points(for: metric)) { summary in
                            if let value = metric.value(summary) {
                                LineMark(x: .value("日期", summary.date), y: .value(metric.rawValue, value))
                                    .interpolationMethod(.linear).accessibilityHidden(true)
                                PointMark(x: .value("日期", summary.date), y: .value(metric.rawValue, value))
                                    .accessibilityLabel(summary.dayKey)
                                    .accessibilityValue("\(value.formatted(.number.precision(.fractionLength(1))))\(metric.unit)")
                            }
                        }
                    }
                    .chartXAxis {
                        AxisMarks(values: .automatic(desiredCount: 3)) { _ in
                            AxisGridLine(); AxisTick()
                            AxisValueLabel(format: .dateTime.month(.twoDigits).day(.twoDigits))
                        }
                    }
                    .chartXScale(domain: window.start...window.end)
                    .chartYScale(domain: .automatic(includesZero: metric != .weight))
                    .frame(height: 230)
                }
                Text("有效记录 \(window.points(for: metric).count) / \(days)天").font(.subheadline)
                Text("连线连接已有记录，空缺日期没有测量值").font(.caption).foregroundStyle(.secondary)
                if metric == .weight { Text("体重纵轴不从零开始").font(.caption).foregroundStyle(.secondary) }
            }
            NavigationLink("查看每天的健康记录") {
                HealthHistoryView(summaries: model.summaries, isDemo: model.isDemo)
            }
            NavigationLink("历史日报") { HistoryView(model: model) }
            JournalCard {
                Text("数据来源").font(.headline)
                Text(model.isDemo ? "固定30天样例：2026年8月23日–9月21日。时区 Asia/Shanghai。尚未读取苹果健康。" : "来自苹果健康的最近30天摘要。缺失不计为零，睡眠按醒来日期归档，运动分钟采用 Apple 运动时间。")
            }
        }.journalSurface().navigationTitle("看见小小变化")
    }
}

private struct HealthHistoryView: View {
    let summaries: [DailySummary]
    let isDemo: Bool

    var body: some View {
        List {
            Section(isDemo ? "演示记录" : "本机保存的苹果健康摘要") {
                ForEach(Array(summaries.reversed())) { summary in
                    NavigationLink {
                        HealthDayView(summary: summary, isDemo: isDemo)
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(summary.dayKey).font(.headline)
                            Text(summary.steps.map { "\($0.formatted()) 步" } ?? "步数暂无记录")
                                .font(.subheadline).foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .journalSurface().navigationTitle("逐日健康记录")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct HealthDayView: View {
    let summary: DailySummary
    let isDemo: Bool

    var body: some View {
        Form {
            Section(summary.dayKey) {
                LabeledContent("步数", value: summary.steps.map { "\($0.formatted()) 步" } ?? "暂无记录")
                LabeledContent("睡眠", value: summary.sleepMinutes.map { "\($0 / 60) 小时 \($0 % 60) 分" } ?? "暂无记录")
                LabeledContent("运动分钟", value: summary.activeMinutes.map { "\($0) 分钟" } ?? "暂无记录")
                LabeledContent("体重", value: summary.weightKG.map { String(format: "%.1f kg", $0) } ?? "暂无记录")
            }
            Section {
                Text(isDemo ? "来源：本地虚构样例。" : "来源：苹果健康。本页展示保存在本机的摘要；缺失指标不当作零。")
                    .font(.footnote).foregroundStyle(.secondary)
            }
        }
        .journalSurface().navigationTitle("健康记录")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct CoachView: View {
    @Bindable var model: AppModel
    var body: some View {
        List {
            Section { ModeBadge(isDemo: model.isDemo); Text(model.isDemo ? "这里是演示教练，回答来自固定模板，不会判断你的真实身体状态。" : "根据你选择分享的摘要解释变化。AI 可能出错，不能替代医疗判断。").font(.subheadline) }
            Section {
                JournalWelcome(title: "想聊什么\n我在这里", expression: .curious, presentation: .half)
                    .listRowInsets(EdgeInsets()).listRowBackground(Color.clear)
                Button("开始新会话") { model.openChat() }
                PlanLauncher(model: model, title: "生成训练草案")
            }
            Section("会话记录") {
                if model.journal.conversations.isEmpty { Text("还没有会话 想聊的时候我们再开始").foregroundStyle(.secondary) }
                ForEach(model.journal.conversations) { chat in
                    Button { model.openChat(id: chat.id) } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(chat.title)
                            Text(chat.messages.last?.content ?? "还没有消息").lineLimit(2).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }.journalSurface().navigationTitle("你的教练")
    }
}

struct ChatView: View {
    @Bindable var model: AppModel
    @State private var question = ""
    @FocusState private var composerFocused: Bool
    var body: some View {
        ScrollViewReader { proxy in
            JournalPage {
                ModeBadge(isDemo: model.isDemo)
                if model.conversation?.messages.isEmpty != false {
                    JournalCard {
                        Text("从今天的记录聊起").font(.title2)
                        Button("我今天适合运动吗？") { model.send("我今天适合运动吗？") }.disabled(model.busy != nil)
                    }
                }
                ForEach(model.conversation?.messages ?? []) { message in
                    JournalCard {
                        Text(message.role == .user ? "你" : (model.isDemo ? "演示教练" : "教练")).font(.caption.weight(.medium)).foregroundStyle(.secondary)
                        Text(message.content.isEmpty ? "正在整理回复…" : message.content).textSelection(.enabled)
                        if !message.evidence.isEmpty { DisclosureGroup("引用数据") { EvidenceView(evidence: message.evidence) } }
                        if message.status == .cancelled { Text("已取消 · 以上为未完成内容").font(.caption) }
                        if message.status == .failed { Text("回复失败 · 可重新发送问题").font(.caption).foregroundStyle(.red) }
                    }.id(message.id)
                }
                RequestStatus(model: model)
            }
            .safeAreaInset(edge: .bottom) {
                HStack(alignment: .bottom) {
                    TextField(model.isDemo ? "问问演示教练" : "问问教练", text: $question, axis: .vertical).lineLimit(1...5)
                        .focused($composerFocused)
                        .textFieldStyle(.roundedBorder).accessibilityIdentifier("chatInput")
                    Button("发送", systemImage: "arrow.up.circle.fill") {
                        model.send(question); question = ""; composerFocused = false
                    }.labelStyle(.iconOnly).font(.title).disabled(question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || model.busy != nil)
                        .accessibilityIdentifier("sendMessage")
                }.padding().background(.bar)
            }
            .onChange(of: model.conversation?.messages.count) { _, _ in
                if let id = model.conversation?.messages.last?.id { withAnimation { proxy.scrollTo(id, anchor: .bottom) } }
            }
        }.journalSurface().navigationTitle("关于今天的状态").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { PlanLauncher(model: model, title: "训练草案") }; ToolbarItemGroup(placement: .keyboard) { Spacer(); Button("收起键盘") { composerFocused = false } } }
            .onDisappear { if model.busy == "演示教练正在回复" || model.busy == "教练正在回复" { model.cancel() } }
    }
}

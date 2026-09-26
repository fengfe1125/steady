import SwiftUI
import Charts
import SteadyCore

enum TrendMetric: String, CaseIterable, Identifiable {
    case weight = "体重", sleep = "睡眠", steps = "步数", active = "运动"
    var id: String { rawValue }
    var unit: String { switch self { case .weight: "kg"; case .sleep: "小时"; case .steps: "步"; case .active: "分钟" } }
    func value(_ s: DailySummary) -> Double? {
        switch self { case .weight: s.weightKG; case .sleep: s.sleepMinutes.map { Double($0) / 60 }; case .steps: s.steps.map(Double.init); case .active: s.activeMinutes.map(Double.init) }
    }
}
struct TrendsView: View {
    @Bindable var model: AppModel
    @State private var days = 7
    @State private var metric = TrendMetric.weight
    var body: some View {
        JournalPage {
            ModeBadge(isDemo: model.isDemo)
            Picker("记录范围", selection: $days) { ForEach([7, 14, 30], id: \.self) { Text("\($0)天").tag($0) } }.pickerStyle(.segmented)
            Picker("指标", selection: $metric) { ForEach(TrendMetric.allCases) { Text($0.rawValue).tag($0) } }.pickerStyle(.segmented)
            JournalCard {
                Text("\(metric.rawValue) · \(metric.unit)").font(.headline)
                Chart {
                    ForEach(Array(model.summaries.suffix(days))) { summary in
                        if let value = metric.value(summary) {
                            PointMark(x: .value("日期", summary.date), y: .value(metric.rawValue, value))
                                .accessibilityLabel(summary.dayKey).accessibilityValue("\(value.formatted(.number.precision(.fractionLength(1))))\(metric.unit)")
                        }
                    }
                }.chartYScale(domain: .automatic(includesZero: metric != .weight))
                    .frame(height: 230)
                Text("有效记录 \(model.summaries.suffix(days).compactMap { metric.value($0) }.count) / \(days)天").font(.subheadline)
                Text("仅显示有效记录；缺失值留空，不连线推测。体重纵轴不从零开始。").font(.caption).foregroundStyle(.secondary)
            }
            NavigationLink("历史日报") { HistoryView(model: model) }
            JournalCard {
                Text("数据来源").font(.headline)
                Text(model.isDemo ? "固定30天样例：2026年8月23日–9月21日。时区 Asia/Shanghai。尚未读取苹果健康。" : "来自苹果健康的最近30天摘要。缺失不计为零，睡眠按醒来日期归档，运动分钟采用 Apple 运动时间。")
            }
        }.navigationTitle("看见小小变化")
    }
}

struct CoachView: View {
    @Bindable var model: AppModel
    var body: some View {
        List {
            Section { ModeBadge(isDemo: model.isDemo); Text(model.isDemo ? "这里是演示教练，回答来自固定模板，不会判断你的真实身体状态。" : "根据你选择分享的摘要解释变化。AI 可能出错，不能替代医疗判断。").font(.subheadline) }
            Section {
                Button("开始新会话") { model.openChat() }
                PlanLauncher(model: model, title: "生成训练草案")
            }
            Section("会话记录") {
                ForEach(model.journal.conversations) { chat in
                    Button { model.openChat(id: chat.id) } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(chat.title)
                            Text(chat.messages.last?.content ?? "还没有消息").lineLimit(2).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }.navigationTitle("你的教练")
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
        }.navigationTitle("关于今天的状态").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { PlanLauncher(model: model, title: "训练草案") }; ToolbarItemGroup(placement: .keyboard) { Spacer(); Button("收起键盘") { composerFocused = false } } }
            .onDisappear { if model.busy == "演示教练正在回复" || model.busy == "教练正在回复" { model.cancel() } }
    }
}

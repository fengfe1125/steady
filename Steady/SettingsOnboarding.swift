import SwiftUI
import SteadyCore

struct PrivacyFields: View {
    @Binding var preferences: UserPreferences
    var isDemo = true
    var body: some View {
        Section(isDemo ? "独立开关 · 仅保存演示偏好" : "数据用途 · 分别授权") {
            Toggle("健康读取", isOn: $preferences.healthRead).accessibilityIdentifier("healthConsent")
            Toggle("云端同步", isOn: $preferences.cloudSync).accessibilityIdentifier("cloudConsent")
            Toggle("AI 处理", isOn: $preferences.aiProcessing).accessibilityIdentifier("aiConsent")
            Text(isDemo ? "演示模式不会读取健康、上传数据或调用 AI。" : "健康原始样本留在设备。云同步会把摘要与记录存入新加坡 Supabase；AI 会把本次必要摘要和最近对话经新加坡服务转交 DeepSeek。不同意同步仍可单独使用 AI，Steady 后端不保存该次正文。关闭开关停止后续对应操作，不删除已有云记录。")
                .font(.footnote).foregroundStyle(.secondary)
        }
    }
}

struct SettingsView: View {
    @Bindable var model: AppModel
    @State private var preferences = UserPreferences()
    @State private var originalPreferences = UserPreferences()
    @State private var confirmReset = false
    @State private var confirmLocal = false
    @State private var confirmCloud = false
    var body: some View {
        Form {
            Section {
                NavigationLink { AccountConnectionsView(model: model) } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("账户与连接")
                        Text(model.accountDescription).font(.caption).foregroundStyle(.secondary)
                    }
                }.accessibilityIdentifier("accountConnections")
            }
            PrivacyFields(preferences: $preferences, isDemo: model.isDemo)
            Section {
                Button("保存隐私偏好") {
                    if model.applyPrivacyPreferences(preferences, original: originalPreferences) { preferences = model.journal.preferences; originalPreferences = preferences; model.notice = "偏好已保存。" }
                }
            }
            if model.isDemo {
                Section("演示场景") {
                    Picker("场景", selection: $model.scenario) { ForEach(DemoScenario.allCases, id: \.self) { Text($0.rawValue).tag($0) } }
                        .accessibilityIdentifier("scenarioPicker").disabled(model.busy != nil)
                    Text("离线仍能查看和编辑本地记录；生成操作模拟失败。").font(.footnote)
                }
            }
            Section { RequestStatus(model: model) }
            Section("本地记录") {
                Text("记录保存在本机，未启用 CloudKit。退出账户会保留该账户尚未上传的记录，再次登录可继续。")
                if model.isDemo { Button("重置演示数据", role: .destructive) { confirmReset = true } }
                else {
                    Button("清除此设备的记录", role: .destructive) { confirmLocal = true }.disabled(model.busy != nil)
                    if case .signedIn = model.authState { Button("仅删除云端记录", role: .destructive) { confirmCloud = true }.disabled(model.busy != nil) }
                }
            }
            Section("关于 Steady") { Text("清爽、安静的健康日记 · 内测版"); Text("报告不是医疗诊断；训练草案须由你确认。").font(.footnote) }
        }
        .journalSurface().navigationTitle("设置与隐私").navigationBarTitleDisplayMode(.inline)
        .onAppear { preferences = model.journal.preferences; originalPreferences = preferences }
        .onChange(of: model.authState) { _, _ in preferences = model.journal.preferences; originalPreferences = preferences }
        .onChange(of: model.journal.preferences) { _, value in
            if preferences.healthRead == originalPreferences.healthRead { preferences.healthRead = value.healthRead }
            if preferences.cloudSync == originalPreferences.cloudSync { preferences.cloudSync = value.cloudSync }
            if preferences.aiProcessing == originalPreferences.aiProcessing { preferences.aiProcessing = value.aiProcessing }
            originalPreferences = value
        }
        .confirmationDialog("删除本机全部演示记录？", isPresented: $confirmReset, titleVisibility: .visible) {
            Button("删除并重置", role: .destructive) { model.reset() }
        } message: { Text("无法撤销，不影响苹果健康或其他 App。") }
        .confirmationDialog("清除此设备的记录？", isPresented: $confirmLocal, titleVisibility: .visible) {
            Button("清除本机记录", role: .destructive) { model.clearLocalRecords() }
        } message: { Text("未同步的修改会丢失。云端和苹果健康原始数据不受影响。") }
        .confirmationDialog("仅删除云端记录？", isPresented: $confirmCloud, titleVisibility: .visible) {
            Button("删除云记录并关闭同步", role: .destructive) { model.clearCloudRecords(); preferences.cloudSync = false }
        } message: { Text("本机副本保留，云端记录不可恢复。其他设备再次同步时会收到删除标记。") }
    }
}

struct ConflictView: View {
    @Bindable var model: AppModel
    let conflict: RecordConflict
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        Form {
            Section("本机版本") { Text(ConflictDescription.render(conflict.local, kind: conflict.kind)).font(.footnote).textSelection(.enabled) }
            Section("云端版本") { Text(conflict.remote.deleted ? "这条记录已在云端删除" : ConflictDescription.render(conflict.remote.payload, kind: conflict.kind)).font(.footnote).textSelection(.enabled) }
            Button("保留云端版本") { model.resolveConflict(conflict, useLocal: false); dismiss() }
            Button(conflict.remote.deleted ? "将本机副本恢复为新记录" : "保留本机版本") { model.resolveConflict(conflict, useLocal: true); dismiss() }
            Text("不会静默覆盖你的修改。云端删除优先；恢复内容时请新建记录。").font(.footnote)
        }.journalSurface().navigationTitle("处理同步冲突")
    }
}

struct OnboardingView: View {
    @Bindable var model: AppModel
    @State private var step = 0
    @State private var preferences = UserPreferences()
    private let titles = ["慢慢来，也在向前", "你想从哪里开始", "连接苹果健康", "保留你的进展", "数据由你掌握"]
    var body: some View {
        NavigationStack {
            Group {
                if step == 1 { Form { PreferenceFields(preferences: $preferences); nextButton } }
                else if step == 3 {
                    Form {
                        Section {
                            JournalWelcome(title: "慢慢来\n我们一起记录", expression: .shy)
                            Text("登录不会自动同步记录。云同步和 AI 处理仍由你分别决定。")
                                .font(.subheadline).foregroundStyle(.secondary)
                        }
                        if model.isDemo { Section { Text("演示模式无需登录。") } }
                        else { Section("邮箱验证码") { EmailLoginFields(model: model) } }
                        Section { RequestStatus(model: model); nextButton }
                    }
                }
                else if step == 4 { Form { PrivacyFields(preferences: $preferences, isDemo: model.isDemo); RequestStatus(model: model); nextButton } }
                else {
                    JournalPage {
                        Text("STEADY").font(.caption.weight(.semibold)).tracking(4).foregroundStyle(.tint)
                        ModeBadge(isDemo: model.isDemo)
                        JournalCard {
                            if step == 0 {
                                JournalWelcome(title: "一本 关于你的健康日记", expression: .happy)
                                Text("把睡眠、活动和每天的感受放在一起。先看见记录，再选择适合自己的节奏。")
                                Text(model.isDemo ? "现在体验的是虚构样例，不需要登录，也不会上传健康信息。" : "无需登录即可在本机记录。健康、云同步与 AI 的用途分别由你决定。")
                            } else if step == 2 {
                                Text("健康读取，单独由你决定").font(.title2)
                                Text("读取体重、睡眠、步数和 Apple 运动分钟。原始样本留在设备，缺失不当作零。")
                                if model.isDemo { Text("演示模式不会弹出健康授权。") }
                                else {
                                    Button("连接苹果健康") { model.connectHealth() }
                                        .journalPrimaryButton()
                                        .disabled(model.busy != nil)
                                        .accessibilityIdentifier("onboardingConnectHealth")
                                    RequestStatus(model: model)
                                    if model.journal.preferences.healthRead {
                                        HealthReadPreview(summaries: model.summaries)
                                    }
                                }
                            }
                        }
                        nextButton
                    }
                }
            }.journalSurface().navigationTitle(titles[step])
                .toolbar { if step > 0 { ToolbarItem(placement: .topBarLeading) { Button("返回") { step -= 1 } } } }
        }.onAppear { preferences = model.journal.preferences }
            .onChange(of: model.journal.preferences.healthRead) { _, value in preferences.healthRead = value }
    }
    private var nextButton: some View {
        Button(step == 4 ? "进入今天" : step == 0 ? "开始体验" : step == 2 && !model.isDemo && !model.journal.preferences.healthRead ? "暂不连接，继续" : "继续") {
            if step < 4 { step += 1 }
            else { preferences.onboardingComplete = true; _ = model.applyPreferences(preferences) }
        }.journalPrimaryButton().controlSize(.large).accessibilityIdentifier("onboardingNext")
    }
}

private struct HealthReadPreview: View {
    let summaries: [DailySummary]

    private var latest: DailySummary? {
        summaries.last { $0.weightKG != nil || $0.sleepMinutes != nil || $0.steps != nil || $0.activeMinutes != nil }
    }

    var body: some View {
        if let latest {
            VStack(alignment: .leading, spacing: 8) {
                Text("本机已有的苹果健康记录").font(.headline)
                Text(latest.dayKey).font(.caption).foregroundStyle(.secondary)
                if let steps = latest.steps { LabeledContent("步数", value: "\(steps.formatted()) 步") }
                if let sleep = latest.sleepMinutes { LabeledContent("睡眠", value: "\(sleep / 60) 小时 \(sleep % 60) 分") }
                if let active = latest.activeMinutes { LabeledContent("运动", value: "\(active) 分钟") }
                if let weight = latest.weightKG { LabeledContent("体重", value: String(format: "%.1f kg", weight)) }
            }
            .accessibilityIdentifier("healthReadPreview")
        } else {
            Text("尚未读到可显示的健康记录。")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}

private enum ConflictDescription {
    static func render(_ payload: String, kind: RecordKind) -> String {
        let data = Data(payload.utf8), decoder = WireCodec.decoder()
        switch kind {
        case .profiles:
            if let p = try? decoder.decode(UserPreferences.self, from: data) { return "目标：\(p.goal)\n经验：\(p.experience)\n器械：\(p.equipment)\n每次\(p.availableMinutes)分钟" }
        case .summaries:
            if let s = try? decoder.decode(DailySummary.self, from: data) { return "\(s.dayKey)\n体重：\(s.weightKG.map { String(format: "%.1f kg", $0) } ?? "暂无")\n睡眠：\(s.sleepMinutes.map { "\($0)分钟" } ?? "暂无")\n步数：\(s.steps.map(String.init) ?? "暂无")" }
        case .reports:
            if let r = try? decoder.decode(HealthReport.self, from: data) { return r.sections.map { "\($0.title)\n\($0.body)" }.joined(separator: "\n\n") }
        case .messages:
            if let m = try? decoder.decode(ChatMessage.self, from: data) { return m.content }
        case .sessions:
            if let s = try? decoder.decode(WorkoutSession.self, from: data) { return "\(s.title) · \(s.minutes)分钟\n\(s.scheduledAt.formatted(date: .abbreviated, time: .omitted))\n\(s.feedback?.note ?? "尚无反馈")" }
        default: break
        }
        if let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            return (object["text"] as? String) ?? (object["title"] as? String) ?? "已保存的记录"
        }
        return "记录暂时无法展示"
    }
}

struct EmailLoginFields: View {
    @Bindable var model: AppModel
    @State private var email = ""
    @State private var code = ""
    @State private var codeSent = false
    private var trimmedEmail: String { email.trimmingCharacters(in: .whitespacesAndNewlines) }
    var body: some View {
        if !model.isDemo {
            if !codeSent {
                TextField("输入你的邮箱", text: $email)
                    .keyboardType(.emailAddress).textContentType(.emailAddress)
                    .textInputAutocapitalization(.never).autocorrectionDisabled()
                    .accessibilityLabel("邮箱地址").accessibilityIdentifier("loginEmail")
                Button("发送验证码", systemImage: "paperplane") {
                    model.sendEmailCode(trimmedEmail, onSent: { codeSent = true })
                }.disabled(trimmedEmail.isEmpty || model.busy != nil)
            } else {
                Text("验证码已发送至 \(trimmedEmail)").font(.footnote).foregroundStyle(.secondary)
                TextField("邮箱验证码", text: $code).keyboardType(.numberPad).textContentType(.oneTimeCode)
                    .accessibilityIdentifier("loginCode")
                Button("验证并登录") { model.verifyEmailCode(trimmedEmail, code: code.trimmingCharacters(in: .whitespacesAndNewlines)) }
                    .journalPrimaryButton()
                    .disabled(code.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || model.busy != nil)
                    .accessibilityIdentifier("loginSubmit")
                Button("重新发送验证码") { model.sendEmailCode(trimmedEmail) }.disabled(model.busy != nil)
                Button("修改邮箱") { code = ""; codeSent = false }.disabled(model.busy != nil)
            }
        }
    }
}

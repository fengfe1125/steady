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
    @State private var confirmReset = false
    @State private var confirmDelete = false
    @State private var confirmImport = false
    @State private var confirmLocal = false
    @State private var confirmCloud = false
    @State private var deleteCode = ""
    var body: some View {
        Form {
            Section("账户与连接") {
                if case .signedIn = model.authState {
                    Text("已登录邮箱账户")
                    Button("退出账户") { model.signOut() }.disabled(model.busy != nil)
                    Button("获取删除账户验证码") { model.sendEmailCode("", deleting: true) }.disabled(model.busy != nil)
                    TextField("账户邮箱验证码", text: $deleteCode).keyboardType(.numberPad).textContentType(.oneTimeCode)
                    Button("删除账户与云端记录", role: .destructive) { confirmDelete = true }.disabled(model.busy != nil || deleteCode.isEmpty)
                } else {
                    Text(model.isDemo ? "演示模式 · 无需账户" : "未登录 · 本机记录仍可使用")
                    EmailLoginFields(model: model)
                }
                if !model.isDemo { Button("请求苹果健康读取权限") { model.connectHealth() }.disabled(model.busy != nil) }
                Button(model.isDemo ? "恢复云端历史（未接入）" : "同步并恢复云端历史") { model.restoreHistory() }.disabled(model.busy != nil)
                if model.canImportGuest { Button("将游客记录归入当前账户") { confirmImport = true } }
            }
            PrivacyFields(preferences: $preferences, isDemo: model.isDemo)
            Section {
                Button("保存隐私偏好") {
                    if model.applyPreferences(preferences) { model.notice = "偏好已保存。" }
                }
            }
            if model.isDemo {
                Section("演示场景") {
                    Picker("场景", selection: $model.scenario) { ForEach(DemoScenario.allCases, id: \.self) { Text($0.rawValue).tag($0) } }
                        .accessibilityIdentifier("scenarioPicker").disabled(model.busy != nil)
                    Text("离线仍能查看和编辑本地记录；生成操作模拟失败。").font(.footnote)
                }
            } else {
                Section("同步状态") {
                    Text(syncDescription)
                    LabeledContent("待同步", value: "\(model.syncDetails.pending) 条")
                    if let date = model.syncDetails.lastSync { LabeledContent("上次同步", value: date.formatted(date: .abbreviated, time: .shortened)) }
                    Text("仅在开启云同步后上传；断网修改保存在本机，联网后重试。").font(.footnote)
                    ForEach(model.conflicts) { conflict in
                        NavigationLink("处理冲突 · \(conflict.kind.rawValue)") { ConflictView(model: model, conflict: conflict) }
                    }
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
        .navigationTitle("设置与隐私").navigationBarTitleDisplayMode(.inline)
        .onAppear { preferences = model.journal.preferences }
        .onChange(of: model.authState) { _, _ in preferences = model.journal.preferences }
        .onChange(of: model.journal.preferences.healthRead) { _, value in preferences.healthRead = value }
        .confirmationDialog("删除本机全部演示记录？", isPresented: $confirmReset, titleVisibility: .visible) {
            Button("删除并重置", role: .destructive) { model.reset() }
        } message: { Text("无法撤销，不影响苹果健康或其他 App。") }
        .confirmationDialog("删除账户与所有云端记录？", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("验证身份并删除", role: .destructive) { model.deleteAccount(code: deleteCode) }
        } message: { Text("将验证账户邮箱身份，删除账户、云记录和本机账户记录。不会删除苹果健康原始数据。操作无法撤销，失败时会保留待完成状态。") }
        .confirmationDialog("清除此设备的记录？", isPresented: $confirmLocal, titleVisibility: .visible) {
            Button("清除本机记录", role: .destructive) { model.clearLocalRecords() }
        } message: { Text("未同步的修改会丢失。云端和苹果健康原始数据不受影响。") }
        .confirmationDialog("仅删除云端记录？", isPresented: $confirmCloud, titleVisibility: .visible) {
            Button("删除云记录并关闭同步", role: .destructive) { model.clearCloudRecords(); preferences.cloudSync = false }
        } message: { Text("本机副本保留，云端记录不可恢复。其他设备再次同步时会收到删除标记。") }
        .confirmationDialog("将游客记录复制到当前账户？", isPresented: $confirmImport, titleVisibility: .visible) {
            Button("确认归入") { model.importGuest() }
        } message: { Text("同日期已有记录保留账户版本；游客原件保留。只有开启云同步后才会上传。") }
    }
    private var syncDescription: String {
        switch model.syncState {
        case .notConfigured: "尚未配置云服务"
        case .idle: model.journal.preferences.cloudSync ? "等待同步或已同步" : "云同步已关闭"
        case .syncing: "正在同步"
        case .offline: "离线 · 记录留在本机"
        case .failed(let reason): reason
        }
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
        }.navigationTitle("处理同步冲突")
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
                else if step == 4 { Form { PrivacyFields(preferences: $preferences, isDemo: model.isDemo); RequestStatus(model: model); nextButton } }
                else {
                    JournalPage {
                        Text("STEADY").font(.caption.weight(.semibold)).tracking(4).foregroundStyle(.tint)
                        ModeBadge(isDemo: model.isDemo)
                        JournalCard {
                            if step == 0 {
                                Text("一本，关于你的健康日记").font(.title2.weight(.semibold))
                                Text("把睡眠、活动和每天的感受放在一起。先看见记录，再选择适合自己的节奏。")
                                Text(model.isDemo ? "现在体验的是虚构样例，不需要登录，也不会上传健康信息。" : "无需登录即可在本机记录。健康、云同步与 AI 的用途分别由你决定。")
                            } else if step == 2 {
                                Text("健康读取，单独由你决定").font(.title2)
                                Text("读取体重、睡眠、步数和 Apple 运动分钟。原始样本留在设备，缺失不当作零。")
                                if model.isDemo { Text("演示模式不会弹出健康授权。") }
                            } else {
                                Text("登录不等于同意同步").font(.title2)
                                Text("通过邮箱验证码登录账户；云同步和 AI 处理分别授权，也可以稍后设置。")
                                EmailLoginFields(model: model)
                                RequestStatus(model: model)
                            }
                        }
                        nextButton
                    }
                }
            }.navigationTitle(titles[step])
                .toolbar { if step > 0 { ToolbarItem(placement: .topBarLeading) { Button("返回") { step -= 1 } } } }
        }.onAppear { preferences = model.journal.preferences }
    }
    private var nextButton: some View {
        Button(step == 4 ? "进入今天" : step == 0 ? "开始体验" : "继续") {
            if step < 4 { step += 1 }
            else { preferences.onboardingComplete = true; _ = model.applyPreferences(preferences) }
        }.buttonStyle(.borderedProminent).controlSize(.large).accessibilityIdentifier("onboardingNext")
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
    var body: some View {
        if !model.isDemo {
            TextField("邮箱", text: $email).keyboardType(.emailAddress).textContentType(.emailAddress)
                .textInputAutocapitalization(.never).autocorrectionDisabled()
            Button("发送验证码") { model.sendEmailCode(email) }.disabled(email.isEmpty || model.busy != nil)
            TextField("邮箱验证码", text: $code).keyboardType(.numberPad).textContentType(.oneTimeCode)
            Button("验证并登录") { model.verifyEmailCode(email, code: code) }.disabled(code.isEmpty || email.isEmpty || model.busy != nil)
        }
    }
}

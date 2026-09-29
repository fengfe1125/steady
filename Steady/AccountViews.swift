import SwiftUI
import SteadyCore

extension AppModel {
    var isSignedIn: Bool { if case .signedIn = authState { true } else { false } }
    var accountDescription: String { isDemo ? "演示模式 · 无需账户" : isSignedIn ? "已登录邮箱账户" : "未登录 · 本机记录仍可使用" }
    var hasHealthSummary: Bool { summaries.contains { $0.metadata.source == .healthKit && $0.missingMetrics.count < 4 } }
    var cloudDescription: String {
        if isDemo { return "演示模式不会同步" }
        if !isSignedIn { return "请先登录邮箱账户" }
        if !journal.preferences.cloudSync { return "云同步已关闭" }
        switch syncState {
        case .notConfigured: return "尚未配置云服务"
        case .idle: return syncDetails.pending == 0 ? "没有待同步记录" : "等待同步"
        case .syncing: return "正在同步"
        case .offline: return "离线 · 记录保存在本机"
        case .failed(let reason): return "同步未完成：\(reason)"
        }
    }
}

struct AccountConnectionsView: View {
    @Bindable var model: AppModel
    @State private var confirmImport = false
    var body: some View {
        Form {
            Section {
                JournalWelcome(title: model.isSignedIn ? "记录与你同在" : "记录从这里开始", expression: .normal, presentation: .leaves)
                    .listRowInsets(EdgeInsets()).listRowBackground(Color.clear)
                Text(model.accountDescription)
                if !model.isSignedIn && !model.isDemo {
                    NavigationLink("使用邮箱登录") { EmailLoginView(model: model) }.accessibilityIdentifier("emailLogin")
                }
                if model.canImportGuest {
                    Button("将游客记录归入当前账户") { confirmImport = true }.disabled(model.busy != nil)
                }
            }
            Section("连接") {
                NavigationLink { HealthConnectionView(model: model) } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("苹果健康")
                        Text(model.isDemo ? "演示模式不读取健康" : model.hasHealthSummary ? "本机已有健康摘要" : "尚无可用摘要").font(.caption).foregroundStyle(.secondary)
                    }
                }
                NavigationLink { CloudRecordsView(model: model) } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("云端记录")
                        Text(model.cloudDescription).font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
            if model.isSignedIn {
                Section("账户管理") {
                    Button("退出账户") { model.signOut() }.disabled(model.busy != nil)
                    NavigationLink("删除账户") { DeleteAccountView(model: model) }.foregroundStyle(.red)
                }
            }
            Section { RequestStatus(model: model) }
        }.journalSurface().navigationTitle("账户与连接").navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("将游客记录复制到当前账户？", isPresented: $confirmImport, titleVisibility: .visible) {
            Button("确认归入") { model.importGuest() }
        } message: { Text("同日期已有记录保留账户版本；游客原件保留。只有开启云同步后才会上传。") }
    }
}

struct EmailLoginView: View {
    @Bindable var model: AppModel
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        Form {
            Section {
                JournalWelcome(title: "慢慢来\n我们一起记录", expression: .shy)
                    .listRowInsets(EdgeInsets()).listRowBackground(Color.clear)
                Text("a little better together").font(JournalFonts.english).foregroundStyle(SteadyTheme.secondary)
            }
            Section { EmailLoginFields(model: model) }
            Section {
                RequestStatus(model: model)
                Text("登录不会自动开启云同步或 AI，每项用途都由你决定").font(.footnote).foregroundStyle(.secondary)
            }
        }.journalSurface().navigationTitle("邮箱登录").navigationBarTitleDisplayMode(.inline)
        .onChange(of: model.authState) { _, _ in if model.isSignedIn { dismiss() } }
    }
}

struct HealthConnectionView: View {
    @Bindable var model: AppModel
    @State private var didRequest = false
    private var reading: Bool { model.busy == "正在请求健康读取" }
    var body: some View {
        Form {
            Section("本机摘要") {
                if reading { ProgressView("正在读取苹果健康") }
                else if didRequest, let error = model.error {
                    Label("这次读取未完成", systemImage: "exclamationmark.circle")
                    Text(error).font(.footnote)
                    if model.hasHealthSummary { Text("已有摘要仍保留在本机").font(.footnote) }
                } else {
                    Label(model.hasHealthSummary ? "本机已有健康摘要" : "暂未读到记录", systemImage: model.hasHealthSummary ? "checkmark.circle" : "heart")
                }
                if let latest = model.summaries.filter({ $0.metadata.source == .healthKit && $0.missingMetrics.count < 4 }).max(by: { $0.date < $1.date }) {
                    LabeledContent("最近记录日期", value: latest.dayKey)
                }
                Text("只有实际读到记录才显示摘要。未读到数据时，请检查苹果健康中的记录与读取许可。").font(.footnote).foregroundStyle(.secondary)
            }
            Section {
                Button(model.journal.preferences.healthRead ? "重新读取健康记录" : "连接苹果健康") { didRequest = true; model.connectHealth() }
                    .disabled(model.isDemo || model.busy != nil).accessibilityIdentifier("accountConnectHealth")
                Text(model.isDemo ? "演示模式不会读取苹果健康" : "读取许可在设置的隐私区管理，读取不会自动开启云同步或 AI").font(.footnote)
            }
        }.journalSurface().navigationTitle("苹果健康").navigationBarTitleDisplayMode(.inline)
    }
}

struct CloudRecordsView: View {
    @Bindable var model: AppModel
    private var enabled: Bool { !model.isDemo && model.isSignedIn && model.journal.preferences.cloudSync && model.busy == nil && model.syncState != .syncing }
    var body: some View {
        Form {
            Section("同步状态") {
                Text(model.cloudDescription)
                LabeledContent("待同步", value: "\(model.syncDetails.pending) 条")
                LabeledContent("上次同步", value: model.syncDetails.lastSync?.formatted(date: .abbreviated, time: .shortened) ?? "尚无同步记录")
                if model.syncState == .syncing { ProgressView("正在同步") }
            }
            Section {
                if !model.isSignedIn && !model.isDemo { NavigationLink("先登录邮箱账户") { EmailLoginView(model: model) } }
                if !model.journal.preferences.cloudSync { Text("返回设置，在隐私区单独开启云端同步后再继续").font(.footnote) }
                Button("立即同步") { model.scheduleSync() }.disabled(!enabled)
                Button("同步并恢复云端历史") { model.restoreHistory() }.disabled(!enabled)
                Text("断网修改保存在本机，联网后重试。关闭同步不会删除已有云端记录。").font(.footnote).foregroundStyle(.secondary)
            }
            if !model.conflicts.isEmpty {
                Section("需要处理的版本") {
                    ForEach(model.conflicts) { conflict in
                        NavigationLink("处理冲突 · \(conflict.kind.rawValue)") { ConflictView(model: model, conflict: conflict) }
                    }
                }
            }
            Section { RequestStatus(model: model) }
        }.journalSurface().navigationTitle("云端记录").navigationBarTitleDisplayMode(.inline)
    }
}

struct DeleteAccountView: View {
    @Bindable var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var verifying = false
    @State private var sent = false
    @State private var code = ""
    @State private var confirm = false
    var body: some View {
        Form {
            Section("删除前请确认") {
                Text("将删除账户、云端记录和本机账户记录。苹果健康中的原始数据不会删除。操作无法撤销，失败时会保留待完成状态。")
                if !verifying { Button("继续验证账户") { verifying = true } }
            }
            if verifying {
                Section("邮箱验证码") {
                    Button(sent ? "重新发送删除验证码" : "发送删除验证码") { model.sendEmailCode("", deleting: true, onSent: { sent = true }) }.disabled(model.busy != nil)
                    if sent {
                        TextField("账户邮箱验证码", text: $code).keyboardType(.numberPad).textContentType(.oneTimeCode)
                        Button("删除账户与云端记录", role: .destructive) { confirm = true }
                            .disabled(model.busy != nil || code.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                }
            }
            Section { RequestStatus(model: model); Button("取消 返回账户") { dismiss() }.disabled(model.busy != nil) }
        }.journalSurface().navigationTitle("删除账户").navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("确认永久删除账户与记录？", isPresented: $confirm, titleVisibility: .visible) {
            Button("验证并永久删除", role: .destructive) { model.deleteAccount(code: code.trimmingCharacters(in: .whitespacesAndNewlines)) }
        }
        .onChange(of: model.authState) { _, _ in if !model.isSignedIn { dismiss() } }
    }
}

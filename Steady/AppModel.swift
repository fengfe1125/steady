import Foundation
import Observation
import SteadyCore

@MainActor @Observable final class AppModel {
    var journal: JournalState
    var summaries: [DailySummary] = []
    var plans: [TrainingPlan] = []
    var scenario: DemoScenario = .normal
    var error: String?
    var busy: String?
    var notice: String?
    var selectedTab = 0
    var draft: TrainingPlan?
    var presentedReport: HealthReport?
    var activeConversationID: UUID?
    var showChat = false
    var showPlanForm = false
    var authState: AuthState = .signedOut
    var syncState: SyncState = .notConfigured
    var syncDetails = SyncDetails()
    var conflicts: [RecordConflict] = []
    var canImportGuest = false
    let isDemo: Bool
    @ObservationIgnored let liveStore: DeviceRepository?
    @ObservationIgnored private var syncTask: Task<Void, Never>?
    @ObservationIgnored private var loading = false
    @ObservationIgnored private var loadWaiters: [CheckedContinuation<Void, Never>] = []
    @ObservationIgnored private var retryAttempt = 0
    @ObservationIgnored private var request: Task<Void, Never>?
    @ObservationIgnored private var requestID: UUID?
    @ObservationIgnored let health: any HealthDataService
    @ObservationIgnored let coach: any CoachService
    @ObservationIgnored let auth: any AuthService
    @ObservationIgnored let sync: any SyncService
    @ObservationIgnored let planStore: any PlanRepository
    @ObservationIgnored let journalStore: any JournalRepository

    init(health: any HealthDataService = DemoHealthDataService(),
         coach: any CoachService = DemoCoachService(delay: .milliseconds(550)),
         auth: any AuthService = DemoAuthService(), sync: any SyncService = DemoSyncService(),
         planStore: any PlanRepository, journalStore: any JournalRepository, liveStore: DeviceRepository? = nil) throws {
        self.liveStore = liveStore; self.isDemo = liveStore == nil
        self.health = health; self.coach = coach; self.auth = auth; self.sync = sync
        self.planStore = planStore; self.journalStore = journalStore
        journal = try journalStore.load()
        // A terminated stream is never restored as still generating.
        for c in journal.conversations.indices {
            for m in journal.conversations[c].messages.indices where journal.conversations[c].messages[m].status == .generating {
                journal.conversations[c].messages[m].status = .cancelled
            }
        }
        plans = try planStore.plans()
    }

    var today: DailySummary? { summaries.last }
    var confirmedPlans: [TrainingPlan] { plans.filter { $0.status == .confirmed } }
    var conversation: Conversation? { journal.conversations.first { $0.id == activeConversationID } }

    private func acquireLoad() async throws {
        while loading {
            await withCheckedContinuation { loadWaiters.append($0) }
            try Task.checkCancellation()
        }
        try Task.checkCancellation()
        loading = true
    }
    private func releaseLoad() {
        loading = false
        let waiters = loadWaiters; loadWaiters.removeAll()
        for waiter in waiters { waiter.resume() }
    }
    func load() async {
        guard !loading else { return }
        do {
            try await acquireLoad()
            defer { releaseLoad() }
            try await reload()
        } catch is CancellationError {} catch {
            guard !Task.isCancelled else { return }
            self.error = error.localizedDescription; ensureToday()
        }
    }
    private func reload() async throws {
        let accountState = await auth.state()
        try Task.checkCancellation()
        try activate(accountState)
        try Task.checkCancellation()
        let epoch = liveStore?.epoch
        let currentSyncState = await sync.state()
        try Task.checkCancellation()
        guard liveStore?.epoch == epoch else { throw CancellationError() }
        syncState = currentSyncState
        if isDemo {
            let values = try await (health as? DemoHealthDataService ?? DemoHealthDataService()).summaries(scenario: scenario)
            try Task.checkCancellation()
            summaries = values
            if !journal.seeded, let today {
                let report = try await DemoCoachService(delay: .zero).report(for: today, history: summaries, scenario: .normal)
                try Task.checkCancellation()
                var next = journal; next.reports = [report]; next.seeded = true
                try journalStore.save(next); journal = next
            }
        } else {
            try reloadLocal()
            defer {
                if !Task.isCancelled, liveStore?.epoch == epoch { ensureToday() }
            }
            if journal.preferences.healthRead {
                let now = Date(), start = Calendar.current.date(byAdding: .day, value: -29, to: Date())!
                let values = try await health.summaries(from: start, through: now)
                try Task.checkCancellation()
                guard liveStore?.epoch == epoch, journal.preferences.healthRead else { throw CancellationError() }
                summaries = Array(values.suffix(30))
            }
            scheduleSync()
        }
    }
    private func ensureToday() {
        guard !isDemo else { return }
        let calendar = Calendar.current, key = HealthAggregation.dayKey(Date(), calendar: Calendar.current)
        if !summaries.contains(where: { $0.dayKey == key && $0.timeZoneID == calendar.timeZone.identifier }) {
            summaries.append(DailySummary(metadata: RecordMetadata(source: .healthKit), dayKey: key, timeZoneID: calendar.timeZone.identifier,
                date: calendar.startOfDay(for: Date()), weightKG: nil, sleepMinutes: nil, steps: nil, activeMinutes: nil))
        }
    }
    func activate(_ state: AuthState) throws {
        let wasOnboarded = journal.preferences.onboardingComplete
        authState = state
        guard let liveStore else { return }
        let user: UUID? = if case .signedIn(let id) = state { id } else { nil }
        let partition = user?.uuidString.lowercased() ?? "guest"
        guard liveStore.partition != partition else { return }
        request?.cancel(); request = nil; requestID = nil; busy = nil; syncTask?.cancel()
        liveStore.select(userID: user)
        draft = nil; presentedReport = nil; activeConversationID = nil; showChat = false; showPlanForm = false
        try reloadLocal(); ensureToday()
        if wasOnboarded && !journal.preferences.onboardingComplete { journal.preferences.onboardingComplete = true; try journalStore.save(journal) }
        canImportGuest = try user != nil && liveStore.hasGuestRecords()
    }
    func observeAuth() async {
        for await state in auth.changes() {
            guard !Task.isCancelled else { return }
            do { try activate(state); await load() } catch { self.error = error.localizedDescription }
        }
    }
    private func reloadLocal() throws {
        journal = try journalStore.load(); plans = try planStore.plans()
        if let liveStore {
            summaries = Array(try liveStore.summaries().suffix(30)); syncDetails = try liveStore.details(); conflicts = try liveStore.conflicts()
        }
    }
    func scheduleSync() {
        guard !isDemo else { return }
        syncTask?.cancel()
        syncTask = Task { [weak self] in
            do { try await Task.sleep(for: .milliseconds(400)); await self?.synchronize() } catch {}
        }
    }
    func synchronize() async {
        guard !isDemo else { return }
        let epoch = liveStore?.epoch
        do {
            if journal.preferences.cloudSync { syncState = .syncing }
            try await sync.sync()
            guard !Task.isCancelled, epoch == liveStore?.epoch else { return }
            retryAttempt = 0; syncState = await sync.state(); syncDetails = await sync.details()
            if busy == nil { try reloadLocal(); ensureToday() }
        } catch is CancellationError {} catch {
            syncState = .failed(error.localizedDescription)
            retryAttempt += 1
            let delay = min(300.0, pow(2.0, Double(min(retryAttempt, 8)))) + Double.random(in: 0...1)
            syncTask = Task { [weak self] in
                do { try await Task.sleep(for: .seconds(delay)); await self?.synchronize() } catch {}
            }
        }
    }
    @discardableResult func applyPreferences(_ preferences: UserPreferences) -> Bool {
        var next = preferences
        let request = !isDemo && preferences.healthRead && !journal.preferences.healthRead
        if request { next.healthRead = false }
        guard savePreferences(next) else { return false }
        if request { connectHealth() }
        return true
    }
    @discardableResult func applyPrivacyPreferences(_ edited: UserPreferences, original: UserPreferences) -> Bool {
        var next = journal.preferences
        if edited.healthRead != original.healthRead { next.healthRead = edited.healthRead }
        if edited.cloudSync != original.cloudSync { next.cloudSync = edited.cloudSync }
        if edited.aiProcessing != original.aiProcessing { next.aiProcessing = edited.aiProcessing }
        return applyPreferences(next)
    }
    func connectHealth() {
        begin("正在请求健康读取") { [self] in
            // Finish earlier reads before authorization resets HealthKit's incremental cache.
            try await acquireLoad()
            defer { releaseLoad() }
            try await health.requestAuthorization()
            try Task.checkCancellation()
            var prefs = journal.preferences; prefs.healthRead = true
            guard savePreferences(prefs) else { return }
            try await reload()
            try Task.checkCancellation()
            let daysWithData = summaries.filter { $0.weightKG != nil || $0.sleepMinutes != nil || $0.steps != nil || $0.activeMinutes != nil }.count
            notice = daysWithData > 0
                ? "本机现有最近30天中 \(daysWithData) 天的健康摘要。"
                : "系统已处理授权请求，但尚未读到记录。请在「健康」App → 头像 → 隐私 → App 中检查 Steady 的读取权限。"
        }
    }
    func signOut() {
        cancel(); syncTask?.cancel()
        begin("正在退出账户") { [self] in
            try await auth.signOut(); try activate(await auth.state())
        }
    }
    func deleteAccount(code: String = "") {
        cancel(); syncTask?.cancel()
        begin("正在删除账户") { [self] in
            let partition = liveStore?.partition
            try await auth.deleteAccount(code: code)
            if let partition { try liveStore?.purge(partition: partition) }
            try activate(await auth.state()); notice = "账户已删除。苹果健康中的原始数据不受影响。"
        }
    }
    func clearLocalRecords() {
        cancel(); syncTask?.cancel()
        do { try liveStore?.purgeCurrentPartition(); try reloadLocal(); ensureToday(); notice = "此设备账户记录已清除，云端记录未删除。" }
        catch { self.error = error.localizedDescription }
    }
    func clearCloudRecords() {
        cancel(); syncTask?.cancel()
        var prefs = journal.preferences; prefs.cloudSync = false; _ = savePreferences(prefs)
        syncTask?.cancel()
        begin("正在删除云端记录") { [self] in
            try await sync.clearCloudRecords(); notice = "云端记录已删除，本机副本保留，云同步已关闭。"
        }
    }
    func importGuest() {
        do { try liveStore?.importGuest(); canImportGuest = false; try reloadLocal(); ensureToday(); scheduleSync() }
        catch { self.error = error.localizedDescription }
    }
    func resolveConflict(_ conflict: RecordConflict, useLocal: Bool) {
        do { try liveStore?.resolve(id: conflict.id, useLocal: useLocal); try reloadLocal(); ensureToday(); scheduleSync() }
        catch { self.error = error.localizedDescription }
    }

    @discardableResult func saveJournal(_ next: JournalState) -> Bool {
        do { try journalStore.save(next); journal = next; scheduleSync(); return true }
        catch { self.error = "本地保存失败：\(error.localizedDescription)"; return false }
    }
    @discardableResult func savePreferences(_ preferences: UserPreferences) -> Bool {
        if !isDemo && ((!preferences.aiProcessing && journal.preferences.aiProcessing) || (!preferences.healthRead && journal.preferences.healthRead)) { cancel() }
        var next = journal; next.preferences = preferences; next.preferences.metadata.updatedAt = Date()
        return saveJournal(next)
    }
    @discardableResult func saveNote(_ note: String) -> Bool {
        guard let today else { return false }
        var next = journal; next.notes[today.dayKey] = note
        return saveJournal(next)
    }
    @discardableResult func savePlan(_ plan: TrainingPlan) -> Bool {
        do {
            var updated = plan
            let previous = plans.first { $0.id == plan.id }
            for session in plan.sessions where previous?.sessions.first(where: { $0.id == session.id }) != session {
                try updated.updateSession(session)
            }
            updated.metadata.updatedAt = Date()
            try planStore.save(updated); plans = try planStore.plans(); scheduleSync(); return true
        }
        catch { self.error = "计划保存失败：\(error.localizedDescription)"; return false }
    }

    private func begin(_ label: String, operation: @escaping @MainActor () async throws -> Void) {
        guard request == nil else { return }
        let id = UUID(); requestID = id; busy = label; notice = nil; error = nil
        request = Task { [weak self] in
            do { try await operation() }
            catch is CancellationError { }
            catch { if self?.requestID == id { self?.error = error.localizedDescription } }
            if self?.requestID == id { self?.busy = nil; self?.request = nil; self?.requestID = nil; self?.scheduleSync() }
        }
    }
    func cancel() {
        request?.cancel(); request = nil; requestID = nil; busy = nil
        for c in journal.conversations.indices {
            for m in journal.conversations[c].messages.indices where journal.conversations[c].messages[m].status == .generating {
                journal.conversations[c].messages[m].status = .cancelled
            }
        }
        saveJournal(journal); notice = "已停止生成，已有记录保持不变。"
    }
    func generateReport() {
        guard let today else { return }
        let scenario = scenario, history = summaries
        begin(isDemo ? "正在整理演示报告" : "正在整理日报") { [self] in
            let report: HealthReport
            if isDemo, let demo = coach as? DemoCoachService { report = try await demo.report(for: today, history: history, scenario: scenario) }
            else { report = try await coach.report(for: today, history: history) }
            try Task.checkCancellation()
            var next = journal; next.reports.insert(report, at: 0)
            if saveJournal(next) { presentedReport = report }
        }
    }
    func signIn() {
        begin(isDemo ? "正在打开登录演示" : "正在通过 Apple 登录") { [self] in
            try await auth.signIn()
            try activate(await auth.state())
        }
    }
    func sendEmailCode(_ email: String, deleting: Bool = false, onSent: (@MainActor () -> Void)? = nil) {
        begin("正在发送验证码") { [self] in
            try await auth.sendCode(email: email, deleting: deleting)
            try Task.checkCancellation()
            notice = deleting ? "验证码已发送至账户邮箱，请输入后确认删除。" : "验证码已发送，请查看邮箱。"
            onSent?()
        }
    }
    func verifyEmailCode(_ email: String, code: String) {
        begin("正在验证邮箱") { [self] in
            try await auth.verifyCode(email: email, code: code)
            try activate(await auth.state())
        }
    }
    func restoreHistory() {
        if !isDemo { scheduleSync(); return }
        begin("正在恢复历史演示") { [self] in try await sync.restoreHistory(); syncState = await sync.state() }
    }
    func openChat(id: UUID? = nil) {
        prepareChat(id: id)
        showChat = activeConversationID != nil
    }
    func prepareChat(id: UUID? = nil) {
        if let id { activeConversationID = id }
        else {
            let chat = Conversation(title: "关于今天的状态")
            var next = journal; next.conversations.insert(chat, at: 0)
            guard saveJournal(next) else { return }; activeConversationID = chat.id
        }
    }
    func send(_ question: String) {
        guard busy == nil, let cid = activeConversationID,
              let index = journal.conversations.firstIndex(where: { $0.id == cid }),
              !question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        var next = journal
        next.conversations[index].messages.append(ChatMessage(role: .user, content: question))
        let response = ChatMessage(role: .coach, content: "", status: .generating)
        next.conversations[index].messages.append(response)
        next.conversations[index].metadata.updatedAt = Date()
        guard saveJournal(next) else { return }
        let summary = today, scenario = scenario
        begin(isDemo ? "演示教练正在回复" : "教练正在回复") { [self] in
            do {
                let stream: AsyncThrowingStream<CoachEvent, Error>
                if isDemo, let demo = coach as? DemoCoachService { stream = demo.answer(question: question, summary: summary, scenario: scenario) }
                else { stream = coach.answer(question: question, summary: summary, messages: journal.conversations[index].messages) }
                var lastCheckpoint = Date.distantPast
                for try await event in stream {
                    try Task.checkCancellation()
                    guard let c = journal.conversations.firstIndex(where: { $0.id == cid }),
                          let m = journal.conversations[c].messages.firstIndex(where: { $0.id == response.id }) else { return }
                    switch event {
                    case .delta(let text): journal.conversations[c].messages[m].content += text
                    case .evidence(let refs): journal.conversations[c].messages[m].evidence = refs
                    case .complete: journal.conversations[c].messages[m].status = .complete
                    }
                    if !isDemo && Date().timeIntervalSince(lastCheckpoint) >= 0.5 {
                        try journalStore.save(journal); lastCheckpoint = Date()
                    }
                }
                try Task.checkCancellation()
                saveJournal(journal)
            } catch {
                if let c = journal.conversations.firstIndex(where: { $0.id == cid }),
                   let m = journal.conversations[c].messages.firstIndex(where: { $0.id == response.id }) {
                    journal.conversations[c].messages[m].status = error is CancellationError ? .cancelled : .failed
                    saveJournal(journal)
                }
                throw error
            }
        }
    }
    func generatePlan(_ preferences: UserPreferences) {
        let scenario = scenario
        begin(isDemo ? "正在生成演示草案" : "正在生成训练草案") { [self] in
            let plan: TrainingPlan
            if isDemo, let demo = coach as? DemoCoachService { plan = try await demo.planDraft(preferences: preferences, scenario: scenario) }
            else { plan = try await coach.planDraft(preferences: preferences) }
            try Task.checkCancellation()
            if savePlan(plan) { savePreferences(preferences); draft = plan }
        }
    }
    @discardableResult func confirmDraft(_ plan: TrainingPlan) -> Bool {
        do {
            var confirmed = plan; try confirmed.confirm()
            if savePlan(confirmed) {
                draft = nil; showPlanForm = false; showChat = false; presentedReport = nil; selectedTab = 3
                return true
            }
        } catch { self.error = error.localizedDescription }
        return false
    }
    func reset() {
        guard isDemo else { error = "真实记录请通过账户管理分别处理。"; return }
        cancel()
        do {
            for plan in try planStore.plans() { try planStore.delete(id: plan.id) }
            plans = try planStore.plans()
            if saveJournal(JournalState()) {
                scenario = .normal; draft = nil; presentedReport = nil; activeConversationID = nil
                showChat = false; showPlanForm = false; notice = nil
                Task { await load() }
            }
        } catch { self.error = "重置未完成：\(error.localizedDescription)" }
    }
}

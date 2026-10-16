import Foundation
import Testing
import SteadyCore
@testable import SteadyAppState

@MainActor private final class MemoryJournal: JournalRepository {
    var state = JournalState()
    func load() throws -> JournalState { state }
    func save(_ state: JournalState) throws { self.state = state }
}
@MainActor private final class FailingPlans: PlanRepository {
    func plans() throws -> [TrainingPlan] { [] }
    func save(_ plan: TrainingPlan) throws { throw ServiceError.simulatedFailure }
    func delete(id: UUID) throws { throw ServiceError.simulatedFailure }
}
@MainActor private func awaitIdle(_ model: AppModel) async throws {
    for _ in 0..<500 {
        if model.busy == nil { return }
        try await Task.sleep(for: .milliseconds(2))
    }
    Issue.record("Request did not finish")
}

private actor HealthConnectionStub: HealthDataService {
    private(set) var authorizationRequests = 0
    private(set) var reads = 0
    func requestAuthorization() async throws { authorizationRequests += 1 }
    func summaries(from: Date, through: Date) async throws -> [DailySummary] {
        reads += 1
        try await Task.sleep(for: .milliseconds(50))
        let calendar = Calendar.current
        let day = calendar.startOfDay(for: through)
        return [DailySummary(metadata: RecordMetadata(source: .healthKit),
                             dayKey: HealthAggregation.dayKey(day, calendar: calendar),
                             timeZoneID: calendar.timeZone.identifier, date: day,
                             weightKG: nil, sleepMinutes: nil, steps: 1234, activeMinutes: nil)]
    }
}

@Test @MainActor func healthConnectionWaitsForFirstReadBeforeReportingSuccess() async throws {
    let store = try DeviceRepository(inMemory: true)
    let health = HealthConnectionStub()
    let model = try AppModel(health: health, planStore: store, journalStore: store, liveStore: store)
    model.connectHealth()
    try await awaitIdle(model)
    #expect(await health.authorizationRequests == 1)
    #expect(await health.reads == 1)
    #expect(model.journal.preferences.healthRead)
    #expect(model.today?.steps == 1234)
    #expect(model.notice?.contains("本机现有最近30天中 1 天的健康摘要") == true)
}

@Test @MainActor func failedConfirmationDoesNotDismissResumedDraft() async throws {
    let model = try AppModel(planStore: FailingPlans(), journalStore: MemoryJournal())
    let plan = try await DemoCoachService(delay: .zero).planDraft(preferences: { var p = UserPreferences(); p.availableEquipmentIDs = ["wall"]; return p }(), scenario: .normal)
    #expect(model.draft == nil)
    #expect(!model.confirmDraft(plan))
    #expect(model.error != nil)
    #expect(model.confirmedPlans.isEmpty)
}

@Test @MainActor func appFlowKeepsDraftSeparateAndPersistsNote() async throws {
    let journal = MemoryJournal()
    let plans = try LocalPlanRepository(inMemory: true)
    let model = try AppModel(coach: DemoCoachService(delay: .zero), planStore: plans, journalStore: journal)
    await model.load()
    #expect(model.saveNote("测试补记"))
    model.generateReport(); try await awaitIdle(model)
    #expect(model.journal.reports.count == 2)
    #expect(model.presentedReport != nil)
    model.generatePlan({ var p = UserPreferences(); p.availableEquipmentIDs = ["wall"]; return p }()); try await awaitIdle(model)
    let draft = try #require(model.draft)
    #expect(model.confirmedPlans.isEmpty)
    #expect(model.confirmDraft(draft))
    #expect(model.confirmedPlans.count == 1)
    #expect(model.presentedReport == nil)
    #expect(model.selectedTab == 3)
    let reopened = try AppModel(planStore: plans, journalStore: journal)
    #expect(reopened.confirmedPlans.count == 1)
    #expect(reopened.journal.notes["2026-09-21"] == "测试补记")
}

@Test @MainActor func cancelledChatCannotFinishOrClearNewRequest() async throws {
    let model = try AppModel(coach: DemoCoachService(delay: .milliseconds(20)),
        planStore: LocalPlanRepository(inMemory: true), journalStore: MemoryJournal())
    await model.load(); model.prepareChat(); model.send("第一个问题")
    for _ in 0..<100 {
        if model.conversation?.messages.last?.content.isEmpty == false { break }
        try await Task.sleep(for: .milliseconds(2))
    }
    model.cancel()
    #expect(model.conversation?.messages.last?.status == .cancelled)
    model.send("第二个问题")
    try await awaitIdle(model)
    #expect(model.conversation?.messages.count == 4)
    #expect(model.conversation?.messages[1].status == .cancelled)
    #expect(model.conversation?.messages.last?.status == .complete)
}

private struct SignedInAuth: AuthService {
    let id: UUID
    func state() async -> AuthState { .signedIn(userID: id) }
    func signIn() async throws {}
    func signOut() async throws {}
    func deleteAccount() async throws {}
}
@MainActor private final class FailOnceSync: SyncService {
    var calls = 0
    private var current: SyncState = .idle
    func state() async -> SyncState { current }
    func sync() async throws {
        calls += 1
        if calls == 1 { current = .failed("temporary"); throw ServiceError.simulatedFailure }
        current = .idle
    }
    func retry() async throws { try await sync() }
    func restoreHistory() async throws { try await sync() }
}
@Test @MainActor func liveSyncRetriesAfterTransientFailureWithoutLosingLocalNote() async throws {
    let user = UUID(), store = try DeviceRepository(inMemory: true)
    store.select(userID: user)
    var journal = JournalState()
    journal.preferences.cloudSync = true
    journal.notes["2026-09-25"] = "离线待同步"
    try store.save(journal)
    let sync = FailOnceSync()
    let model = try AppModel(auth: SignedInAuth(id: user), sync: sync,
                             planStore: store, journalStore: store, liveStore: store)
    await model.load()
    for _ in 0..<40 where sync.calls == 0 { try await Task.sleep(for: .milliseconds(50)) }
    #expect(sync.calls == 1)
    #expect(try store.load().notes["2026-09-25"] == "离线待同步")
    for _ in 0..<100 where sync.calls < 2 { try await Task.sleep(for: .milliseconds(50)) }
    #expect(sync.calls == 2)
    #expect(model.syncState == .idle)
    #expect(try store.load().notes["2026-09-25"] == "离线待同步")
}

@Test @MainActor func privacySavePreservesNewerTrainingAndConsentValues() throws {
    let model = try AppModel(planStore: LocalPlanRepository(inMemory: true), journalStore: MemoryJournal())
    let original = model.journal.preferences
    var edited = original; edited.aiProcessing = !original.aiProcessing
    var newer = original; newer.goal = "updated elsewhere"; newer.cloudSync = true
    #expect(model.savePreferences(newer))
    #expect(model.applyPrivacyPreferences(edited, original: original))
    #expect(model.journal.preferences.goal == "updated elsewhere")
    #expect(model.journal.preferences.cloudSync)
    #expect(model.journal.preferences.aiProcessing == edited.aiProcessing)
}

@Test @MainActor func catalogPlanSavesHistoricalFeedbackButRejectsDuplicateDates() throws {
    let store = try LocalPlanRepository(inMemory: true)
    var preferences = UserPreferences(); preferences.availableEquipmentIDs = ["wall"]
    var plan = try ExerciseCatalog.load().demoPlan(preferences: preferences, today: DemoData.today, calendar: DemoData.calendar)
    plan.sessions[0].exercises[1].catalogID = "future-exercise"
    plan.sessions[0].exercises[1].catalogVersion = 99
    try store.save(plan)
    let model = try AppModel(planStore: store, journalStore: MemoryJournal())
    plan.sessions[0].feedback = try WorkoutFeedback(completed: true, perceivedEffort: 3, note: "历史计划反馈")
    #expect(model.savePlan(plan))
    #expect(model.plans.first?.sessions[0].exercises[1].catalogID == "future-exercise")
    var invalid = plan
    invalid.sessions[1].scheduledAt = invalid.sessions[0].scheduledAt
    #expect(!model.savePlan(invalid))
    #expect(model.plans.first?.sessions[1].scheduledAt == plan.sessions[1].scheduledAt)
    plan.sessions[0].exercises[1] = Exercise(name: "旧端改名后的动作", prescription: "新的文字说明")
    #expect(model.savePlan(plan))
}

@Test @MainActor func lowerBodyDatesCannotBypassRecoveryCheckAndSnapshotsStayReadable() async throws {
    let catalog = try ExerciseCatalog.load(version: 2)
    var preferences = UserPreferences(); preferences.availableEquipmentIDs = []; preferences.availableMinutes = 30
    preferences.movementConditions = (catalog.conditions ?? []).map { .init(conditionID: $0.id, version: $0.version, status: .ready) }
    let store = try LocalPlanRepository(inMemory: true), journal = MemoryJournal()
    let model = try AppModel(planStore: store, journalStore: journal)
    var plan = try catalog.demoPlan(preferences: preferences, today: DemoData.today, calendar: DemoData.calendar)
    #expect(model.savePlan(plan))
    let snapshot = plan.generationContext
    var revoked = preferences; revoked.movementConditions = []
    #expect(model.savePreferences(revoked))
    plan.sessions[0].feedback = try WorkoutFeedback(completed: true, perceivedEffort: 4, note: "条件变化后的历史反馈")
    #expect(model.savePlan(plan))
    #expect(model.plans.first?.generationContext == snapshot)
    let originalDate = plan.sessions[1].scheduledAt
    plan.sessions[1].scheduledAt = Calendar.current.date(byAdding: .day, value: 1, to: plan.sessions[0].scheduledAt)!
    #expect(!model.savePlan(plan))
    #expect(model.plans.first?.sessions[1].scheduledAt == originalDate)
    #expect(model.plans.first?.sessions[0].feedback?.note == "条件变化后的历史反馈")
}

@Test @MainActor func unknownFutureRuleKeepsHistoricalFeedbackReadable() throws {
    let catalog = try ExerciseCatalog.load(version: 2)
    var p = UserPreferences(); p.availableEquipmentIDs = []; p.availableMinutes = 30
    p.movementConditions = (catalog.conditions ?? []).map { .init(conditionID: $0.id, version: $0.version, status: .ready) }
    var plan = try catalog.demoPlan(preferences: p, today: DemoData.today, calendar: DemoData.calendar)
    plan.generationContext?.rulesVersion = 999
    let first = plan.sessions[0]
    let third = WorkoutSession(title: first.title, scheduledAt: DemoData.calendar.date(byAdding: .day, value: 6, to: first.scheduledAt)!, minutes: first.minutes, exercises: first.exercises)
    plan.sessions.append(third)
    let store = try LocalPlanRepository(inMemory: true); try store.save(plan)
    let model = try AppModel(planStore: store, journalStore: MemoryJournal())
    plan.sessions[0].feedback = try WorkoutFeedback(completed: true, perceivedEffort: 3, note: "未知规则历史反馈")
    #expect(model.savePlan(plan))
    #expect(model.plans.first?.sessions.count == 3)
    #expect(model.plans.first?.generationContext?.rulesVersion == 999)
}

@Test @MainActor func legacyGenerationProjectsNewEquipmentWithoutOverwritingPreferences() async throws {
    let model = try AppModel(coach: DemoCoachService(delay: .zero), planStore: LocalPlanRepository(inMemory: true), journalStore: MemoryJournal())
    var p = UserPreferences(); p.availableEquipmentIDs = ["stable-chair", "wall"]
    #expect(model.savePreferences(p))
    model.generatePlan(p); try await awaitIdle(model)
    #expect(model.draft != nil)
    #expect(model.draft?.generationContext?.availableEquipmentIDs == ["wall"])
    #expect(model.journal.preferences.availableEquipmentIDs == ["stable-chair", "wall"])
}

@Test @MainActor func futureConditionRecordsRemainSavedButDoNotBlockCurrentGeneration() async throws {
    let catalog = try ExerciseCatalog.load(version: 2)
    let model = try AppModel(coach: DemoCoachService(delay: .zero), planStore: LocalPlanRepository(inMemory: true), journalStore: MemoryJournal())
    var p = UserPreferences(); p.availableEquipmentIDs = []; p.availableMinutes = 30
    p.movementConditions = (catalog.conditions ?? []).map { .init(conditionID: $0.id, version: $0.version, status: .ready) }
    p.movementConditions?.append(.init(conditionID: "future-condition", version: 9, status: .ready))
    model.generatePlan(p, programKind: "lowerBodyBasics"); try await awaitIdle(model)
    #expect(model.draft != nil)
    #expect(model.draft?.generationContext?.movementConditions?.contains { $0.conditionID == "future-condition" } == false)
    #expect(model.journal.preferences.movementConditions?.contains { $0.conditionID == "future-condition" } == true)
}

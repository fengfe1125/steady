import SwiftUI
import SteadyCore
import SteadyLive

@main struct SteadyApp: App {
    @State private var model: AppModel?
    @State private var startupError: String?
    @Environment(\.scenePhase) private var scenePhase
    init() {
        JournalFonts.register()
        do {
            let arguments = ProcessInfo.processInfo.arguments
            #if DEBUG && targetEnvironment(simulator)
            if let index = arguments.firstIndex(of: "--ui-preview"), arguments.indices.contains(index + 1) {
                let screen = arguments[index + 1]
                let model: AppModel
                if ["login", "account", "settings"].contains(screen) {
                    let store = try DeviceRepository(inMemory: true)
                    model = try AppModel(planStore: store, journalStore: store, liveStore: store)
                } else {
                    model = try AppModel(planStore: LocalPlanRepository(inMemory: true), journalStore: LocalJournalRepository(inMemory: true))
                }
                var preferences = model.journal.preferences; preferences.onboardingComplete = true
                _ = model.savePreferences(preferences)
                model.selectedTab = ["today": 0, "trends": 1, "coach": 2, "plans": 3][screen] ?? 0
                _model = State(initialValue: model)
                return
            }
            #endif
            let demo = arguments.contains("--demo") || arguments.contains("--ui-testing-reset")
            let model: AppModel
            if demo {
                model = try AppModel(planStore: LocalPlanRepository(), journalStore: LocalJournalRepository())
                if arguments.contains("--ui-testing-reset") { model.reset() }
            } else {
                let qa = arguments.contains("--ui-testing-live")
                let qaURL = URL.documentsDirectory.appending(path: "SteadyLiveQA.store")
                let store = try DeviceRepository(url: qa ? qaURL : nil)
                if qa && arguments.contains("--reset-live-qa") { try store.purgeCurrentPartition() }
                let health = HealthKitService(repository: store)
                if let url = Bundle.main.url(forResource: "CloudConfig", withExtension: "plist"),
                   let data = try? Data(contentsOf: url),
                   let values = try PropertyListSerialization.propertyList(from: data, format: nil) as? [String: String],
                   let endpoint = values["SUPABASE_URL"], let key = values["SUPABASE_PUBLISHABLE_KEY"] {
                    let cloud = CloudClient(configuration: try LiveConfiguration(url: endpoint, publishableKey: key))
                    model = try AppModel(health: health, coach: CloudCoachService(cloud: cloud, store: store),
                        auth: EmailAuthService(cloud: cloud), sync: CloudSyncService(cloud: cloud, store: store),
                        planStore: store, journalStore: store, liveStore: store)
                } else {
                    model = try AppModel(health: health, coach: UnconfiguredCoachService(), planStore: store, journalStore: store, liveStore: store)
                }
            }
            _model = State(initialValue: model)
        } catch { _startupError = State(initialValue: error.localizedDescription) }
    }
    var body: some Scene {
        WindowGroup {
            if let model {
                appContent(model).environment(\.locale, Locale(identifier: "zh_CN"))
                    .task { await model.observeAuth() }
                    .task {
                        for await online in Connectivity().updates() { if online { model.scheduleSync() } }
                    }
                    .onChange(of: scenePhase) { _, phase in if phase == .active { Task { await model.load() } } }
            } else {
                ContentUnavailableView("无法打开本地记录", systemImage: "externaldrive.badge.exclamationmark", description: Text(startupError ?? "请重启后重试。不会自动删除你的记录。"))
            }
        }
    }
    @ViewBuilder private func appContent(_ model: AppModel) -> some View {
        #if DEBUG && targetEnvironment(simulator)
        let args = ProcessInfo.processInfo.arguments
        if let index = args.firstIndex(of: "--ui-preview"), args.indices.contains(index + 1) {
            UIReviewView(model: model, screen: args[index + 1])
        } else { RootView(model: model) }
        #else
        RootView(model: model)
        #endif
    }

}

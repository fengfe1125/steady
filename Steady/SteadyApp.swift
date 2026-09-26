import SwiftUI
import SteadyCore
import SteadyLive

@main struct SteadyApp: App {
    @State private var model: AppModel?
    @State private var startupError: String?
    @Environment(\.scenePhase) private var scenePhase
    init() {
        do {
            let arguments = ProcessInfo.processInfo.arguments
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
                RootView(model: model).environment(\.locale, Locale(identifier: "zh_CN"))
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
}

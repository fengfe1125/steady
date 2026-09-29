#if DEBUG && targetEnvironment(simulator)
import SwiftUI

/// Deterministic visual inspection using in-memory demo or guest fixtures; never enabled in device/release builds.
struct UIReviewView: View {
    @Bindable var model: AppModel
    let screen: String
    var body: some View {
        Group {
            switch screen {
            case "settings": NavigationStack { SettingsView(model: model) }
            case "account": NavigationStack { AccountConnectionsView(model: model) }
            case "login": NavigationStack { EmailLoginView(model: model) }
            case "note": NoteView(model: model)
            default: RootView(model: model)
            }
        }
        .task {
            await model.load()
        }
    }
}
#endif

import SwiftUI
import WebKit
import SteadyCore

/// Only vector artwork is rendered here. Navigation, teaching content, and controls are SwiftUI.
struct EquipmentArtwork: UIViewRepresentable {
    let player: EquipmentPlayer
    @Environment(\.colorScheme) private var colorScheme

    func makeCoordinator() -> Coordinator { Coordinator(player: player) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        guard let url = Bundle.main.url(forResource: player.definition.resource, withExtension: "html"),
              let anatomy = try? TrainingArtworkDocument.usesBundledAnatomy(at: url) else {
            player.failed = true
            return WKWebView(frame: .zero, configuration: config)
        }
        if !anatomy {
            guard let runtimeURL = Bundle.main.url(forResource: "EquipmentArtworkRuntime", withExtension: "js"),
              let runtime = try? String(contentsOf: runtimeURL, encoding: .utf8),
              let machineURL = Bundle.main.url(forResource: "EquipmentMachineRenderer", withExtension: "js"),
              let machines = try? String(contentsOf: machineURL, encoding: .utf8) else {
                player.failed = true
                return WKWebView(frame: .zero, configuration: config)
            }
            config.userContentController.addUserScript(WKUserScript(source: machines, injectionTime: .atDocumentStart, forMainFrameOnly: true))
            config.userContentController.addUserScript(WKUserScript(source: runtime, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        }
        config.userContentController.add(context.coordinator, name: "lesson")
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false; webView.backgroundColor = .clear
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.backgroundColor = .clear
        webView.isUserInteractionEnabled = false
        webView.navigationDelegate = context.coordinator
        context.coordinator.webView = webView
        context.coordinator.resourceURL = url
        webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.command = Command(revision: player.revision, mode: player.mode.rawValue,
            playing: player.playing, speed: player.speed, seekTime: player.seekTime, seekRevision: player.seekRevision, dark: colorScheme == .dark, timing: player.definition.timing)
        context.coordinator.sendCommand()
    }

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.evaluateJavaScript("window.stopLesson && window.stopLesson()", completionHandler: nil)
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "lesson")
        webView.navigationDelegate = nil; webView.stopLoading()
        coordinator.player.pause(); coordinator.player.ready = false
    }

    struct Command: Encodable, Equatable {
        let revision: Int
        let mode: String
        let playing: Bool
        let speed: Double
        let seekTime: Double
        let seekRevision: Int
        let dark: Bool
        let timing: EquipmentTiming
    }

    @MainActor final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        let player: EquipmentPlayer
        weak var webView: WKWebView?
        var resourceURL: URL?
        var command: Command?
        private var sentCommand: Command?
        init(player: EquipmentPlayer) { self.player = player }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.frameInfo.isMainFrame, let body = message.body as? [String: Any], let event = body["event"] as? String else { return }
            if event == "ready" {
                player.failed = false; player.ready = true; sentCommand = nil; sendCommand()
            } else if event == "progress", let time = body["time"] as? Double, time.isFinite {
                player.time = min(max(time, 0), player.definition.timing.duration)
            }
        }

        func sendCommand() {
            guard player.ready, let command, command != sentCommand,
                  let data = try? JSONEncoder().encode(command), let json = String(data: data, encoding: .utf8) else { return }
            sentCommand = command
            webView?.evaluateJavaScript("window.setLessonState(\(json))") { [weak self] _, error in
                if error != nil { self?.fail() }
            }
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) async -> WKNavigationActionPolicy {
            navigationAction.request.url == resourceURL ? .allow : .cancel
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { fail() }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { fail() }
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { fail() }
        private func fail() { player.failed = true; player.ready = false; player.pause() }
    }
}

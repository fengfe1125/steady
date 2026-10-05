import SwiftUI
import WebKit
import SteadyCore

/// Only vector artwork is rendered here. Navigation, teaching content, and controls are SwiftUI.
struct TrainingAnimationArtwork: UIViewRepresentable {
    let player: TrainingAnimationPlayer
    @Environment(\.colorScheme) private var colorScheme

    func makeCoordinator() -> Coordinator { Coordinator(player: player) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        guard let anatomy = try? TrainingArtworkDocument.usesBundledAnatomy(at: player.resourceURL) else {
            player.failed = true
            return WKWebView(frame: .zero, configuration: config)
        }
        if !anatomy && player.animation.mistakeExplanation != nil {
            let style = "const s=document.createElement('style');s.textContent='#mistake-scene-wrongTorso text,#mistake-scene-wrongSupportNote text{display:none}';document.head.appendChild(s);"
            config.userContentController.addUserScript(WKUserScript(source: style, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        }
        if !anatomy && player.animation.documentLayout == true {
            config.userContentController.addUserScript(WKUserScript(source: Self.documentLayoutScript,
                injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        }
        if !anatomy && player.runtime == .hostInjected {
            let selectedRuntime = player.animation.injectedRuntimeResource.map {
                player.resourceURL.deletingLastPathComponent().appendingPathComponent($0)
            } ?? Bundle.main.url(forResource: "EquipmentArtworkRuntime", withExtension: "js")
            guard let runtimeURL = selectedRuntime,
                  let runtime = try? String(contentsOf: runtimeURL, encoding: .utf8) else {
                player.failed = true
                return WKWebView(frame: .zero, configuration: config)
            }
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
        let url = player.resourceURL
        context.coordinator.resourceURL = url
        webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.command = Command(revision: player.revision, mode: player.mode.rawValue,
            playing: player.playing, speed: player.speed, seekTime: player.seekTime, seekRevision: player.seekRevision, dark: colorScheme == .dark, timing: player.timing, view: player.view.rawValue, side: player.side)
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
        let view: String
        let side: String
    }

    // Measure the content box, not scrollHeight (which includes the old viewport height).
    // A fixed artwork height removes the vh feedback loop as the native frame grows.
    static let documentLayoutScript = """
    (() => {
        const style = document.createElement('style');
        style.textContent = 'html,body{min-height:0!important;height:auto!important}body{padding:0!important}main.lesson{padding:18px}.art{height:300px!important;min-height:0!important}.toolbar,.tabs,.controls,.related{display:none!important}body[data-artwork] #motion>.kicker,body[data-artwork] #motion>p,body[data-exercise] main>header,body[data-exercise] main>.eyebrow,body[data-exercise] main>.title,body[data-exercise] main>.subtitle,body[data-exercise] #motion.steps,body[data-exercise] #motion>.steps,body[data-exercise] #motion>.fine{display:none!important}';
        document.head.appendChild(style);
        const page = document.querySelector('main.page, main.lesson');
        if (!page) return;
        let previous = 0;
        const measure = () => {
            const height = Math.ceil(page.getBoundingClientRect().height);
            if (Number.isFinite(height) && height > 0 && height !== previous) {
                previous = height;
                window.webkit?.messageHandlers?.lesson?.postMessage({event:'layout', height});
            }
        };
        new ResizeObserver(measure).observe(page);
        window.addEventListener('resize', measure);
        document.fonts?.ready.then(measure);
        measure();
    })();
    """

    @MainActor final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        let player: TrainingAnimationPlayer
        weak var webView: WKWebView?
        var resourceURL: URL?
        var command: Command?
        private var sentCommand: Command?
        init(player: TrainingAnimationPlayer) { self.player = player }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.frameInfo.isMainFrame, let body = message.body as? [String: Any], let event = body["event"] as? String else { return }
            if event == "ready" {
                player.failed = false; player.ready = true; sentCommand = nil; sendCommand()
            } else if event == "progress", let time = body["time"] as? Double, time.isFinite {
                player.time = min(max(time, 0), player.timing.duration)
            } else if event == "layout", player.animation.documentLayout == true,
                      let height = body["height"] as? Double, height.isFinite, height > 0 {
                player.documentHeight = height
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

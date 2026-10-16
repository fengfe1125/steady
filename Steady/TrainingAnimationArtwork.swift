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
                #if DEBUG && targetEnvironment(simulator)
                if ProcessInfo.processInfo.arguments.contains("--video-reference-audit"), player.animation.lessonID.hasPrefix("reference-"), let webView {
                    Task { await Self.audit(webView, id: player.animation.lessonID) }
                }
                #endif
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

        #if DEBUG && targetEnvironment(simulator)
        /// Explicit opt-in QA probe; runs in the same WKWebView used by the teaching screen.
        private static func audit(_ web: WKWebView, id: String) async {
            var report: [String: Any] = ["id": id, "engine": "iOS WKWebView"]
            let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            func js(_ code: String) async throws -> Any { try await web.evaluateJavaScript(code) as Any }
            func pause() async throws { try await Task.sleep(for: .milliseconds(500)) }
            do {
                _ = try await js("window.__auditErrors=[]; window.__auditMaxContact=0;")
                report["geometry"] = try await js(#"""
                (()=>{const spec=SteadyReferenceLesson,SA=SteadyAnatomy,errors=[];let maxContact=0,prev;
                const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
                for(let i=0;i<=100;i++){
                  setLessonState({mode:'motion',playing:false,seekTime:spec.timing.duration*i/100,seekRevision:1000+i});
                  const s=SteadyLessonRenderedSamples()[0].sample,j=s.joints;
                  for(const [side,l] of Object.entries(j.legs)){const a=s.pose.ik?.ankle?.[side];if(a){const d=dist(l.A,a);maxContact=Math.max(maxContact,d);if(d>.25)errors.push('support '+i);}}
                  for(const [side,a] of Object.entries(j.arms)){if(Math.abs(dist(a.S,a.E)-64*(s.pose.arms[side].f??1))>.1)errors.push('length '+i);if(prev&&dist(a.H,prev.arms[side].H)>18)errors.push('jump '+i);}
                  const b=document.querySelector('#motion svg').getBoundingClientRect();
                  for(const p of document.querySelectorAll('#motion .figure path')){const q=p.getBoundingClientRect();if(q.width&&q.height&&(q.left<b.left-3||q.top<b.top-3||q.right>b.right+3||q.bottom>b.bottom+3))errors.push('clipped '+i);}
                  prev=j;
                }
                return {samples:101,maxContact,errors:[...new Set(errors)]};})()
                """#)
                _ = try await js("setLessonState({mode:'motion',playing:true,speed:1,seekTime:0,seekRevision:2001})")
                try await pause()
                report["normal"] = try await js("SteadyLessonPlaybackState()")
                _ = try await js("setLessonState({mode:'motion',playing:false})")
                report["pauseStart"] = try await js("SteadyLessonPlaybackState()")
                try await pause()
                report["pauseEnd"] = try await js("SteadyLessonPlaybackState()")
                _ = try await js("setLessonState({mode:'motion',playing:true,speed:0.5,seekTime:0,seekRevision:2002})")
                try await pause()
                report["slow"] = try await js("SteadyLessonPlaybackState()")
                for mode in ["motion", "detail", "mistakes"] {
                    _ = try await js("setLessonState({mode:'\(mode)',playing:false,seekTime:SteadyReferenceLesson.timing.effortEnd,seekRevision:2003})")
                    try await pause()
                    let snapshot = try await web.takeSnapshot(configuration: nil)
                    try snapshot.pngData()?.write(to: directory.appendingPathComponent("\(id)-\(mode).png"))
                    report[mode] = try await js("SteadyLessonPlaybackState()")
                }
                _ = try await js("setLessonState({mode:'detail',playing:false,dark:true})")
                try await pause()
                let dark = try await web.takeSnapshot(configuration: nil)
                try dark.pngData()?.write(to: directory.appendingPathComponent("\(id)-dark.png"))
                report["detailFrames"] = try await js("document.querySelectorAll('#detail figure').length")
                report["detailFits"] = try await js("Array.from(document.querySelectorAll('#detail figure')).every(f=>f.getBoundingClientRect().bottom<=innerHeight+1)")
                _ = try await js("stopLesson()")
                report["stopped"] = try await js("SteadyLessonPlaybackState()")
            } catch { report["error"] = String(describing: error) }
            if let data = try? JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted, .sortedKeys]) {
                try? data.write(to: directory.appendingPathComponent("\(id)-audit.json"))
            }
        }
        #endif

    }
}

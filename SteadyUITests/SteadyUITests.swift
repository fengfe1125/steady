import XCTest
import CryptoKit

@MainActor final class SteadyUITests: XCTestCase {
    let app = XCUIApplication()
    override func setUpWithError() throws {
        continueAfterFailure = false
        print("[ANATOMY-RUNNER] native-large-proof-v2 " + name)
    }

    func tap(_ element: XCUIElement, file: StaticString = #filePath, line: UInt = #line) {
        for _ in 0..<8 {
            if element.exists && element.isHittable { element.press(forDuration: 0.15); return }
            app.swipeUp()
        }
        XCTFail("找不到可点击元素：\(element)", file: file, line: line)
    }
    func capture(_ name: String) {
        // Plain buttons briefly retain a pressed highlight after an automation tap.
        // Capture the settled appearance, including the selected step's text contrast.
        Thread.sleep(forTimeInterval: 0.35)
        let screenshot = app.screenshot()
        let digest = SHA256.hash(data: screenshot.pngRepresentation).map { String(format: "%02x", $0) }.joined()
        let captureRow = ["name": name, "sha256": digest]
        if let data = try? JSONSerialization.data(withJSONObject: captureRow, options: [.sortedKeys]),
           let text = String(data: data, encoding: .utf8) { print("[SCREEN-CAPTURE] " + text) }
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }

    private func captureNativeEvidence(_ name: String, id: String, mode: String,
                                       position: String, element: XCUIElement) {
        capture(name)
        let frame = element.frame
        let row: [String: Any] = ["name": name, "lessonID": id, "mode": mode,
            "scrollPosition": position, "elementIdentifier": element.identifier,
            "elementFrame": ["x": frame.minX, "y": frame.minY, "width": frame.width, "height": frame.height],
            "navigationBottom": app.navigationBars.firstMatch.frame.maxY,
            "screenHeight": app.frame.height, "hittable": element.isHittable,
            "selected": element.isSelected, "launchArguments": app.launchArguments]
        if let data = try? JSONSerialization.data(withJSONObject: row, options: [.sortedKeys]),
           let text = String(data: data, encoding: .utf8) { print("[NATIVE-EVIDENCE] " + text) }
    }

    private func exposeNativeElement(_ element: XCUIElement, requireHittable: Bool = true,
                                     towardLaterContentWhenMissing: Bool = true) {
        let top = app.navigationBars.firstMatch.frame.maxY + 8
        let bottom = app.frame.maxY - 80
        for _ in 0..<20 {
            if !element.exists {
                app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: towardLaterContentWhenMissing ? 0.8 : 0.3))
                    .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: towardLaterContentWhenMissing ? 0.45 : 0.8)))
                continue
            }
            let frame = element.frame
            if element.exists && (!requireHittable || element.isHittable) && frame.minY >= top && frame.maxY < bottom { break }
            let below = !element.exists || frame.maxY >= bottom
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: below ? 0.8 : 0.3))
                .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: below ? 0.45 : 0.8)))
        }
        XCTAssertTrue(element.exists)
        guard element.exists else { return }
        if requireHittable { XCTAssertTrue(element.isHittable) }
        XCTAssertGreaterThanOrEqual(element.frame.minY, top)
        XCTAssertLessThan(element.frame.maxY, bottom)
    }

    private func auditEquipmentLargeComplete(_ id: String) {
        app.launchArguments = ["--ui-preview", "equipment-\(id)-motion", "--equipment-reduce-motion", "--equipment-large-text"]
        app.launch()
        let playback = app.buttons["lessonPlayback"]
        XCTAssertTrue(playback.waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback)
        waitForExpectations(timeout: 15)
        XCTAssertEqual(playback.label, "播放动画")
        let time = app.staticTexts["lessonTime"]
        XCTAssertEqual(time.label, "0.0 / 6s")
        let step = app.buttons["lessonStep_2"]
        exposeNativeElement(step)
        step.tap()
        XCTAssertEqual(playback.label, "播放动画")
        XCTAssertNotEqual(time.label, "0.0 / 6s")
        let paused = time.label
        Thread.sleep(forTimeInterval: 0.6)
        XCTAssertEqual(time.label, paused, "Reduced-motion step seek must remain paused")
        let slider = app.sliders["lessonProgress"]
        exposeNativeElement(slider)
        XCTAssertTrue(slider.isEnabled)
        exposeNativeElement(time, requireHittable: false)
        captureNativeEvidence("large-complete-\(id)-motion-controls", id: id, mode: "motion",
                              position: "paused-step-controls", element: time)
        for mode in ["motion", "detail", "mistakes"] {
            let button = app.buttons["lessonMode_\(mode)"]
            exposeNativeElement(button, towardLaterContentWhenMissing: false)
            button.tap()
            XCTAssertTrue(button.isSelected)
            let canvas = app.descendants(matching: .any)["lessonArtwork"]
            exposeNativeElement(canvas, requireHittable: false)
            XCTAssertEqual(canvas.frame.width, canvas.frame.height, accuracy: 1)
            captureNativeEvidence("large-complete-\(id)-\(mode)-full-artwork", id: id, mode: mode,
                                  position: "complete-artwork-in-safe-viewport", element: canvas)
            if mode != "motion" {
                let prefix = mode == "detail" ? "lessonDetail" : "lessonMistake"
                let paragraph = app.staticTexts[prefix + "Explanation"]
                XCTAssertTrue(paragraph.exists)
                XCTAssertGreaterThan(paragraph.label.count, 20)
                if mode == "detail" { XCTAssertTrue(paragraph.label.contains("①")) }
                else {
                    XCTAssertTrue(paragraph.label.contains("左图"))
                    XCTAssertTrue(paragraph.label.contains("右图"))
                }
                let notes = app.descendants(matching: .any)[prefix + "Notes"]
                XCTAssertTrue(notes.exists)
                var reachedEnd = false
                for index in 0..<24 {
                    captureNativeEvidence("large-complete-\(id)-\(mode)-notes-\(index)", id: id, mode: mode,
                                          position: "complete-notes-scroll-\(index)", element: notes)
                    let frame = notes.frame
                    if frame.maxY < app.frame.maxY - 80 && frame.maxY > app.navigationBars.firstMatch.frame.maxY + 8 {
                        reachedEnd = true
                        break
                    }
                    app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.8))
                        .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.45)))
                }
                XCTAssertTrue(reachedEnd, "Must reach all native explanation and teaching-note content")
                XCTAssertFalse(app.staticTexts["图解暂时无法打开"].exists)
            }
        }
        let motion = app.buttons["lessonMode_motion"]
        exposeNativeElement(motion, towardLaterContentWhenMissing: false)
        motion.tap()
        XCTAssertTrue(motion.isSelected)
        XCTAssertEqual(playback.label, "播放动画")
        captureNativeEvidence("large-complete-\(id)-motion-return", id: id, mode: "motion",
                              position: "mode-return-after-complete-notes", element: motion)
        app.terminate()
    }
    func testEquipmentLargeComplete_dumbbell_goblet_squat() { auditEquipmentLargeComplete("dumbbell-goblet-squat") }
    func testEquipmentLargeComplete_lat_pulldown() { auditEquipmentLargeComplete("lat-pulldown") }
    func testEquipmentLargeComplete_preacher_biceps_curl() { auditEquipmentLargeComplete("preacher-biceps-curl") }
    func testEquipmentLargeComplete_seated_abdominal_crunch() { auditEquipmentLargeComplete("seated-abdominal-crunch") }
    func testEquipmentLargeComplete_seated_cable_row() { auditEquipmentLargeComplete("seated-cable-row") }
    func testEquipmentLargeComplete_seated_chest_press() { auditEquipmentLargeComplete("seated-chest-press") }
    func testEquipmentLargeComplete_seated_dumbbell_shoulder_press() { auditEquipmentLargeComplete("seated-dumbbell-shoulder-press") }
    func testEquipmentLargeComplete_seated_hip_abduction() { auditEquipmentLargeComplete("seated-hip-abduction") }
    func testEquipmentLargeComplete_seated_leg_curl() { auditEquipmentLargeComplete("seated-leg-curl") }
    func testEquipmentLargeComplete_seated_leg_extension() { auditEquipmentLargeComplete("seated-leg-extension") }
    func testEquipmentLargeComplete_seated_leg_press() { auditEquipmentLargeComplete("seated-leg-press") }
    func testEquipmentLargeComplete_seated_pec_fly() { auditEquipmentLargeComplete("seated-pec-fly") }
    func testEquipmentLargeComplete_seated_shoulder_press() { auditEquipmentLargeComplete("seated-shoulder-press") }
    func testEquipmentLargeComplete_single_arm_dumbbell_row() { auditEquipmentLargeComplete("single-arm-dumbbell-row") }

    /// The `coach` preview shows CoachView in its own NavigationStack, without the tab bar;
    /// testActionLibraryOpensLesson covers reaching it through the 教练 tab.
    private func openCoachPreview() {
        app.launchArguments = ["--ui-preview", "coach"]
        app.launch()
        XCTAssertTrue(app.navigationBars["你的教练"].waitForExistence(timeout: 15))
    }

    func startFresh(live: Bool = false) {
        app.launchArguments = live ? ["--ui-testing-live", "--reset-live-qa"] : ["--ui-testing-reset"]
        app.launch()
        let pages = ["慢慢来，也在向前", "你想从哪里开始", "连接苹果健康", "保留你的进展", "数据由你掌握"]
        for title in pages {
            XCTAssertTrue(app.navigationBars[title].waitForExistence(timeout: 10))
            tap(app.buttons["onboardingNext"])
        }
        XCTAssertTrue(app.buttons["settings"].waitForExistence(timeout: 10))
    }

    /// Coach tab → 胸部动作库 → first move must open its lesson player.
    func testActionLibraryOpensLesson() {
        startFresh()
        tap(app.tabBars.buttons["教练"])
        tap(app.buttons["actionLibrary_chest"])
        XCTAssertTrue(app.navigationBars["胸部动作库"].waitForExistence(timeout: 10), "动作库列表没有打开")
        capture("action-library-list")
        let first = app.buttons["actionLibrary_648a8e8a68aa7d000165d38e"]
        XCTAssertTrue(first.waitForExistence(timeout: 10), "列表里没有第一个动作")
        tap(first)
        XCTAssertTrue(app.navigationBars["90° 跪姿宽距俯卧撑"].waitForExistence(timeout: 10), "点动作没有进入动作页")
        capture("action-library-lesson")
    }

    func testTrainingCandidateAbs() { candidateFlow("abs-collection", "abs-warmup-marching") }
    func testTrainingCandidateChest() { candidateFlow("chest-animation-collection", "chest-warmup-march") }
    func testTrainingCandidateArms() { candidateFlow("arms-animation-collection", "arms-warmup-triceps") }
    func testTrainingCandidateShoulders() { candidateFlow("shoulders-animation-collection", "shoulders-light-warmup") }
    func testAnatomyShoulderNativePlaybackAndBackground() {
        app.launchArguments = ["--ui-preview", "shoulders-animation-collection"]
        app.launch()
        tap(app.buttons["animatedLesson_shoulders-light-warmup"])
        let playback = app.buttons["trainingPlayback"]
        XCTAssertTrue(playback.waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback)
        waitForExpectations(timeout: 15)
        XCTAssertTrue(app.staticTexts["trainingMuscles"].exists)
        XCTAssertEqual(playback.label, "暂停", "Opening a lesson starts the animation")
        let time = app.staticTexts["trainingTime"]
        let start = time.label
        expectation(for: NSPredicate(format: "label != %@", start), evaluatedWith: time)
        waitForExpectations(timeout: 6)
        tap(playback)
        let paused = time.label
        Thread.sleep(forTimeInterval: 0.6)
        XCTAssertEqual(time.label, paused)
        tap(app.buttons["trainingSpeed"])
        XCTAssertEqual(app.buttons["trainingSpeed"].label, "恢复 1×")
        let slider = app.sliders["动作进度"]
        XCTAssertTrue(slider.isEnabled)
        slider.adjust(toNormalizedSliderPosition: 0.65)
        XCTAssertNotEqual(time.label, paused)
        XCTAssertEqual(playback.label, "播放")
        capture("anatomy-shoulder-native-seek")
        tap(playback)
        XCUIDevice.shared.press(.home)
        XCTAssertTrue(app.wait(for: .runningBackground, timeout: 5))
        app.activate()
        XCTAssertTrue(playback.waitForExistence(timeout: 10))
        XCTAssertEqual(playback.label, "播放")
        let returned = time.label
        Thread.sleep(forTimeInterval: 0.6)
        XCTAssertEqual(time.label, returned)
        for _ in 0..<5 {
            if app.segmentedControls.buttons["细节图解"].isHittable { break }
            app.swipeDown()
        }
        tap(app.segmentedControls.buttons["细节图解"])
        XCTAssertTrue(app.staticTexts["trainingDetailExplanation"].exists)
        capture("anatomy-shoulder-native-detail")
        tap(app.segmentedControls.buttons["错误对照"])
        XCTAssertTrue(app.staticTexts["trainingMistakeExplanation"].exists)
        capture("anatomy-shoulder-native-mistakes")
        XCTAssertFalse(app.staticTexts["图解暂时无法加载，仍可阅读下方步骤。返回后重新打开此动作可重试。"].exists)
        app.terminate()
    }

    func testAnatomyShoulderReduceMotionAndDark() {
        app.launchArguments = ["--ui-preview", "shoulders-animation-collection", "--training-reduce-motion", "--equipment-dark"]
        app.launch()
        tap(app.buttons["animatedLesson_shoulders-light-warmup"])
        let step = app.buttons["trainingStep_1"]
        XCTAssertTrue(step.waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: step)
        waitForExpectations(timeout: 15)
        XCTAssertFalse(app.buttons["trainingPlayback"].isEnabled)
        tap(step)
        let time = app.staticTexts["trainingTime"]
        XCTAssertTrue(time.label.hasPrefix("1.7 /"))
        let paused = time.label
        Thread.sleep(forTimeInterval: 0.6)
        XCTAssertEqual(time.label, paused)
        for _ in 0..<5 {
            if app.segmentedControls.buttons["细节图解"].isHittable { break }
            app.swipeDown()
        }
        capture("anatomy-shoulder-native-dark-static")
        tap(app.segmentedControls.buttons["细节图解"])
        capture("anatomy-shoulder-native-dark-detail")
        tap(app.segmentedControls.buttons["错误对照"])
        capture("anatomy-shoulder-native-dark-mistakes")
        app.terminate()
    }

    func testAnatomyEquipmentSquarePanelsLight() { auditAnatomyEquipmentCanvas(dark: false, id: "seated-chest-press") }
    func testAnatomyEquipmentSquarePanelsDark() { auditAnatomyEquipmentCanvas(dark: true, id: "seated-chest-press") }
    func testAllAnatomyEquipmentSquarePanelsLight() {
        for id in equipmentPreviewIDs { auditAnatomyEquipmentCanvas(dark: false, id: id) }
    }
    func testAllAnatomyEquipmentSquarePanelsDark() {
        for id in equipmentPreviewIDs { auditAnatomyEquipmentCanvas(dark: true, id: id) }
    }

    private func auditAnatomyEquipmentCanvas(dark: Bool, id: String) {
        app.launchArguments = ["--ui-preview", "equipment-\(id)-motion", "--equipment-reduce-motion"]
            + (dark ? ["--equipment-dark"] : [])
        app.launch()
        let playback = app.buttons["lessonPlayback"]
        XCTAssertTrue(playback.waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback)
        waitForExpectations(timeout: 15)
        XCTAssertEqual(playback.label, "播放动画")
        for mode in ["motion", "detail", "mistakes"] {
            if mode != "motion" { tap(app.buttons["lessonMode_\(mode)"]) }
            // The canvas carries an accessibility action, so it is exposed as a Button, not Other.
            let canvas = app.descendants(matching: .any)["lessonArtwork"]
            XCTAssertTrue(canvas.waitForExistence(timeout: 5))
            XCTAssertGreaterThan(canvas.frame.width, app.frame.width * 0.75)
            XCTAssertEqual(canvas.frame.height, canvas.frame.width, accuracy: 1,
                           "The complete anatomy comparison must keep its square canvas")
            if mode == "detail" {
                let explanation = app.staticTexts["lessonDetailExplanation"]
                XCTAssertTrue(explanation.exists)
                XCTAssertTrue(explanation.label.contains("①"))
                XCTAssertTrue(explanation.label.contains("红色"))
            } else if mode == "mistakes" {
                let explanation = app.staticTexts["lessonMistakeExplanation"]
                XCTAssertTrue(explanation.exists)
                XCTAssertTrue(explanation.label.contains("左图 · 正确示范"))
                XCTAssertTrue(explanation.label.contains("右图 · 错误示范"))
                XCTAssertTrue(explanation.label.contains("调整方法"))
            }
            capture("anatomy-equipment-\(id)-\(dark ? "dark" : "light")-\(mode)")
        }
        XCTAssertFalse(app.staticTexts["图解暂时无法打开"].exists)
        app.terminate()
    }

    func testTrainingCandidateArmsExtra() { candidateFlow("arms-extra-animation-collection", "arms-extra-warmup-aerobic") }
    func testTrainingCandidateFunctional() { candidateFlow("functional-animation-collection", "functional-warmup-frog") }
    func testTrainingCandidateHipThrust() { candidateFlow("functional-animation-collection", "functional-single-leg-hip-thrust") }
    func testTrainingCandidateCrossLeg() { candidateFlow("legs-animation-collection", "legs-90-90-leg-extension") }
    func testTrainingCandidateLegs() { candidateFlow("legs-animation-collection", "legs-general-warmup") }
    func testTrainingCandidateBack() { candidateFlow("back-animation-collection", "back-walking") }

    func testTrainingBackRowViews() { backViewsFlow("back-one-arm-row") }
    func testTrainingBackPulldownViews() { backViewsFlow("back-bent-arm-pulldown") }
    func testTrainingBackScapulaViews() { backViewsFlow("back-supported-scapula") }

    /// The back lessons are redrawn with the shared anatomy renderer (tools/anatomy). It draws one
    /// side view and drops availableViews / supportsSideSelection, so neither picker may appear.
    private func backViewsFlow(_ id: String) {
        app.launchArguments = ["--ui-preview", "back-animation-collection"]
        app.launch()
        let lesson = app.buttons["animatedLesson_\(id)"]
        XCTAssertTrue(app.navigationBars.firstMatch.waitForExistence(timeout: 15))
        tap(lesson)
        let playback = app.buttons["trainingPlayback"]
        XCTAssertTrue(playback.waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback)
        waitForExpectations(timeout: 20)
        XCTAssertFalse(app.segmentedControls["trainingView"].exists)
        XCTAssertFalse(app.segmentedControls["trainingSide"].exists)
        tap(app.buttons["trainingStep_2"])
        XCTAssertEqual(playback.label, "播放")
        XCTAssertEqual(app.staticTexts["trainingTime"].label, "5.0 / 10.0 秒")
        for _ in 0..<5 { app.swipeDown() }
        XCTAssertEqual(app.staticTexts["trainingTime"].label, "5.0 / 10.0 秒")
        capture("\(id)-side")
        tap(app.segmentedControls.buttons["细节图解"])
        XCTAssertTrue(app.staticTexts["trainingDetailExplanation"].label.contains("①"))
        capture("\(id)-detail")
        tap(app.segmentedControls.buttons["错误对照"])
        XCTAssertTrue(app.staticTexts["trainingMistakeExplanation"].exists)
        capture("\(id)-mistakes")
        app.terminate()
    }

    // BEGIN FULL TRAINING AUDIT
    func testTrainingAll_abs_warmup_marching() { auditCandidate("abs-collection", "abs-warmup-marching", expectedSeconds: 1.7) }
    func testTrainingAll_abs_warmup_cat_cow() { auditCandidate("abs-collection", "abs-warmup-cat-cow", expectedSeconds: 1.7) }
    func testTrainingAll_abs_warmup_pelvic_tilt() { auditCandidate("abs-collection", "abs-warmup-pelvic-tilt", expectedSeconds: 1.7) }
    func testTrainingAll_abs_hanging_leg_raise() { auditCandidate("abs-collection", "abs-hanging-leg-raise", expectedSeconds: 1.7) }
    func testTrainingAll_abs_sling_knee_raise() { auditCandidate("abs-collection", "abs-sling-knee-raise", expectedSeconds: 1.7) }
    func testTrainingAll_abs_supported_knee_raise() { auditCandidate("abs-collection", "abs-supported-knee-raise", expectedSeconds: 1.7) }
    func testTrainingAll_abs_supine_crunch() { auditCandidate("abs-collection", "abs-supine-crunch", expectedSeconds: 1.7) }
    func testTrainingAll_abs_side_biased_crunch() { auditCandidate("abs-collection", "abs-side-biased-crunch", expectedSeconds: 1.7) }
    func testTrainingAll_abs_kneeling_ab_wheel() { auditCandidate("abs-collection", "abs-kneeling-ab-wheel", expectedSeconds: 1.7) }
    func testTrainingAll_abs_prone_abdominal_stretch() { auditCandidate("abs-collection", "abs-prone-abdominal-stretch", expectedSeconds: 1.7) }
    func testTrainingAll_arms_warmup_triceps() { auditCandidate("arms-animation-collection", "arms-warmup-triceps", expectedSeconds: 0.725) }
    func testTrainingAll_arms_single_cable_extension() { auditCandidate("arms-animation-collection", "arms-single-cable-extension", expectedSeconds: 0.725) }
    func testTrainingAll_arms_lying_barbell_extension() { auditCandidate("arms-animation-collection", "arms-lying-barbell-extension", expectedSeconds: 0.725) }
    func testTrainingAll_arms_seated_cable_curl() { auditCandidate("arms-animation-collection", "arms-seated-cable-curl", expectedSeconds: 0.725) }
    func testTrainingAll_arms_incline_dumbbell_curl() { auditCandidate("arms-animation-collection", "arms-incline-dumbbell-curl", expectedSeconds: 0.725) }
    func testTrainingAll_arms_overhead_single_cable_extension() { auditCandidate("arms-animation-collection", "arms-overhead-single-cable-extension", expectedSeconds: 0.725) }
    func testTrainingAll_arms_standing_rope_hammer_curl() { auditCandidate("arms-animation-collection", "arms-standing-rope-hammer-curl", expectedSeconds: 0.725) }
    func testTrainingAll_arms_seated_internal_rotation_curl() { auditCandidate("arms-animation-collection", "arms-seated-internal-rotation-curl", expectedSeconds: 0.725) }
    func testTrainingAll_arms_extra_warmup_aerobic() { auditCandidate("arms-extra-animation-collection", "arms-extra-warmup-aerobic", expectedSeconds: 0.8) }
    func testTrainingAll_arms_extra_warmup_mobility() { auditCandidate("arms-extra-animation-collection", "arms-extra-warmup-mobility", expectedSeconds: 1.05) }
    func testTrainingAll_arms_extra_warmup_rehearsal() { auditCandidate("arms-extra-animation-collection", "arms-extra-warmup-rehearsal", expectedSeconds: 1.7) }
    func testTrainingAll_arms_extra_cable_pushdown() { auditCandidate("arms-extra-animation-collection", "arms-extra-cable-pushdown", expectedSeconds: 1.7) }
    func testTrainingAll_arms_extra_seated_cable_curl() { auditCandidate("arms-extra-animation-collection", "arms-extra-seated-cable-curl", expectedSeconds: 1.7) }
    func testTrainingAll_arms_extra_lying_barbell_extension() { auditCandidate("arms-extra-animation-collection", "arms-extra-lying-barbell-extension", expectedSeconds: 1.7) }
    func testTrainingAll_arms_extra_standing_barbell_curl() { auditCandidate("arms-extra-animation-collection", "arms-extra-standing-barbell-curl", expectedSeconds: 1.7) }
    func testTrainingAll_back_walking() { auditCandidate("back-animation-collection", "back-walking", expectedSeconds: 3.75) }
    func testTrainingAll_back_roller() { auditCandidate("back-animation-collection", "back-roller", expectedSeconds: 3.0) }
    func testTrainingAll_back_bench_support() { auditCandidate("back-animation-collection", "back-bench-support", expectedSeconds: 3.0) }
    func testTrainingAll_back_straight_arm() { auditCandidate("back-animation-collection", "back-straight-arm", expectedSeconds: 3.0) }
    func testTrainingAll_back_one_arm_row() { auditCandidate("back-animation-collection", "back-one-arm-row", expectedSeconds: 3.0) }
    func testTrainingAll_back_neutral_pulldown() { auditCandidate("back-animation-collection", "back-neutral-pulldown", expectedSeconds: 3.0) }
    func testTrainingAll_back_seated_row() { auditCandidate("back-animation-collection", "back-seated-row", expectedSeconds: 3.0) }
    func testTrainingAll_back_bent_arm_pulldown() { auditCandidate("back-animation-collection", "back-bent-arm-pulldown", expectedSeconds: 3.0) }
    func testTrainingAll_back_supported_scapula() { auditCandidate("back-animation-collection", "back-supported-scapula", expectedSeconds: 3.0) }
    func testTrainingAll_chest_warmup_march() { auditCandidate("chest-animation-collection", "chest-warmup-march", expectedSeconds: 1.7) }
    func testTrainingAll_chest_warmup_roller_t() { auditCandidate("chest-animation-collection", "chest-warmup-roller-t", expectedSeconds: 1.7) }
    func testTrainingAll_chest_warmup_roller_y() { auditCandidate("chest-animation-collection", "chest-warmup-roller-y", expectedSeconds: 1.7) }
    func testTrainingAll_chest_warmup_roller_support() { auditCandidate("chest-animation-collection", "chest-warmup-roller-support", expectedSeconds: 1.7) }
    func testTrainingAll_chest_warmup_roller_knee_lift() { auditCandidate("chest-animation-collection", "chest-warmup-roller-knee-lift", expectedSeconds: 1.7) }
    func testTrainingAll_chest_warmup_roller_y_press() { auditCandidate("chest-animation-collection", "chest-warmup-roller-y-press", expectedSeconds: 1.7) }
    func testTrainingAll_chest_warmup_band() { auditCandidate("chest-animation-collection", "chest-warmup-band", expectedSeconds: 1.7) }
    func testTrainingAll_chest_warmup_press() { auditCandidate("chest-animation-collection", "chest-warmup-press", expectedSeconds: 1.7) }
    func testTrainingAll_chest_parallel_bar_dip() { auditCandidate("chest-animation-collection", "chest-parallel-bar-dip", expectedSeconds: 1.7) }
    func testTrainingAll_chest_flat_press() { auditCandidate("chest-animation-collection", "chest-flat-press", expectedSeconds: 1.7) }
    func testTrainingAll_chest_incline_machine_press() { auditCandidate("chest-animation-collection", "chest-incline-machine-press", expectedSeconds: 1.7) }
    func testTrainingAll_chest_seated_cable_fly() { auditCandidate("chest-animation-collection", "chest-seated-cable-fly", expectedSeconds: 1.7) }
    func testTrainingAll_chest_wall_push_up() { auditCandidate("chest-animation-collection", "chest-wall-push-up", expectedSeconds: 1.7) }
    func testTrainingAll_functional_warmup_frog() { auditCandidate("functional-animation-collection", "functional-warmup-frog", expectedSeconds: 1.7) }
    func testTrainingAll_functional_warmup_supported_frog() { auditCandidate("functional-animation-collection", "functional-warmup-supported-frog", expectedSeconds: 1.7) }
    func testTrainingAll_functional_warmup_lunge_control() { auditCandidate("functional-animation-collection", "functional-warmup-lunge-control", expectedSeconds: 1.7) }
    func testTrainingAll_functional_warmup_supported_rotation() { auditCandidate("functional-animation-collection", "functional-warmup-supported-rotation", expectedSeconds: 1.7) }
    func testTrainingAll_functional_single_leg_hip_thrust() { auditCandidate("functional-animation-collection", "functional-single-leg-hip-thrust", expectedSeconds: 1.1) }
    func testTrainingAll_functional_dumbbell_lunge_press() { auditCandidate("functional-animation-collection", "functional-dumbbell-lunge-press", expectedSeconds: 1.7) }
    func testTrainingAll_functional_seated_dumbbell_press() { auditCandidate("functional-animation-collection", "functional-seated-dumbbell-press", expectedSeconds: 1.7) }
    func testTrainingAll_functional_dumbbell_romanian_deadlift() { auditCandidate("functional-animation-collection", "functional-dumbbell-romanian-deadlift", expectedSeconds: 1.7) }
    func testTrainingAll_functional_alternating_lunge() { auditCandidate("functional-animation-collection", "functional-alternating-lunge", expectedSeconds: 1.0) }
    func testTrainingAll_functional_cooldown_walk() { auditCandidate("functional-animation-collection", "functional-cooldown-walk", expectedSeconds: 1.7) }
    func testTrainingAll_functional_cooldown_calf_stretch() { auditCandidate("functional-animation-collection", "functional-cooldown-calf-stretch", expectedSeconds: 1.7) }
    func testTrainingAll_functional_cooldown_hamstring_stretch() { auditCandidate("functional-animation-collection", "functional-cooldown-hamstring-stretch", expectedSeconds: 1.7) }
    func testTrainingAll_legs_general_warmup() { auditCandidate("legs-animation-collection", "legs-general-warmup", expectedSeconds: 2.0) }
    func testTrainingAll_legs_frog_rock() { auditCandidate("legs-animation-collection", "legs-frog-rock", expectedSeconds: 2.0) }
    func testTrainingAll_legs_frog_hip_rotation() { auditCandidate("legs-animation-collection", "legs-frog-hip-rotation", expectedSeconds: 2.0) }
    func testTrainingAll_legs_lunge_rotation() { auditCandidate("legs-animation-collection", "legs-lunge-rotation", expectedSeconds: 2.0) }
    func testTrainingAll_legs_90_90_switch() { auditCandidate("legs-animation-collection", "legs-90-90-switch", expectedSeconds: 2.0) }
    func testTrainingAll_legs_90_90_hip_rise() { auditCandidate("legs-animation-collection", "legs-90-90-hip-rise", expectedSeconds: 2.0) }
    func testTrainingAll_legs_90_90_leg_extension() { auditCandidate("legs-animation-collection", "legs-90-90-leg-extension", expectedSeconds: 2.3333333333333335) }
    func testTrainingAll_legs_calf_raise() { auditCandidate("legs-animation-collection", "legs-calf-raise", expectedSeconds: 2.0) }
    func testTrainingAll_legs_hip_adduction() { auditCandidate("legs-animation-collection", "legs-hip-adduction", expectedSeconds: 2.0) }
    func testTrainingAll_legs_bulgarian_split_squat() { auditCandidate("legs-animation-collection", "legs-bulgarian-split-squat", expectedSeconds: 2.0) }
    func testTrainingAll_legs_dumbbell_deadlift() { auditCandidate("legs-animation-collection", "legs-dumbbell-deadlift", expectedSeconds: 2.0) }
    func testTrainingAll_legs_hip_flexion() { auditCandidate("legs-animation-collection", "legs-hip-flexion", expectedSeconds: 2.0) }
    func testTrainingAll_legs_prone_leg_curl() { auditCandidate("legs-animation-collection", "legs-prone-leg-curl", expectedSeconds: 2.0) }
    func testTrainingAll_shoulders_light_warmup() { auditCandidate("shoulders-animation-collection", "shoulders-light-warmup", expectedSeconds: 1.7) }
    func testTrainingAll_shoulders_band_pass_through() { auditCandidate("shoulders-animation-collection", "shoulders-band-pass-through", expectedSeconds: 1.7) }
    func testTrainingAll_shoulders_trx_y() { auditCandidate("shoulders-animation-collection", "shoulders-trx-y", expectedSeconds: 1.7) }
    func testTrainingAll_shoulders_prone_scapular_lift() { auditCandidate("shoulders-animation-collection", "shoulders-prone-scapular-lift", expectedSeconds: 1.7) }
    func testTrainingAll_shoulders_trx_w() { auditCandidate("shoulders-animation-collection", "shoulders-trx-w", expectedSeconds: 1.7) }
    func testTrainingAll_shoulders_bent_extension() { auditCandidate("shoulders-animation-collection", "shoulders-bent-extension", expectedSeconds: 1.7) }
    func testTrainingAll_shoulders_machine_reverse_fly() { auditCandidate("shoulders-animation-collection", "shoulders-machine-reverse-fly", expectedSeconds: 1.7) }
    func testTrainingAll_shoulders_dumbbell_press() { auditCandidate("shoulders-animation-collection", "shoulders-dumbbell-press", expectedSeconds: 1.7) }
    func testTrainingAll_shoulders_single_dumbbell_press() { auditCandidate("shoulders-animation-collection", "shoulders-single-dumbbell-press", expectedSeconds: 1.28) }
    func testTrainingAll_shoulders_lateral_raise() { auditCandidate("shoulders-animation-collection", "shoulders-lateral-raise", expectedSeconds: 1.7) }
    func testTrainingAll_shoulders_front_raise() { auditCandidate("shoulders-animation-collection", "shoulders-front-raise", expectedSeconds: 1.7) }
    func testTrainingDark_arms_warmup_triceps() { auditCandidate("arms-animation-collection", "arms-warmup-triceps", expectedSeconds: 0.725, extraArguments: ["--equipment-dark", "--equipment-large-text"]) }
    func testTrainingDark_chest_warmup_roller_y() { auditCandidate("chest-animation-collection", "chest-warmup-roller-y", expectedSeconds: 1.7, extraArguments: ["--equipment-dark", "--equipment-large-text"]) }
    func testTrainingDark_shoulders_dumbbell_press() { auditCandidate("shoulders-animation-collection", "shoulders-dumbbell-press", expectedSeconds: 1.7, extraArguments: ["--equipment-dark"]) }
    func testTrainingDark_abs_supine_crunch() { auditCandidate("abs-collection", "abs-supine-crunch", expectedSeconds: 1.7, extraArguments: ["--equipment-dark"]) }
    func testTrainingDark_arms_extra_lying_barbell_extension() { auditCandidate("arms-extra-animation-collection", "arms-extra-lying-barbell-extension", expectedSeconds: 1.7, extraArguments: ["--equipment-dark", "--equipment-large-text"]) }
    func testTrainingDark_functional_cooldown_calf_stretch() { auditCandidate("functional-animation-collection", "functional-cooldown-calf-stretch", expectedSeconds: 1.7, extraArguments: ["--equipment-dark", "--equipment-large-text"]) }
    func testTrainingDark_legs_90_90_leg_extension() { auditCandidate("legs-animation-collection", "legs-90-90-leg-extension", expectedSeconds: 2.3333333333333335, extraArguments: ["--equipment-dark"]) }
    func testTrainingDark_back_one_arm_row() { auditCandidate("back-animation-collection", "back-one-arm-row", expectedSeconds: 3.0, extraArguments: ["--equipment-dark"]) }
    func testTrainingLarge_arms_warmup_triceps() { auditCandidate("arms-animation-collection", "arms-warmup-triceps", expectedSeconds: 0.725, extraArguments: ["--equipment-large-text"]) }
    func testTrainingLarge_chest_warmup_roller_y() { auditCandidate("chest-animation-collection", "chest-warmup-roller-y", expectedSeconds: 1.7, extraArguments: ["--equipment-large-text"]) }
    func testTrainingLarge_shoulders_dumbbell_press() { auditCandidate("shoulders-animation-collection", "shoulders-dumbbell-press", expectedSeconds: 1.7, extraArguments: ["--equipment-large-text"]) }
    func testTrainingLarge_abs_supine_crunch() { auditCandidate("abs-collection", "abs-supine-crunch", expectedSeconds: 1.7, extraArguments: ["--equipment-large-text"]) }
    func testTrainingLarge_arms_extra_lying_barbell_extension() { auditCandidate("arms-extra-animation-collection", "arms-extra-lying-barbell-extension", expectedSeconds: 1.7, extraArguments: ["--equipment-large-text"]) }
    func testTrainingLarge_functional_cooldown_calf_stretch() { auditCandidate("functional-animation-collection", "functional-cooldown-calf-stretch", expectedSeconds: 1.7, extraArguments: ["--equipment-large-text"]) }
    func testTrainingDark_legs_general_warmup() { auditCandidate("legs-animation-collection", "legs-general-warmup", expectedSeconds: 2.0, extraArguments: ["--equipment-dark"]) }
    func testTrainingDark_legs_frog_rock() { auditCandidate("legs-animation-collection", "legs-frog-rock", expectedSeconds: 2.0, extraArguments: ["--equipment-dark"]) }
    func testTrainingDark_legs_frog_hip_rotation() { auditCandidate("legs-animation-collection", "legs-frog-hip-rotation", expectedSeconds: 2.0, extraArguments: ["--equipment-dark"]) }
    func testTrainingDark_legs_lunge_rotation() { auditCandidate("legs-animation-collection", "legs-lunge-rotation", expectedSeconds: 2.0, extraArguments: ["--equipment-dark"]) }
    func testTrainingDark_legs_90_90_switch() { auditCandidate("legs-animation-collection", "legs-90-90-switch", expectedSeconds: 2.0, extraArguments: ["--equipment-dark"]) }
    func testTrainingDark_legs_90_90_hip_rise() { auditCandidate("legs-animation-collection", "legs-90-90-hip-rise", expectedSeconds: 2.0, extraArguments: ["--equipment-dark"]) }
    func testTrainingDark_legs_calf_raise() { auditCandidate("legs-animation-collection", "legs-calf-raise", expectedSeconds: 2.0, extraArguments: ["--equipment-dark"]) }
    func testTrainingDark_legs_hip_adduction() { auditCandidate("legs-animation-collection", "legs-hip-adduction", expectedSeconds: 2.0, extraArguments: ["--equipment-dark"]) }
    func testTrainingDark_legs_bulgarian_split_squat() { auditCandidate("legs-animation-collection", "legs-bulgarian-split-squat", expectedSeconds: 2.0, extraArguments: ["--equipment-dark"]) }
    func testTrainingDark_legs_dumbbell_deadlift() { auditCandidate("legs-animation-collection", "legs-dumbbell-deadlift", expectedSeconds: 2.0, extraArguments: ["--equipment-dark"]) }
    func testTrainingDark_legs_hip_flexion() { auditCandidate("legs-animation-collection", "legs-hip-flexion", expectedSeconds: 2.0, extraArguments: ["--equipment-dark"]) }
    func testTrainingDark_legs_prone_leg_curl() { auditCandidate("legs-animation-collection", "legs-prone-leg-curl", expectedSeconds: 2.0, extraArguments: ["--equipment-dark"]) }
    /// Topics already redrawn with the shared anatomy renderer (tools/anatomy).
    func testTrainingLarge_back_one_arm_row() {
        auditCandidate("back-animation-collection", "back-one-arm-row", expectedSeconds: 3.0, extraArguments: ["--equipment-large-text"])
    }
    func testTrainingLarge_legs_90_90_leg_extension() {
        auditCandidate("legs-animation-collection", "legs-90-90-leg-extension", expectedSeconds: 2.3333333333333335, extraArguments: ["--equipment-large-text"])
    }

    private let anatomyRoutes: Set<String> = ["shoulders-animation-collection", "arms-animation-collection",
        "arms-extra-animation-collection", "chest-animation-collection", "back-animation-collection", "abs-collection",
        "legs-animation-collection", "functional-animation-collection"]

    private func auditCandidate(_ route: String, _ id: String, expectedSeconds: Double, extraArguments: [String] = []) {
        app.launchArguments = ["--ui-preview", route] + extraArguments
        app.launch()
        XCTAssertTrue(app.navigationBars.firstMatch.waitForExistence(timeout: 15))
        tap(app.buttons["animatedLesson_\(id)"])
        let playback = app.buttons["trainingPlayback"]
        XCTAssertTrue(playback.waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback)
        waitForExpectations(timeout: 15)
        let secondStep = app.buttons["trainingStep_1"]
        // A partially visible row can be hittable inside the home-indicator area.
        // Bring the entire row into the safe viewport before synthesizing a tap.
        for _ in 0..<8 {
            if secondStep.exists && secondStep.isHittable && secondStep.frame.maxY < app.frame.maxY - 80 { break }
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.8))
                .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.45)))
        }
        XCTAssertTrue(secondStep.isHittable)
        XCTAssertLessThan(secondStep.frame.maxY, app.frame.maxY - 80)
        secondStep.tap()
        XCTAssertEqual(playback.label, "播放")
        let expectedPrefix = String(format: "%.1f /", expectedSeconds)
        XCTAssertTrue(app.staticTexts["trainingTime"].label.hasPrefix(expectedPrefix), "Step seek must reach the specified preview time")
        for _ in 0..<5 {
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.3))
                .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.8)))
        }
        XCTAssertTrue(app.staticTexts["trainingTime"].label.hasPrefix(expectedPrefix), "Scrolling must preserve the selected pose")
        if anatomyRoutes.contains(route) {
            XCTAssertTrue(app.descendants(matching: .any)["trainingMuscles"].exists, "Redrawn lessons name the highlighted muscles")
        }
        capture("all-\(id)-motion")
        tap(app.segmentedControls.buttons["细节图解"])
        if route == "back-animation-collection" {
            XCTAssertTrue(app.staticTexts["trainingDetailExplanation"].exists)
            XCTAssertTrue(app.staticTexts["trainingDetailExplanation"].label.contains("①"))
        }
        if anatomyRoutes.contains(route) {
            XCTAssertTrue(app.staticTexts["trainingDetailExplanation"].exists)
        }
        capture("all-\(id)-detail")
        if extraArguments.contains("--equipment-large-text") && anatomyRoutes.contains(route) {
            auditLargeExplanation("trainingDetailExplanation", name: "\(id)-detail")
        }
        tap(app.segmentedControls.buttons["错误对照"])
        if extraArguments.contains("--equipment-large-text") && anatomyRoutes.contains(route) {
            XCTAssertTrue(app.segmentedControls.buttons["错误对照"].isSelected, "The full visible mode button must select the requested panel")
        }
        if route == "back-animation-collection" { XCTAssertTrue(app.staticTexts["trainingMistakeExplanation"].exists) }
        if route == "abs-collection" {
            let explanation = app.staticTexts["trainingMistakeExplanation"]
            XCTAssertTrue(explanation.exists)
            XCTAssertTrue(explanation.label.contains("左图 · 正确示范"))
            XCTAssertTrue(explanation.label.contains("右图 · 错误示范"))
        }
        if anatomyRoutes.contains(route) {
            XCTAssertTrue(app.staticTexts["trainingMistakeExplanation"].exists)
        }
        capture("all-\(id)-mistakes")
        if extraArguments.contains("--equipment-large-text") && anatomyRoutes.contains(route) {
            auditLargeExplanation("trainingMistakeExplanation", name: "\(id)-mistakes")
        }
        XCTAssertFalse(app.staticTexts["图解暂时无法加载，仍可阅读下方步骤。返回后重新打开此动作可重试。"].exists)
        app.terminate()
    }
    // END FULL TRAINING AUDIT

    private func auditLargeExplanation(_ identifier: String, name: String) {
        let paragraph = app.staticTexts[identifier]
        XCTAssertTrue(paragraph.exists, "Native explanation must be available to accessibility")
        XCTAssertGreaterThan(paragraph.label.count, 20)
        var reachedEnd = false
        for index in 0..<10 {
            captureNativeEvidence("large-explanation-\(name)-\(index)", id: name.replacingOccurrences(of: "-detail", with: "").replacingOccurrences(of: "-mistakes", with: ""), mode: identifier == "trainingDetailExplanation" ? "detail" : "mistakes", position: "paragraph-scroll-\(index)", element: paragraph)
            if paragraph.frame.maxY < app.frame.maxY - 80 && paragraph.frame.maxY > 120 {
                reachedEnd = true
                break
            }
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.8))
                .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.45)))
        }
        XCTAssertTrue(reachedEnd, "Must scroll through the native explanation to its end")
        let mode = app.segmentedControls.buttons["全身动作"]
        let contentTop = app.navigationBars.firstMatch.frame.maxY + 8
        for _ in 0..<10 {
            let frame = mode.frame
            if mode.isHittable && frame.minY >= contentTop && frame.maxY < app.frame.maxY - 80 { break }
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.3))
                .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.8)))
        }
        XCTAssertTrue(mode.isHittable)
        XCTAssertGreaterThanOrEqual(mode.frame.minY, contentTop, "Mode control must clear the navigation bar before tapping")
        XCTAssertLessThan(mode.frame.maxY, app.frame.maxY - 80, "Mode control must fit the safe viewport")
        captureNativeEvidence("mode-return-\(name)", id: name.replacingOccurrences(of: "-detail", with: "").replacingOccurrences(of: "-mistakes", with: ""), mode: identifier == "trainingDetailExplanation" ? "detail" : "mistakes", position: "safe-mode-return", element: mode)
    }

    func testTrainingScroll_functional_warmup_frog() { auditFunctionalScroll("functional-warmup-frog") }
    func testTrainingScroll_functional_warmup_supported_frog() { auditFunctionalScroll("functional-warmup-supported-frog") }
    func testTrainingScroll_functional_warmup_lunge_control() { auditFunctionalScroll("functional-warmup-lunge-control") }
    func testTrainingScroll_functional_warmup_supported_rotation() { auditFunctionalScroll("functional-warmup-supported-rotation") }
    func testTrainingScroll_functional_single_leg_hip_thrust() { auditFunctionalScroll("functional-single-leg-hip-thrust") }
    func testTrainingScroll_functional_dumbbell_lunge_press() { auditFunctionalScroll("functional-dumbbell-lunge-press") }
    func testTrainingScroll_functional_seated_dumbbell_press() { auditFunctionalScroll("functional-seated-dumbbell-press") }
    func testTrainingScroll_functional_dumbbell_romanian_deadlift() { auditFunctionalScroll("functional-dumbbell-romanian-deadlift") }
    func testTrainingScroll_functional_alternating_lunge() { auditFunctionalScroll("functional-alternating-lunge") }
    func testTrainingScroll_functional_cooldown_walk() { auditFunctionalScroll("functional-cooldown-walk") }
    func testTrainingScroll_functional_cooldown_calf_stretch() { auditFunctionalScroll("functional-cooldown-calf-stretch") }
    func testTrainingScroll_functional_cooldown_hamstring_stretch() { auditFunctionalScroll("functional-cooldown-hamstring-stretch") }
    func testTrainingDetailScroll_legs_extension() { auditFunctionalScroll("legs-90-90-leg-extension", route: "legs-animation-collection", mode: "细节图解", verifyReturn: true) }
    func testTrainingDetailScroll_legs_hip_flexion() { auditFunctionalScroll("legs-hip-flexion", route: "legs-animation-collection", mode: "细节图解", verifyReturn: true) }
    private func auditFunctionalScroll(_ id: String, route: String = "functional-animation-collection", mode: String = "错误对照", verifyReturn: Bool = false) {
        app.launchArguments = ["--ui-preview", route]
        app.launch()
        XCTAssertTrue(app.navigationBars.firstMatch.waitForExistence(timeout: 15))
        tap(app.buttons["animatedLesson_\(id)"])
        let playback = app.buttons["trainingPlayback"]
        XCTAssertTrue(playback.waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback)
        waitForExpectations(timeout: 15)
        tap(app.segmentedControls.buttons[mode])
        capture("scroll-\(id)-0")
        var reachedArrangement = false
        for index in 1...8 {
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.8))
                .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.4)))
            capture("scroll-\(id)-\(index)")
            let heading = app.staticTexts["训练安排"]
            if heading.exists && heading.isHittable && heading.frame.maxY < app.frame.maxY - 80 {
                reachedArrangement = true
                break
            }
        }
        XCTAssertTrue(reachedArrangement, "Must scroll past the complete comparison to the native training text")
        XCTAssertFalse(app.staticTexts["图解暂时无法加载，仍可阅读下方步骤。返回后重新打开此动作可重试。"].exists)
        if verifyReturn {
            for _ in 0..<9 {
                app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.3))
                    .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.8)))
            }
            tap(app.segmentedControls.buttons["全身动作"])
            XCTAssertTrue(playback.waitForExistence(timeout: 5))
            XCTAssertTrue(playback.isEnabled)
            capture("scroll-\(id)-returned-motion")
        }
        app.terminate()
    }

    func testTrainingRepairedSteps_chest_warmup_roller_y() { auditRepairedSteps("chest-animation-collection", "chest-warmup-roller-y", times: [0.3, 1.7, 3.05, 4.65]) }
    func testTrainingRepairedSteps_arms_extra_lying_barbell_extension() { auditRepairedSteps("arms-extra-animation-collection", "arms-extra-lying-barbell-extension", times: [0.3, 1.7, 3.05, 4.5, 5.85]) }
    func testTrainingRepairedSteps_functional_lunge_press() { auditRepairedSteps("functional-animation-collection", "functional-dumbbell-lunge-press", times: [0.3, 1.7, 3.05, 4.65]) }
    private func auditRepairedSteps(_ route: String, _ id: String, times: [Double]) {
        app.launchArguments = ["--ui-preview", route]
        app.launch()
        XCTAssertTrue(app.navigationBars.firstMatch.waitForExistence(timeout: 15))
        tap(app.buttons["animatedLesson_\(id)"])
        let playback = app.buttons["trainingPlayback"]
        XCTAssertTrue(playback.waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback)
        waitForExpectations(timeout: 15)
        for (index, seconds) in times.enumerated() {
            let step = app.buttons["trainingStep_\(index)"]
            for _ in 0..<10 {
                if step.exists && step.isHittable && step.frame.maxY < app.frame.maxY - 80 { break }
                app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.8))
                    .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.45)))
            }
            XCTAssertTrue(step.isHittable)
            XCTAssertLessThan(step.frame.maxY, app.frame.maxY - 80)
            step.tap()
            XCTAssertEqual(playback.label, "播放")
            let prefix = String(format: "%.1f /", seconds)
            XCTAssertTrue(app.staticTexts["trainingTime"].label.hasPrefix(prefix))
            for _ in 0..<6 {
                app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.3))
                    .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.8)))
            }
            XCTAssertTrue(app.staticTexts["trainingTime"].label.hasPrefix(prefix))
            capture("repaired-\(id)-step-\(index)")
        }
        app.terminate()
    }

    func testTrainingUnifiedUpperCollections() {
        auditUnifiedCollections(["arms", "chest", "shoulders", "abs"])
    }

    func testTrainingUnifiedLowerCollections() {
        auditUnifiedCollections(["arms-extra", "functional", "legs", "back"])
    }

    private func auditUnifiedCollections(_ topics: [String]) {
        openCoachPreview()
        tap(app.buttons["trainingCollections"])
        capture("formal-training-collections")
        for topic in topics {
            tap(app.buttons["animatedCollection_\(topic)"])
            let lesson = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "animatedLesson_")).firstMatch
            XCTAssertTrue(lesson.waitForExistence(timeout: 10))
            XCTAssertFalse(app.buttons["trainingOriginalVideo"].exists)
            tap(lesson)
            let playback = app.buttons["trainingPlayback"]
            XCTAssertTrue(playback.waitForExistence(timeout: 10))
            expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback)
            waitForExpectations(timeout: 15)
            capture("unified-\(topic)-lesson")
            app.navigationBars.buttons.element(boundBy: 0).tap()
            app.navigationBars.buttons.element(boundBy: 0).tap()
        }
        app.terminate()
    }

    /// Settings no longer lists source videos or training references.
    func testTrainingUnifiedSettingsReferences() {
        app.launchArguments = ["--ui-preview", "settings"]
        app.launch()
        XCTAssertTrue(app.navigationBars.firstMatch.waitForExistence(timeout: 15))
        for _ in 0..<4 { app.swipeUp() }
        XCTAssertFalse(app.staticTexts["训练参考"].exists)
        let reference = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "trainingReference_"))
        XCTAssertEqual(reference.count, 0)
        XCTAssertEqual(app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "视频")).count, 0)
        capture("settings-without-references")
        app.terminate()
    }

    func testTrainingReduceMotionStaticSteps() {
        app.launchArguments = ["--ui-preview", "abs-collection", "--training-reduce-motion"]
        app.launch()
        tap(app.buttons["animatedLesson_abs-warmup-marching"])
        let playback = app.buttons["trainingPlayback"]
        XCTAssertTrue(playback.waitForExistence(timeout: 15))
        XCTAssertFalse(playback.isEnabled)
        XCTAssertTrue(app.staticTexts["已减少动态效果，点击步骤查看静态姿势。"].exists)
        let step = app.buttons["trainingStep_1"]
        for _ in 0..<8 {
            if step.exists && step.isHittable && step.frame.maxY < app.frame.maxY - 80 { break }
            app.swipeUp()
        }
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: step)
        waitForExpectations(timeout: 15)
        step.tap()
        let time = app.staticTexts["trainingTime"]
        XCTAssertTrue(time.label.hasPrefix("1.7 /"))
        let paused = time.label
        Thread.sleep(forTimeInterval: 1.2)
        XCTAssertEqual(time.label, paused)
        XCTAssertFalse(playback.isEnabled)
        for _ in 0..<5 { app.swipeDown() }
        capture("reduce-motion-static-second-step")
        app.terminate()
    }

    /// Lessons autoplay, tapping the picture pauses and resumes it, rows carry no video reference,
    /// and the equipment list shows each exercise's own icon.
    func testCoachAnimationTapToggleAndRows() {
        app.launchArguments = ["--ui-preview", "chest-animation-collection"]
        app.launch()
        XCTAssertTrue(app.navigationBars.firstMatch.waitForExistence(timeout: 15))
        let videoText = NSPredicate(format: "label CONTAINS %@ OR label CONTAINS %@", "视频", "原片")
        XCTAssertEqual(app.staticTexts.containing(videoText).count, 0, "Training collection rows must not reference the source video")
        capture("coach-collection-rows")
        tap(app.buttons["animatedLesson_chest-flat-press"])
        let playback = app.buttons["trainingPlayback"]
        XCTAssertTrue(playback.waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback)
        waitForExpectations(timeout: 15)
        XCTAssertEqual(playback.label, "暂停", "Opening a lesson starts the animation")
        let time = app.staticTexts["trainingTime"]
        let start = time.label
        expectation(for: NSPredicate(format: "label != %@", start), evaluatedWith: time)
        waitForExpectations(timeout: 6)
        capture("coach-lesson-playing")
        let artwork = app.descendants(matching: .any)["trainingArtwork"]
        XCTAssertTrue(artwork.exists)
        artwork.tap()
        XCTAssertEqual(playback.label, "播放", "Tapping the animation pauses it")
        let paused = time.label
        Thread.sleep(forTimeInterval: 0.6)
        XCTAssertEqual(time.label, paused)
        capture("coach-lesson-paused")
        artwork.tap()
        XCTAssertEqual(playback.label, "暂停", "Tapping again resumes it")
        expectation(for: NSPredicate(format: "label != %@", paused), evaluatedWith: time)
        waitForExpectations(timeout: 6)
        tap(app.segmentedControls.buttons["细节图解"])
        capture("coach-lesson-detail")
        tap(app.segmentedControls.buttons["全身动作"])
        XCTAssertEqual(playback.label, "暂停", "Returning to the motion view plays again")
        app.terminate()

        app.launchArguments = ["--ui-preview", "equipment"]
        app.launch()
        XCTAssertTrue(app.buttons["equipmentLesson_lat-pulldown"].waitForExistence(timeout: 15))
        capture("coach-equipment-icons")
        tap(app.buttons["equipmentLesson_lat-pulldown"])
        let lessonPlayback = app.buttons["lessonPlayback"]
        XCTAssertTrue(lessonPlayback.waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "label == %@", "暂停动画"), evaluatedWith: lessonPlayback)
        waitForExpectations(timeout: 15)
        XCTAssertTrue(app.staticTexts["lessonMuscles"].exists)
        let canvas = app.descendants(matching: .any)["lessonArtwork"]
        canvas.tap()
        XCTAssertEqual(lessonPlayback.label, "播放动画", "Tapping the animation pauses it")
        capture("coach-equipment-paused")
        canvas.tap()
        XCTAssertEqual(lessonPlayback.label, "暂停动画", "Tapping again resumes it")
        capture("coach-equipment-playing")
        app.terminate()
    }

    /// The lessons redrawn for clarity open, autoplay and render without the load-failure note.
    func testRedrawnLessonsRender() {
        for (route, id) in [("legs-animation-collection", "legs-hip-adduction"), ("chest-animation-collection", "chest-seated-cable-fly"),
                            ("abs-collection", "abs-side-biased-crunch"), ("arms-animation-collection", "arms-overhead-single-cable-extension")] {
            app.launchArguments = ["--ui-preview", route]
            app.launch()
            XCTAssertTrue(app.navigationBars.firstMatch.waitForExistence(timeout: 15))
            tap(app.buttons["animatedLesson_\(id)"])
            let playback = app.buttons["trainingPlayback"]
            XCTAssertTrue(playback.waitForExistence(timeout: 15))
            expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback)
            waitForExpectations(timeout: 15)
            XCTAssertEqual(playback.label, "暂停", "Opening a lesson starts the animation")
            Thread.sleep(forTimeInterval: 1.6)
            capture("redrawn-\(id)")
            XCTAssertFalse(app.staticTexts["图解暂时无法加载，仍可阅读下方步骤。返回后重新打开此动作可重试。"].exists)
            app.terminate()
        }
    }

    func testTrainingBackgroundPausesPlayback() {
        app.launchArguments = ["--ui-preview", "abs-collection"]
        app.launch()
        tap(app.buttons["animatedLesson_abs-warmup-marching"])
        let playback = app.buttons["trainingPlayback"]
        XCTAssertTrue(playback.waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback)
        waitForExpectations(timeout: 15)
        XCTAssertEqual(playback.label, "暂停", "Opening a lesson starts the animation")
        let time = app.staticTexts["trainingTime"]
        let start = time.label
        expectation(for: NSPredicate(format: "label != %@", start), evaluatedWith: time)
        waitForExpectations(timeout: 6)
        XCUIDevice.shared.press(.home)
        XCTAssertTrue(app.wait(for: .runningBackground, timeout: 5))
        Thread.sleep(forTimeInterval: 1.2)
        app.activate()
        XCTAssertTrue(playback.waitForExistence(timeout: 10))
        XCTAssertEqual(playback.label, "播放")
        let paused = time.label
        Thread.sleep(forTimeInterval: 1.2)
        XCTAssertEqual(time.label, paused)
        capture("background-return-paused")
        tap(playback)
        expectation(for: NSPredicate(format: "label != %@", paused), evaluatedWith: time)
        waitForExpectations(timeout: 6)
        app.terminate()
    }

    private func candidateFlow(_ route: String, _ id: String) {
        app.launchArguments = ["--ui-preview", route]
        app.launch()
        // List rows below the fold do not exist on iOS 26 until scrolled to, so wait for the
        // collection itself and let tap(_:) scroll down to the lesson.
        XCTAssertTrue(app.navigationBars.firstMatch.waitForExistence(timeout: 15))
        tap(app.buttons["animatedLesson_\(id)"])
        let playback = app.buttons["trainingPlayback"]
        XCTAssertTrue(playback.waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback)
        waitForExpectations(timeout: 20)
        if route == "functional-animation-collection" || route == "legs-animation-collection" {
            XCTAssertTrue(playback.isHittable, "Playback must remain visible beside the artwork without scrolling past duplicate instructions")
        }
        XCTAssertEqual(playback.label, "暂停", "Opening a lesson starts the animation")
        let time = app.staticTexts["trainingTime"]
        let start = time.label
        expectation(for: NSPredicate(format: "label != %@", start), evaluatedWith: time)
        waitForExpectations(timeout: 6)
        // Observe the running native player through an actual loop without seeking.
        // These screenshots sample playback; they are not a claim of video review.
        let duration = Double(time.label.components(separatedBy: "/").last?.replacingOccurrences(of: "秒", with: "").trimmingCharacters(in: .whitespaces) ?? "") ?? 0
        XCTAssertGreaterThan(duration, 0)
        var observed: [Double] = []
        var looped = false
        let deadline = Date().addingTimeInterval(duration * 2 + 5)
        while Date() < deadline {
            let current = Double(time.label.components(separatedBy: "/")[0].trimmingCharacters(in: .whitespaces)) ?? -1
            XCTAssertGreaterThanOrEqual(current, 0)
            if let previous = observed.last, current + duration / 2 < previous { looped = true }
            observed.append(current)
            capture("running-\(id)-\(observed.count)")
            if looped && Set(observed).count >= 3 { break }
            Thread.sleep(forTimeInterval: 0.45)
        }
        print("Native continuous playback \(id): \(observed), duration=\(duration), looped=\(looped)")
        XCTAssertTrue(looped, "Continuous playback must return through the cycle boundary without a seek")
        XCTAssertGreaterThanOrEqual(Set(observed).count, 3)
        tap(playback)
        let paused = time.label
        Thread.sleep(forTimeInterval: 0.4)
        XCTAssertEqual(time.label, paused)
        tap(app.buttons["trainingSpeed"])
        XCTAssertEqual(app.buttons["trainingSpeed"].label, "恢复 1×")
        tap(app.buttons["trainingStep_1"])
        XCTAssertEqual(playback.label, "播放")
        capture("candidate-\(id)-step")
        for _ in 0..<5 { app.swipeDown() }
        capture("candidate-\(id)-artwork")
        if route == "functional-animation-collection" || route == "legs-animation-collection" {
            tap(app.segmentedControls.buttons["细节图解"])
            capture("candidate-\(id)-detail")
            tap(app.segmentedControls.buttons["错误对照"])
            capture("candidate-\(id)-mistakes")
        }
        XCTAssertFalse(app.staticTexts["图解暂时无法加载，仍可阅读下方步骤。返回后重新打开此动作可重试。"].exists)
        app.terminate()
    }

    func testEquipmentChestPress() { equipmentFlow("seated-chest-press", "坐姿推胸", "推出", "握法细节") }
    func testEquipmentLatPulldown() { equipmentFlow("lat-pulldown", "高位下拉", "下拉", "握法细节") }
    func testEquipmentCableRow() { equipmentFlow("seated-cable-row", "坐姿划船", "后拉", "握法细节") }
    func testEquipmentLegPress() { equipmentFlow("seated-leg-press", "坐姿腿举", "蹬出", "脚位细节") }
    func testEquipmentShoulderPress() { equipmentFlow("seated-shoulder-press", "坐姿器械推肩", "上推", "握法细节") }
    func testEquipmentLegExtension() { equipmentFlow("seated-leg-extension", "坐姿腿屈伸", "抬起", "对齐细节") }
    func testEquipmentAbdominalCrunch() { equipmentFlow("seated-abdominal-crunch", "坐姿器械卷腹", "卷下", "接触细节") }
    func testEquipmentLegCurl() { equipmentFlow("seated-leg-curl", "坐姿腿弯举", "弯回", "对齐细节") }
    func testEquipmentBicepsCurl() { equipmentFlow("preacher-biceps-curl", "器械弯举", "弯起", "握法细节") }
    func testEquipmentPecFly() { equipmentFlow("seated-pec-fly", "蝴蝶机夹胸", "合拢", "握法细节") }

    func testEquipmentHipAbduction() { equipmentFlow("seated-hip-abduction", "坐姿髋外展", "打开", "接触细节") }

    func testDumbbellGobletSquat() { equipmentFlow("dumbbell-goblet-squat", "哑铃高脚杯深蹲", "下蹲", "握法细节", effortDetail: "哑铃随身体下降", returnDetail: "哑铃随身体上升") }
    func testSingleArmDumbbellRow() { equipmentFlow("single-arm-dumbbell-row", "单臂哑铃划船", "上拉", "握法细节", effortDetail: "哑铃上升", returnDetail: "哑铃下降") }
    func testSeatedDumbbellShoulderPress() { equipmentFlow("seated-dumbbell-shoulder-press", "坐姿哑铃推肩", "上推", "握法细节", effortDetail: "哑铃上升", returnDetail: "哑铃下降") }


    private func equipmentFlow(_ id: String, _ title: String, _ effort: String, _ detail: String, effortDetail: String = "配重上升", returnDetail: String = "配重下降") {
        openCoachPreview()
        tap(app.buttons["equipmentLibrary"])
        XCTAssertTrue(app.navigationBars["健身房器材"].waitForExistence(timeout: 10))
        tap(app.buttons["equipmentLesson_\(id)"])
        XCTAssertTrue(app.navigationBars[title].waitForExistence(timeout: 10))
        let playback = app.buttons["lessonPlayback"]
        XCTAssertTrue(playback.waitForExistence(timeout: 10))
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback); waitForExpectations(timeout: 20)
        if playback.label == "暂停动画" { tap(playback) }
        let time = app.staticTexts["lessonTime"], pausedTime = time.label
        tap(playback)
        expectation(for: NSPredicate(format: "label != %@", pausedTime), evaluatedWith: time); waitForExpectations(timeout: 5)
        tap(playback)
        let beforeSpeed = time.label
        tap(app.buttons["lessonSpeed"])
        XCTAssertEqual(app.buttons["lessonSpeed"].value as? String, "0.5 倍")
        XCTAssertEqual(time.label, beforeSpeed)
        app.sliders["lessonProgress"].adjust(toNormalizedSliderPosition: 0.75)
        XCTAssertEqual(playback.label, "播放动画")
        XCTAssertEqual(app.staticTexts["lessonPhase"].label, "回位 · \(returnDetail)")
        capture("\(id)-motion")
        tap(app.buttons["lessonMode_detail"])
        XCTAssertTrue(app.staticTexts["lessonDetailTitle"].label.hasPrefix(detail))
        capture("\(id)-detail")
        tap(app.buttons["lessonMode_mistakes"])
        XCTAssertTrue(app.descendants(matching: .any)["lessonMistakeNotes"].exists)
        capture("\(id)-mistakes")
        for index in 0..<4 {
            tap(app.buttons["lessonStep_\(index)"])
            if index == 1 { XCTAssertTrue(app.staticTexts["lessonDetailTitle"].exists) }
            else {
                XCTAssertEqual(app.buttons["lessonPlayback"].label, "播放动画")
                let phase = index == 0 ? "起始姿势" : index == 2 ? "\(effort) · \(effortDetail)" : "回位 · \(returnDetail)"
                XCTAssertEqual(app.staticTexts["lessonPhase"].label, phase)
                capture("\(id)-\(index == 0 ? "start" : index == 2 ? "effort" : "return")")
            }
        }
        tap(app.buttons["lessonNextStep"])
        for index in 0..<3 { tap(app.buttons["lessonCheck_\(index)"]) }
        XCTAssertTrue(app.staticTexts["lessonCheckSummary"].label.hasPrefix("3 / 3"))
        capture("\(id)-self-check")
        // Backgrounding must pause and returning must not automatically resume.
        for _ in 0..<6 { app.swipeDown() }
        tap(app.buttons["lessonPlayback"])
        XCUIDevice.shared.press(.home)
        XCTAssertTrue(app.wait(for: .runningBackground, timeout: 5))
        app.activate()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 5))
        XCTAssertEqual(app.buttons["lessonPlayback"].label, "播放动画")
        // Exercise the system Back control after returning from SpringBoard.
        // An interactive swipe can be cancelled before it commits the pop.
        let back = app.navigationBars[title].buttons.firstMatch
        XCTAssertTrue(back.waitForExistence(timeout: 5))
        capture("\(id)-after-background")
        print("Return control: \(back.debugDescription)")
        back.tap()
        capture("\(id)-after-back")
        XCTAssertTrue(app.navigationBars["健身房器材"].waitForExistence(timeout: 10))
        // List restores its scroll offset when returning; begin the search at the top.
        for _ in 0..<3 { app.swipeDown() }
        tap(app.buttons["equipmentLesson_\(id)"])
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: app.buttons["lessonPlayback"]); waitForExpectations(timeout: 20)
        XCTAssertFalse(app.staticTexts["图解暂时无法打开"].exists)
        tap(app.buttons["lessonStep_3"]); tap(app.buttons["lessonNextStep"])
        XCTAssertTrue(app.staticTexts["lessonCheckSummary"].label.hasPrefix("0 / 3"))
    }

    func testEquipmentReduceMotionAndLargeText() {
        app.launchArguments = ["--ui-preview", "equipment-seated-leg-press-motion", "--equipment-reduce-motion", "--equipment-large-text"]
        app.launch()
        let playback = app.buttons["lessonPlayback"]
        XCTAssertTrue(playback.waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback); waitForExpectations(timeout: 20)
        XCTAssertEqual(playback.label, "播放动画")
        XCTAssertEqual(app.staticTexts["lessonTime"].label, "0.0 / 6s")
        capture("leg-press-large-text-reduce-motion")
        tap(app.buttons["lessonMode_detail"])
        XCTAssertTrue(app.staticTexts["lessonDetailTitle"].label.hasPrefix("脚位细节"))
        capture("leg-press-large-text-detail")
        tap(app.buttons["lessonStep_2"])
        XCTAssertEqual(app.staticTexts["lessonPhase"].label, "蹬出 · 配重上升")
    }
    func testEquipmentDarkAppearance() {
        app.launchArguments = ["--ui-preview", "equipment-lat-pulldown-detail", "--equipment-dark"]
        app.launch()
        XCTAssertTrue(app.staticTexts["lessonDetailTitle"].waitForExistence(timeout: 15))
        capture("lat-pulldown-dark-detail")
        tap(app.buttons["lessonMode_motion"])
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: app.buttons["lessonPlayback"]); waitForExpectations(timeout: 20)
        capture("lat-pulldown-dark-motion")
    }
    func testNewEquipmentDarkAppearance() {
        for id in ["seated-pec-fly", "seated-leg-curl", "seated-hip-abduction"] {
            app.launchArguments = ["--ui-preview", "equipment-\(id)-detail", "--equipment-dark"]
            app.launch()
            XCTAssertTrue(app.staticTexts["lessonDetailTitle"].waitForExistence(timeout: 15))
            capture("\(id)-dark-detail")
            tap(app.buttons["lessonMode_motion"])
            expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: app.buttons["lessonPlayback"]); waitForExpectations(timeout: 20)
            capture("\(id)-dark-motion")
            app.terminate()
        }
    }
    func testStructuralEquipmentDarkAppearance() {
        for id in ["seated-pec-fly", "seated-leg-curl", "seated-hip-abduction"] {
            app.launchArguments = ["--ui-preview", "equipment-\(id)-detail", "--equipment-dark"]
            app.launch()
            XCTAssertTrue(app.staticTexts["lessonDetailTitle"].waitForExistence(timeout: 15))
            capture("\(id)-dark-detail")
            tap(app.buttons["lessonMode_motion"])
            expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: app.buttons["lessonPlayback"]); waitForExpectations(timeout: 20)
            tap(app.buttons["lessonStep_0"]); capture("\(id)-dark-start")
            tap(app.buttons["lessonStep_2"]); capture("\(id)-dark-effort")
            app.terminate()
        }
    }
    func testHipAbductionReduceMotionAndLargeText() {
        app.launchArguments = ["--ui-preview", "equipment-seated-hip-abduction-motion", "--equipment-reduce-motion", "--equipment-large-text"]
        app.launch()
        let playback = app.buttons["lessonPlayback"]
        XCTAssertTrue(playback.waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback); waitForExpectations(timeout: 20)
        XCTAssertEqual(playback.label, "播放动画")
        XCTAssertEqual(app.staticTexts["lessonTime"].label, "0.0 / 6s")
        capture("hip-abduction-large-text-reduce-motion")
        tap(app.buttons["lessonMode_detail"])
        XCTAssertTrue(app.staticTexts["lessonDetailTitle"].label.hasPrefix("接触细节"))
        capture("hip-abduction-large-text-detail")
        tap(app.buttons["lessonStep_2"])
        XCTAssertEqual(app.staticTexts["lessonPhase"].label, "打开 · 配重上升")
    }
    func testAbdominalCrunchReduceMotionAndLargeText() {
        app.launchArguments = ["--ui-preview", "equipment-seated-abdominal-crunch-motion", "--equipment-reduce-motion", "--equipment-large-text"]
        app.launch()
        let playback = app.buttons["lessonPlayback"]
        XCTAssertTrue(playback.waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback); waitForExpectations(timeout: 20)
        XCTAssertEqual(playback.label, "播放动画")
        XCTAssertEqual(app.staticTexts["lessonTime"].label, "0.0 / 6s")
        capture("abdominal-crunch-large-text-reduce-motion")
        tap(app.buttons["lessonMode_detail"])
        XCTAssertTrue(app.staticTexts["lessonDetailTitle"].label.hasPrefix("接触细节"))
        capture("abdominal-crunch-large-text-detail")
        tap(app.buttons["lessonStep_2"])
        XCTAssertEqual(app.staticTexts["lessonPhase"].label, "卷下 · 配重上升")
    }
    func testReferenceEquipmentDarkAppearance() {
        for id in ["seated-leg-curl", "preacher-biceps-curl", "seated-pec-fly"] {
            app.launchArguments = ["--ui-preview", "equipment-\(id)-detail", "--equipment-dark"]
            app.launch()
            XCTAssertTrue(app.staticTexts["lessonDetailTitle"].waitForExistence(timeout: 15))
            tap(app.buttons["lessonMode_motion"])
            expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: app.buttons["lessonPlayback"]); waitForExpectations(timeout: 20)
            capture("\(id)-dark-motion")
            tap(app.buttons["lessonMode_detail"])
            capture("\(id)-dark-detail")
            app.terminate()
        }
    }
    func testPecFlyReduceMotionAndLargeText() {
        app.launchArguments = ["--ui-preview", "equipment-seated-pec-fly-motion", "--equipment-reduce-motion", "--equipment-large-text"]
        app.launch()
        let playback = app.buttons["lessonPlayback"]
        XCTAssertTrue(playback.waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback); waitForExpectations(timeout: 20)
        XCTAssertEqual(playback.label, "播放动画")
        XCTAssertEqual(app.staticTexts["lessonTime"].label, "0.0 / 6s")
        capture("seated-pec-fly-large-text-start")
        tap(app.buttons["lessonMode_detail"])
        XCTAssertTrue(app.staticTexts["lessonDetailTitle"].label.hasPrefix("握法细节"))
        capture("seated-pec-fly-large-text-detail")
        tap(app.buttons["lessonStep_2"])
        XCTAssertEqual(app.staticTexts["lessonPhase"].label, "合拢 · 配重上升")
        capture("seated-pec-fly-large-text-effort")
    }
    func testPecFlyDarkAppearance() {
        app.launchArguments = ["--ui-preview", "equipment-seated-pec-fly-motion", "--equipment-dark", "--equipment-reduce-motion"]
        app.launch()
        let playback = app.buttons["lessonPlayback"]
        XCTAssertTrue(playback.waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback)
        waitForExpectations(timeout: 20)
        XCTAssertEqual(playback.label, "播放动画")
        capture("seated-pec-fly-dark-start")
        tap(app.buttons["lessonStep_2"])
        XCTAssertEqual(app.staticTexts["lessonPhase"].label, "合拢 · 配重上升")
        capture("seated-pec-fly-dark-effort")
        tap(app.buttons["lessonMode_detail"])
        XCTAssertTrue(app.staticTexts["lessonDetailTitle"].label.hasPrefix("握法细节"))
        XCTAssertFalse(app.staticTexts["图解暂时无法打开"].exists)
        capture("seated-pec-fly-dark-detail")
    }
    func testDumbbellDarkAppearance() {
        for id in ["dumbbell-goblet-squat", "single-arm-dumbbell-row", "seated-dumbbell-shoulder-press"] {
            app.launchArguments = ["--ui-preview", "equipment-\(id)-detail", "--equipment-dark"]
            app.launch()
            XCTAssertTrue(app.staticTexts["lessonDetailTitle"].waitForExistence(timeout: 15))
            capture("\(id)-dark-detail")
            tap(app.buttons["lessonMode_motion"])
            expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: app.buttons["lessonPlayback"]); waitForExpectations(timeout: 20)
            tap(app.buttons["lessonPlayback"])
            app.sliders["lessonProgress"].adjust(toNormalizedSliderPosition: 0.5)
            capture("\(id)-dark-motion")
            XCTAssertFalse(app.staticTexts["图解暂时无法打开"].exists)
            app.terminate()
        }
    }
    func testDumbbellReduceMotionAndLargeText() {
        for (id, phase) in [("dumbbell-goblet-squat", "下蹲 · 哑铃随身体下降"), ("single-arm-dumbbell-row", "上拉 · 哑铃上升"), ("seated-dumbbell-shoulder-press", "上推 · 哑铃上升")] {
            app.launchArguments = ["--ui-preview", "equipment-\(id)-motion", "--equipment-reduce-motion", "--equipment-large-text"]
            app.launch()
            let playback = app.buttons["lessonPlayback"]
            XCTAssertTrue(playback.waitForExistence(timeout: 15))
            expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback); waitForExpectations(timeout: 20)
            XCTAssertEqual(playback.label, "播放动画")
            XCTAssertEqual(app.staticTexts["lessonTime"].label, "0.0 / 6s")
            capture("\(id)-large-text-reduce-motion")
            tap(app.buttons["lessonMode_detail"])
            XCTAssertTrue(app.staticTexts["lessonDetailTitle"].label.hasPrefix("握法细节"))
            capture("\(id)-large-text-detail")
            tap(app.buttons["lessonStep_2"])
            XCTAssertEqual(app.staticTexts["lessonPhase"].label, phase)
            app.terminate()
        }
    }

    private var equipmentPreviewIDs: [String] {
        ["seated-chest-press", "lat-pulldown", "seated-cable-row", "seated-leg-press",
         "seated-shoulder-press", "seated-leg-extension", "seated-abdominal-crunch",
         "seated-leg-curl", "preacher-biceps-curl", "seated-pec-fly", "seated-hip-abduction",
         "dumbbell-goblet-squat", "single-arm-dumbbell-row", "seated-dumbbell-shoulder-press"]
    }

    func testAllEquipmentDarkAppearance() {
        for id in equipmentPreviewIDs {
            app.launchArguments = ["--ui-preview", "equipment-\(id)-motion", "--equipment-dark", "--equipment-reduce-motion"]
            app.launch()
            let playback = app.buttons["lessonPlayback"]
            XCTAssertTrue(playback.waitForExistence(timeout: 15))
            expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback)
            waitForExpectations(timeout: 20)
            XCTAssertEqual(playback.label, "播放动画")
            XCTAssertFalse(app.staticTexts["图解暂时无法打开"].exists)
            capture("\(id)-dark-start")
            tap(app.buttons["lessonStep_2"])
            XCTAssertEqual(playback.label, "播放动画")
            capture("\(id)-dark-effort")
            tap(app.buttons["lessonMode_detail"])
            XCTAssertTrue(app.staticTexts["lessonDetailTitle"].exists)
            capture("\(id)-dark-detail")
            app.terminate()
        }
    }

    func testAllEquipmentLargeTextAndReduceMotion() {
        for id in equipmentPreviewIDs {
            app.launchArguments = ["--ui-preview", "equipment-\(id)-motion", "--equipment-reduce-motion", "--equipment-large-text"]
            app.launch()
            let playback = app.buttons["lessonPlayback"]
            XCTAssertTrue(playback.waitForExistence(timeout: 15))
            expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback)
            waitForExpectations(timeout: 20)
            XCTAssertEqual(playback.label, "播放动画")
            XCTAssertEqual(app.staticTexts["lessonTime"].label, "0.0 / 6s")
            capture("\(id)-large-text-start")
            tap(app.buttons["lessonMode_detail"])
            XCTAssertTrue(app.staticTexts["lessonDetailTitle"].exists)
            capture("\(id)-large-text-detail")
            tap(app.buttons["lessonStep_2"])
            XCTAssertEqual(playback.label, "播放动画")
            XCTAssertNotEqual(app.staticTexts["lessonTime"].label, "0.0 / 6s")
            XCTAssertFalse(app.staticTexts["图解暂时无法打开"].exists)
            app.terminate()
        }
    }

    func testAllEquipmentReturnFromBackground() {
        for id in equipmentPreviewIDs {
            openCoachPreview()
            tap(app.buttons["equipmentLibrary"])
            tap(app.buttons["equipmentLesson_\(id)"])
            let playback = app.buttons["lessonPlayback"]
            XCTAssertTrue(playback.waitForExistence(timeout: 15))
            expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback)
            waitForExpectations(timeout: 20)
            XCUIDevice.shared.press(.home)
            XCTAssertTrue(app.wait(for: .runningBackground, timeout: 5))
            app.activate()
            XCTAssertTrue(app.wait(for: .runningForeground, timeout: 5))
            XCTAssertEqual(playback.label, "播放动画")
            let back = app.navigationBars.buttons.firstMatch
            XCTAssertTrue(back.waitForExistence(timeout: 5))
            back.tap()
            capture("\(id)-returned-library")
            XCTAssertTrue(app.navigationBars["健身房器材"].waitForExistence(timeout: 10))
            app.terminate()
        }
    }

    func testMainFlowAndRestartPersistence() throws {
        defer { capture("Main-flow-final-screen") }
        startFresh(); capture("01-Today")
        tap(app.buttons["generateReport"])
        XCTAssertTrue(app.navigationBars["今日身体记录"].waitForExistence(timeout: 10))
        capture("02-Report")
        tap(app.buttons["askCoach"])
        let input = app.descendants(matching: .any)["chatInput"].firstMatch
        XCTAssertTrue(input.waitForExistence(timeout: 10))
        tap(input)
        if !app.keyboards.firstMatch.waitForExistence(timeout: 3) { input.tap() }
        input.typeText("今天适合运动吗？")
        tap(app.buttons["sendMessage"])
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "这是演示回复")).firstMatch.waitForExistence(timeout: 10))
        // Wait for stream completion through button enablement, not an arbitrary delay.
        let launcher = app.buttons["planLauncher"].firstMatch
        app.swipeUp()
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: launcher)
        waitForExpectations(timeout: 30)
        capture("03-Chat")
        tap(launcher)
        tap(app.buttons["chooseEquipment"])
        app.switches["equipmentOption_wall"].coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap()
        tap(app.buttons["confirmEquipment"])
        tap(app.buttons["generatePlan"])
        XCTAssertTrue(app.navigationBars["你的训练草案"].waitForExistence(timeout: 10))
        tap(app.buttons["exerciseLesson"].firstMatch)
        XCTAssertTrue(app.buttons["trainingPlayback"].waitForExistence(timeout: 10) || app.buttons["lessonPlayback"].waitForExistence(timeout: 10))
        app.navigationBars.buttons.firstMatch.tap()
        capture("04-Draft")
        tap(app.buttons["confirmPlan"])
        if app.buttons["关闭"].firstMatch.waitForExistence(timeout: 3) { app.buttons["关闭"].firstMatch.tap() }
        app.tabBars.buttons["计划"].tap()
        XCTAssertTrue(app.buttons["workoutRow"].firstMatch.waitForExistence(timeout: 5))
        tap(app.buttons["workoutRow"].firstMatch)
        XCTAssertTrue(app.buttons["exerciseLesson"].firstMatch.exists)
        tap(app.buttons["recordFeedback"])
        app.textFields["feedbackNote"].tap(); app.textFields["feedbackNote"].typeText("完成后感觉轻松")
        tap(app.buttons["saveFeedback"])
        XCTAssertTrue(app.staticTexts["完成后感觉轻松"].waitForExistence(timeout: 5))
        capture("05-FeedbackSaved")
        app.terminate(); app.launchArguments = ["--demo"]; app.launch()
        app.tabBars.buttons["计划"].tap(); tap(app.buttons["workoutRow"].firstMatch)
        tap(app.buttons["recordFeedback"])
        XCTAssertEqual(app.textFields["feedbackNote"].value as? String, "完成后感觉轻松")
    }
    func testLiveGuestDefaultsAndRestart() {
        startFresh(live: true)
        tap(app.buttons["addNote"])
        app.textFields["noteInput"].tap(); app.textFields["noteInput"].typeText("本机真实模式补记")
        tap(app.buttons["saveNote"])
        tap(app.buttons["settings"])
        for id in ["healthConsent", "cloudConsent", "aiConsent"] {
            let control = app.switches[id].firstMatch
            XCTAssertTrue(control.waitForExistence(timeout: 10))
            XCTAssertEqual(control.value as? String, "0")
        }
        capture("Live-Guest-Privacy-Off")
        app.terminate(); app.launchArguments = ["--ui-testing-live", "-AppleInterfaceStyle", "Dark"]; app.launch()
        XCTAssertTrue(app.buttons["settings"].waitForExistence(timeout: 15))
        tap(app.buttons["addNote"])
        XCTAssertEqual(app.textFields["noteInput"].value as? String, "本机真实模式补记")
        capture("Live-Guest-Dark-Restored")
    }
    func testNoteAndOfflineHistory() {
        startFresh()
        tap(app.buttons["addNote"])
        app.textFields["noteInput"].tap(); app.textFields["noteInput"].typeText("睡醒精神不错")
        tap(app.buttons["saveNote"])
        tap(app.buttons["settings"])
        tap(app.buttons["scenarioPicker"])
        tap(app.buttons["离线"])
        app.buttons["关闭"].firstMatch.tap()
        tap(app.buttons["generateReport"])
        XCTAssertTrue(app.otherElements["requestError"].waitForExistence(timeout: 5) || app.staticTexts["请求未完成"].waitForExistence(timeout: 5))
        tap(app.buttons["查看已有日报"])
        XCTAssertTrue(app.staticTexts["演示日报 · 已保存在本机"].exists)
        capture("06-OfflineHistory")
        app.terminate(); app.launchArguments = ["--demo"]; app.launch()
        tap(app.buttons["addNote"])
        XCTAssertEqual(app.textFields["noteInput"].value as? String, "睡醒精神不错")
    }
}

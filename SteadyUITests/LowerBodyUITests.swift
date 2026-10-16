import XCTest

@MainActor final class LowerBodyUITests: XCTestCase {
    private let app = XCUIApplication()
    override func setUpWithError() throws { continueAfterFailure = false; XCUIDevice.shared.orientation = .portrait }
    private func open(_ screen: String, flags: [String] = []) {
        app.launchArguments = ["--ui-preview", screen] + flags; app.launch()
    }
    private func tap(_ element: XCUIElement, file: StaticString = #filePath, line: UInt = #line) {
        for _ in 0..<14 {
            if element.exists && element.isHittable {
                let frame = element.frame
                let top = app.navigationBars.allElementsBoundByIndex.map { $0.frame.maxY }.max() ?? 60
                if frame.midY > top + 4 && frame.midY < app.frame.maxY - 30 || element.identifier == "saveMovementConditions" || element.identifier == "confirmEquipment" || element.label == "关闭" {
                    Thread.sleep(forTimeInterval: 0.5); element.tap(); Thread.sleep(forTimeInterval: 0.5); return
                }
            }
            if XCUIDevice.shared.orientation.isLandscape {
                let window = app.windows.firstMatch
                let upward = !(element.exists && element.frame.midY < 70)
                let start = window.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: upward ? 0.85 : 0.3))
                let end = window.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: upward ? 0.3 : 0.85))
                start.press(forDuration: 0.05, thenDragTo: end)
            } else if element.exists && element.frame.midY < 160 { app.swipeDown() } else { app.swipeUp() }
        }
        XCTFail("无法点击\(element)", file: file, line: line)
    }
    private func capture(_ name: String) {
        let item = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); item.name = name; item.lifetime = .keepAlways; add(item)
    }
    private func choose(_ id: String, status: String) {
        tap(app.buttons["movementCondition_" + id].firstMatch)
        let option = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", status)).firstMatch
        XCTAssertTrue(option.waitForExistence(timeout: 5)); option.tap()
    }
    func testUncertainCanPreviewAndConfirmedConditionsPersist() {
        open("lower-body-start")
        tap(app.buttons["chooseMovementConditions"])
        XCTAssertTrue(app.navigationBars["确认动作条件"].waitForExistence(timeout: 5))
        choose("basic-squat", status: "不确定")
        tap(app.buttons["conditionTeaching_basic-squat"])
        XCTAssertTrue(app.navigationBars["基础自重深蹲"].waitForExistence(timeout: 5))
        let play = app.buttons["trainingPlayback"]
        XCTAssertTrue(play.waitForExistence(timeout: 10)); XCTAssertTrue(play.isEnabled)
        app.navigationBars["基础自重深蹲"].buttons.firstMatch.tap()
        XCTAssertTrue(app.navigationBars["确认动作条件"].waitForExistence(timeout: 5))
        XCTAssertTrue((app.buttons["movementCondition_basic-squat"].value as? String)?.contains("不确定") == true)
        choose("basic-squat", status: "能完成")
        choose("floor-access", status: "能完成")
        capture("lower-conditions-confirmed")
        tap(app.buttons["saveMovementConditions"])
        tap(app.buttons["chooseMovementConditions"])
        XCTAssertTrue((app.buttons["movementCondition_basic-squat"].value as? String)?.contains("能完成") == true)
        tap(app.buttons["saveMovementConditions"])
        tap(app.buttons["generatePlan"])
        XCTAssertTrue(app.navigationBars["你的训练草案"].waitForExistence(timeout: 10))
        capture("lower-bodyweight-draft")
    }
    func testThreeScenesGenerateRequiredPairs() {
        for scene in ["bodyweight", "dumbbells", "gym", "chair"] {
            open("lower-body-form-" + scene)
            tap(app.buttons["generatePlan"])
            XCTAssertTrue(app.navigationBars["你的训练草案"].waitForExistence(timeout: 10))
            XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "承担膝主导")).firstMatch.exists)
            app.swipeUp()
            XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "承担髋主导")).firstMatch.exists)
            capture("lower-scene-" + scene)
        }
    }
    func testGenerateReplaceConfirmRestartKeepsVersionTwoTeaching() {
        open("lower-body-form-dumbbells", flags: ["--ui-persistent-lower", "--reset-lower"])
        tap(app.buttons["generatePlan"])
        XCTAssertTrue(app.navigationBars["你的训练草案"].waitForExistence(timeout: 10))
        // Main slots are knee then hip; warmup occupies slot zero.
        tap(app.buttons.matching(identifier: "replaceExercise").matching(NSPredicate(format: "label CONTAINS %@", "自重深蹲")).firstMatch)
        XCTAssertTrue(app.navigationBars["选择替代动作"].waitForExistence(timeout: 5))
        tap(app.buttons["replacementPreview_dumbbell-goblet-squat"])
        XCTAssertTrue(app.navigationBars["哑铃高脚杯深蹲"].waitForExistence(timeout: 10))
        capture("lower-goblet-preview")
        app.navigationBars["哑铃高脚杯深蹲"].buttons.firstMatch.tap()
        tap(app.buttons["replaceWith_dumbbell-goblet-squat"])
        tap(app.buttons["confirmPlan"])
        app.terminate(); app.launchArguments = ["--demo"]; app.launch()
        app.tabBars.buttons["计划"].tap()
        tap(app.buttons.matching(identifier: "workoutRow").matching(NSPredicate(format: "label CONTAINS %@", "下肢基础")).firstMatch)
        XCTAssertTrue(app.staticTexts["哑铃高脚杯深蹲"].waitForExistence(timeout: 5))
        tap(app.buttons.matching(identifier: "exerciseLesson").matching(NSPredicate(format: "label CONTAINS %@", "哑铃高脚杯深蹲")).firstMatch)
        XCTAssertTrue(app.navigationBars["哑铃高脚杯深蹲"].waitForExistence(timeout: 10))
        capture("lower-restart-correct-teaching")
    }
    func testSevenNewAnimationsPlaybackStepsAndDiagrams() {
        let ids = ["chair-sit-to-stand", "floor-glute-bridge", "supported-calf-raise", "bodyweight-squat", "supported-split-squat", "side-lying-hip-abduction", "unloaded-hip-hinge"]
        for id in ids {
            open("animated-lesson-legs:legs-basic-" + id, flags: ["--equipment-dark"])
            let play = app.buttons["trainingPlayback"]
            XCTAssertTrue(play.waitForExistence(timeout: 10)); XCTAssertTrue(play.isEnabled)
            tap(play); XCTAssertEqual(play.label, "播放")
            tap(app.buttons["trainingSpeed"]); XCTAssertEqual(app.buttons["trainingSpeed"].label, "恢复 1×")
            tap(app.buttons["trainingStep_3"])
            capture("lower-" + id + "-keyframe")
            tap(app.buttons["细节图解"])
            XCTAssertTrue(app.staticTexts["trainingDetailExplanation"].waitForExistence(timeout: 5))
            capture("lower-" + id + "-detail")
            tap(app.buttons["错误对照"])
            XCTAssertTrue(app.staticTexts["trainingMistakeExplanation"].waitForExistence(timeout: 5))
            capture("lower-" + id + "-mistakes")
        }
    }
    func testLargeTextAndReducedMotionTeaching() {
        open("animated-lesson-legs:legs-basic-floor-glute-bridge", flags: ["--equipment-large-text", "--training-reduce-motion"])
        let play = app.buttons["trainingPlayback"]
        XCTAssertTrue(play.waitForExistence(timeout: 10)); XCTAssertEqual(play.label, "播放")
        tap(app.buttons["trainingStep_3"])
        capture("lower-large-text-reduced-motion")
    }
    func testReplacementCanConfirmPreviouslyUncertainConditions() {
        open("lower-body-replacement")
        XCTAssertTrue(app.navigationBars["选择替代动作"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["replaceWith_functional-dumbbell-romanian-deadlift"].exists)
        tap(app.buttons["replacementConditions_functional-dumbbell-romanian-deadlift"])
        choose("hip-hinge", status: "能完成")
        tap(app.buttons["saveMovementConditions"])
        capture("lower-replacement-conditions-saved")
        XCTAssertTrue(app.navigationBars["选择替代动作"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["replaceWith_functional-dumbbell-romanian-deadlift"].waitForExistence(timeout: 5))
        tap(app.buttons["replacementPreview_functional-dumbbell-romanian-deadlift"])
        XCTAssertTrue(app.navigationBars["双哑铃罗马尼亚硬拉"].waitForExistence(timeout: 10))
        capture("lower-replacement-newly-confirmed")
    }
    func testNineExistingLowerBodyLessonsStillOpen() {
        let screens = ["equipment-dumbbell-goblet-squat-motion", "animated-lesson-functional:functional-dumbbell-romanian-deadlift", "equipment-seated-leg-press-motion", "equipment-seated-leg-curl-motion", "animated-lesson-legs:legs-prone-leg-curl", "animated-lesson-legs:legs-calf-raise", "animated-lesson-legs:legs-bulgarian-split-squat", "animated-lesson-legs:legs-hip-adduction", "equipment-seated-leg-extension-motion"]
        for (index, screen) in screens.enumerated() {
            open(screen)
            let playback = app.buttons[screen.hasPrefix("equipment-") ? "lessonPlayback" : "trainingPlayback"]
            XCTAssertTrue(playback.waitForExistence(timeout: 10)); XCTAssertTrue(playback.isEnabled)
            capture("lower-existing-" + String(index))
        }
    }

    func testHistoricalPlanRemainsReadableAfterConditionRevocation() {
        open("lower-body-condition-changed")
        XCTAssertTrue(app.staticTexts["movementConditionsChanged"].waitForExistence(timeout: 10))
        capture("lower-history-revoked-conditions")
        tap(app.buttons.matching(identifier: "exerciseLesson").matching(NSPredicate(format: "label CONTAINS %@", "臀桥")).firstMatch)
        XCTAssertTrue(app.buttons["trainingPlayback"].waitForExistence(timeout: 10))
        capture("lower-history-teaching-still-readable")
    }
    func testLandscapeTeachingKeepsControlsUsable() {
        XCUIDevice.shared.orientation = .landscapeLeft
        defer { XCUIDevice.shared.orientation = .portrait }
        open("animated-lesson-legs:legs-basic-floor-glute-bridge")
        XCTAssertTrue(app.buttons["trainingPlayback"].waitForExistence(timeout: 10))
        XCTAssertGreaterThan(app.windows.firstMatch.frame.width, app.windows.firstMatch.frame.height, "Teaching must actually rotate to landscape")
        tap(app.buttons["trainingStep_3"])
        capture("lower-landscape-keyframe")
        tap(app.buttons["细节图解"])
        XCTAssertTrue(app.staticTexts["trainingDetailExplanation"].waitForExistence(timeout: 5))
        capture("lower-landscape-details")
    }

    func testChairAndSupportAreExplicitSelectionsAndRemembered() {
        open("lower-body-start")
        tap(app.buttons["chooseEquipment"])
        let chair = app.switches["equipmentOption_stable-chair"], support = app.switches["equipmentOption_fixed-support"]
        for _ in 0..<8 where !chair.exists { app.swipeUp() }
        XCTAssertTrue(chair.waitForExistence(timeout: 5)); XCTAssertEqual(chair.value as? String, "0")
        XCTAssertEqual(support.value as? String, "0")
        chair.coordinate(withNormalizedOffset: CGVector(dx: 0.94, dy: 0.5)).tap()
        support.coordinate(withNormalizedOffset: CGVector(dx: 0.94, dy: 0.5)).tap()
        XCTAssertEqual(chair.value as? String, "1"); XCTAssertEqual(support.value as? String, "1")
        capture("lower-equipment-selected-before-save")
        tap(app.buttons["confirmEquipment"])
        tap(app.buttons["chooseEquipment"])
        XCTAssertEqual(chair.value as? String, "1"); XCTAssertEqual(support.value as? String, "1")
        capture("lower-equipment-explicit-chair-support")
        tap(app.buttons["confirmEquipment"])
        tap(app.buttons["chooseMovementConditions"])
        let chairCondition = app.buttons["movementCondition_chair-stable"]
        for _ in 0..<6 where !chairCondition.exists { app.swipeUp() }
        XCTAssertTrue(chairCondition.waitForExistence(timeout: 5))
        capture("lower-equipment-relevant-conditions")
    }
    func testEveryScenePreviewReplaceConfirmAndRestart() {
        let cases = [
            ("equipped-bodyweight", "椅子坐站", "chair-sit-to-stand", "bodyweight-squat", "自重深蹲", "基础自重深蹲"),
            ("dumbbells", "自重深蹲", "bodyweight-squat", "dumbbell-goblet-squat", "哑铃高脚杯深蹲", "哑铃高脚杯深蹲"),
            ("gym", "自重深蹲", "bodyweight-squat", "seated-leg-press", "坐姿腿举", "坐姿腿举")
        ]
        for item in cases {
            open("lower-body-form-" + item.0, flags: ["--ui-persistent-lower", "--reset-lower"])
            tap(app.buttons["generatePlan"])
            XCTAssertTrue(app.navigationBars["你的训练草案"].waitForExistence(timeout: 10))
            tap(app.buttons.matching(identifier: "exerciseLesson").matching(NSPredicate(format: "label CONTAINS %@", item.1)).firstMatch)
            let teachingTitle = item.2 == "bodyweight-squat" ? "基础自重深蹲" : "椅子坐站"
            XCTAssertTrue(app.navigationBars[teachingTitle].waitForExistence(timeout: 10))
            app.navigationBars[teachingTitle].buttons.firstMatch.tap()
            tap(app.buttons.matching(identifier: "replaceExercise").matching(NSPredicate(format: "label CONTAINS %@", item.1)).firstMatch)
            tap(app.buttons["replacementPreview_" + item.3])
            XCTAssertTrue(app.navigationBars[item.5].waitForExistence(timeout: 10))
            app.navigationBars[item.5].buttons.firstMatch.tap()
            tap(app.buttons["replaceWith_" + item.3])
            tap(app.buttons["confirmPlan"])
            app.terminate(); app.launchArguments = ["--demo"]; app.launch()
            app.tabBars.buttons["计划"].tap()
            tap(app.buttons.matching(identifier: "workoutRow").matching(NSPredicate(format: "label CONTAINS %@", "下肢基础")).firstMatch)
            tap(app.buttons.matching(identifier: "exerciseLesson").matching(NSPredicate(format: "label CONTAINS %@", item.4)).firstMatch)
            XCTAssertTrue(app.navigationBars[item.5].waitForExistence(timeout: 10))
            capture("lower-full-scene-restart-" + item.0)
        }
    }

}

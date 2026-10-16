import XCTest

@MainActor final class ExerciseCatalogUITests: XCTestCase {
    private let app = XCUIApplication()

    override func setUpWithError() throws { continueAfterFailure = false }

    private func tap(_ element: XCUIElement, file: StaticString = #filePath, line: UInt = #line) {
        // iOS 26 hides the sheet's 确认 while its search field is active; the search's own
        // 关闭 sits in the same navigation bar, so only use it while the keyboard is focused there.
        // Reading `identifier` needs the element to exist, so match the query description instead.
        if !element.exists, "\(element)".contains("confirmEquipment"), app.keyboards.firstMatch.exists,
           let exit = app.navigationBars["确认可用器材"].buttons.matching(NSPredicate(format: "label == %@", "关闭")).allElementsBoundByIndex.last {
            exit.tap(); _ = element.waitForExistence(timeout: 3)
        }
        for attempt in 0..<24 {
            if element.exists && (element.identifier == "confirmEquipment" || element.label == "关闭") && element.isHittable {
                Thread.sleep(forTimeInterval: 0.6); element.tap(); Thread.sleep(forTimeInterval: 0.6); return
            }
            if element.exists && app.navigationBars.firstMatch.exists && app.navigationBars.firstMatch.frame.contains(element.frame) && element.isHittable {
                Thread.sleep(forTimeInterval: 0.6); element.tap(); Thread.sleep(forTimeInterval: 0.6); return
            }
            let top = app.navigationBars.firstMatch.exists ? app.navigationBars.firstMatch.frame.maxY + 8 : app.frame.minY + 50
            let bottom = app.keyboards.firstMatch.exists ? app.keyboards.firstMatch.frame.minY - 8 : app.frame.maxY - 30
            if element.exists && element.frame.midY > top && element.frame.midY < bottom && element.isHittable {
                Thread.sleep(forTimeInterval: 0.6)
                if element.exists && element.isHittable {
                    if element.elementType == .switch {
                        element.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap()
                    } else { element.tap() }
                    Thread.sleep(forTimeInterval: 0.6)
                    return
                }
            }
            // Lazy List rows that scrolled away do not exist, so after reaching the bottom
            // search back upwards instead of swiping up forever.
            if element.exists && element.frame.midY <= top { app.swipeDown() }
            else if !element.exists && attempt >= 8 { app.swipeDown() }
            else { app.swipeUp() }
        }
        XCTFail("找不到可点击元素：\(element)", file: file, line: line)
    }
    private func preview(_ route: String, arguments: [String] = []) {
        app.launchArguments = ["--ui-preview", route] + arguments
        app.launch()
    }
    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
    private func selectGymEquipment() {
        tap(app.buttons["equipmentScene"].firstMatch)
        tap(app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "健身房")).firstMatch)
        tap(app.buttons["chooseEquipment"])
        XCTAssertTrue(app.navigationBars["确认可用器材"].waitForExistence(timeout: 5))
        for id in ["wall", "plate-loaded-chest-press"] {
            let control = app.switches["equipmentOption_" + id]
            tap(control)
            XCTAssertEqual(control.value as? String, "1")
        }
        tap(app.buttons["confirmEquipment"])
    }
    /// Try visible roles in order; only a server/catalog-qualified replacement can be selected.
    private func replaceAnExercise() -> (name: String, lessonTitle: String, index: Int) {
        for index in 0..<3 {
            tap(app.buttons.matching(identifier: "replaceExercise").element(boundBy: index))
            XCTAssertTrue(app.navigationBars["选择替代动作"].waitForExistence(timeout: 5))
            let candidate = app.buttons["replaceWith_walk"]
            if candidate.waitForExistence(timeout: 2) {
                let name = String(candidate.label.dropFirst("替换为".count))
                tap(app.buttons["replacementPreview_walk"])
                XCTAssertTrue(app.buttons["trainingPlayback"].waitForExistence(timeout: 10) || app.buttons["lessonPlayback"].waitForExistence(timeout: 10))
                // Fixed expected source: walk -> functional/functional-cooldown-walk.
                let lessonTitle = "逐步慢走"
                XCTAssertTrue(app.navigationBars[lessonTitle].waitForExistence(timeout: 5))
                capture("catalog-candidate-preview")
                app.navigationBars[lessonTitle].buttons.firstMatch.tap()
                XCTAssertTrue(app.navigationBars["选择替代动作"].waitForExistence(timeout: 5))
                tap(candidate)
                XCTAssertFalse(app.alerts["暂时无法替换"].exists)
                XCTAssertTrue(app.navigationBars["你的训练草案"].waitForExistence(timeout: 5) || app.navigationBars["调整训练"].waitForExistence(timeout: 5))
                return (name, lessonTitle, index)
            }
            tap(app.buttons["关闭"].firstMatch)
        }
        XCTFail("测试计划应有至少一个符合条件的替代动作")
        return ("", "", 0)
    }

    func testEquipmentRequiresConfirmationAndSceneChangeClearsIt() {
        preview("plan-equipment")
        let generate = app.buttons["generatePlan"]
        XCTAssertTrue(app.navigationBars["安排适合你的训练"].waitForExistence(timeout: 10))
        for _ in 0..<5 where !generate.exists { app.swipeUp() }
        XCTAssertTrue(generate.exists)
        XCTAssertFalse(generate.isEnabled)
        app.swipeDown()
        tap(app.buttons["chooseEquipment"])
        let controls = app.switches.matching(NSPredicate(format: "identifier BEGINSWITH %@", "equipmentOption_")).allElementsBoundByIndex
        XCTAssertFalse(controls.isEmpty)
        XCTAssertTrue(controls.allSatisfy { $0.value as? String == "0" })
        let wall = app.switches["equipmentOption_wall"]
        tap(wall)
        XCTAssertEqual(wall.value as? String, "1")
        tap(app.buttons["bodyweightOnly"])
        tap(app.buttons["confirmEquipment"])
        for _ in 0..<5 where !generate.exists { app.swipeUp() }
        XCTAssertTrue(generate.isEnabled)
        app.swipeDown()
        tap(app.buttons["equipmentScene"].firstMatch)
        tap(app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "哑铃")).firstMatch)
        for _ in 0..<5 where !generate.exists { app.swipeUp() }
        XCTAssertFalse(generate.isEnabled)
        capture("catalog-equipment-reconfirm")
    }

    func testDefaultSceneShowsEntireEquipmentInventory() {
        preview("plan-equipment")
        tap(app.buttons["chooseEquipment"])
        XCTAssertTrue(app.navigationBars["确认可用器材"].waitForExistence(timeout: 5))
        capture("equipment-all-default-scene")
        let expected: Set<String> = [
            "wall", "mat", "foam-roller", "light-resistance-band", "ab-wheel", "pull-up-bar", "suspension-trainer",
            "dumbbells", "adjustable-bench", "flat-bench", "cable-station", "dual-cable-station", "single-cable-handle",
            "pair-cable-handles", "straight-cable-bar", "rope-cable-handle", "neutral-pulldown-handle", "ez-bar", "barbell",
            "ab-slings", "captains-chair", "parallel-bars", "plate-loaded-chest-press", "plate-loaded-incline-chest-press",
            "chest-press-machine", "lat-pulldown-machine", "seated-row-machine", "leg-press-machine", "shoulder-press-machine",
            "leg-extension-machine", "abdominal-crunch-machine", "leg-curl-machine", "biceps-curl-machine", "pec-fly-machine",
            "hip-abduction-machine", "hip-adduction-machine", "prone-leg-curl-machine", "rear-foot-support", "fixed-support",
            "reverse-fly-machine", "stable-chair"
        ]
        var found = Set<String>()
        for _ in 0..<12 {
            let controls = app.switches.matching(NSPredicate(format: "identifier BEGINSWITH %@", "equipmentOption_")).allElementsBoundByIndex
            for control in controls {
                found.insert(String(control.identifier.dropFirst("equipmentOption_".count)))
                XCTAssertEqual(control.value as? String, "0", "器材仍需要用户逐项确认")
            }
            if found == expected { break }
            app.swipeUp()
        }
        XCTAssertEqual(found, expected, "默认自重场景也必须能选择全部已有器材")
        capture("equipment-all-inventory-bottom")
    }

    func testGymSearchSelectionsSurviveSearchAndReopening() {
        preview("plan-equipment")
        tap(app.buttons["chooseEquipment"])
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 5))
        search.tap(); search.typeText("推胸机")
        let chest = app.switches["equipmentOption_chest-press-machine"]
        tap(chest)
        XCTAssertEqual(chest.value as? String, "1")
        XCTAssertFalse(app.switches["equipmentOption_leg-press-machine"].exists)
        capture("equipment-search-chest")
        search.tap(); search.buttons.firstMatch.tap(); search.typeText("腿举机")
        let legs = app.switches["equipmentOption_leg-press-machine"]
        tap(legs)
        XCTAssertEqual(legs.value as? String, "1")
        XCTAssertTrue(app.staticTexts["已选择 2 项"].exists)
        capture("equipment-search-legs")
        tap(app.buttons["confirmEquipment"])
        XCTAssertTrue(app.staticTexts["2 项"].waitForExistence(timeout: 5))
        tap(app.buttons["chooseEquipment"])
        XCTAssertTrue(search.waitForExistence(timeout: 5))
        search.tap(); search.typeText("推胸机")
        XCTAssertEqual(chest.value as? String, "1")
        search.tap(); search.buttons.firstMatch.tap(); search.typeText("腿举机")
        XCTAssertEqual(legs.value as? String, "1")
        search.tap(); search.buttons.firstMatch.tap(); search.typeText("不存在的器材")
        XCTAssertTrue(app.staticTexts["没有匹配的器材，请试试其他名称。"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["已选择 2 项"].exists)
        tap(app.buttons["bodyweightOnly"])
        XCTAssertTrue(app.staticTexts["已选择 0 项"].exists)
        tap(app.buttons["confirmEquipment"])
        XCTAssertTrue(app.staticTexts["仅自重"].waitForExistence(timeout: 5))
    }

    func testGeneratePreviewReplaceConfirmAndRestart() {
        app.launchArguments = ["--ui-testing-reset"]
        app.launch()
        for title in ["慢慢来，也在向前", "你想从哪里开始", "连接苹果健康", "保留你的进展", "数据由你掌握"] {
            XCTAssertTrue(app.navigationBars[title].waitForExistence(timeout: 10))
            tap(app.buttons["onboardingNext"])
        }
        app.tabBars.buttons["计划"].tap()
        tap(app.buttons["planLauncher"].firstMatch)
        selectGymEquipment()
        tap(app.buttons["关闭"].firstMatch)
        tap(app.buttons["planLauncher"].firstMatch)
        XCTAssertTrue(app.buttons["chooseEquipment"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["2 项"].exists, "确认器材应在重新打开表单后保留")
        tap(app.buttons["generatePlan"])
        XCTAssertTrue(app.navigationBars["你的训练草案"].waitForExistence(timeout: 10))
        tap(app.buttons["exerciseLesson"].firstMatch)
        XCTAssertTrue(app.otherElements["trainingArtwork"].waitForExistence(timeout: 10) || app.buttons["trainingPlayback"].waitForExistence(timeout: 10) || app.buttons["lessonPlayback"].waitForExistence(timeout: 10))
        capture("catalog-draft-preview")
        app.navigationBars["原地踏步"].buttons.firstMatch.tap()
        XCTAssertTrue(app.buttons["replaceExercise"].firstMatch.waitForExistence(timeout: 5))
        let replacement = replaceAnExercise()
        capture("catalog-draft-replaced")
        tap(app.buttons["confirmPlan"])
        XCTAssertTrue(app.buttons["workoutRow"].firstMatch.waitForExistence(timeout: 10))
        tap(app.buttons["workoutRow"].firstMatch)
        XCTAssertTrue(app.staticTexts[replacement.name].waitForExistence(timeout: 5))
        app.terminate()
        app.launchArguments = ["--demo"]
        app.launch()
        app.tabBars.buttons["计划"].tap()
        tap(app.buttons["workoutRow"].firstMatch)
        XCTAssertTrue(app.staticTexts[replacement.name].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["exerciseLesson"].firstMatch.exists)
        capture("catalog-replacement-after-restart")
        tap(app.buttons.matching(identifier: "exerciseLesson").element(boundBy: replacement.index))
        XCTAssertTrue(app.navigationBars[replacement.lessonTitle].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["trainingPlayback"].waitForExistence(timeout: 10) || app.buttons["lessonPlayback"].waitForExistence(timeout: 10))
        capture("catalog-correct-teaching-after-restart")
    }

    func testAllTeachingTopicsRouteFromPlanOffline() {
        for topic in ["arms", "chest", "shoulders", "abs", "arms-extra", "functional", "legs", "back", "equipment"] {
            preview("plan-catalog-route-" + topic, arguments: ["--training-reduce-motion", "--equipment-reduce-motion", "--equipment-dark"])
            XCTAssertTrue(app.navigationBars["你的训练草案"].waitForExistence(timeout: 10))
            tap(app.buttons["exerciseLesson"].firstMatch)
            let playback = app.buttons[topic == "equipment" ? "lessonPlayback" : "trainingPlayback"]
            XCTAssertTrue(playback.waitForExistence(timeout: 15), "Missing plan teaching route for \(topic)")
            if topic != "equipment" {
                XCTAssertEqual(playback.label, "播放")
                XCTAssertFalse(playback.isEnabled)
            }
            capture("catalog-plan-route-" + topic)
            app.terminate()
        }
    }

    func testEditingCustomPrescriptionAndRestoringTemplateWithLargeText() {
        preview("plan-catalog-edit", arguments: ["--equipment-large-text", "--training-reduce-motion"])
        XCTAssertTrue(app.navigationBars["调整训练"].waitForExistence(timeout: 10))
        let field = app.descendants(matching: .any).matching(identifier: "exercisePrescription").firstMatch
        tap(field)
        field.typeText(" 按我的节奏")
        XCTAssertTrue(app.staticTexts["customPrescription"].firstMatch.waitForExistence(timeout: 5))
        app.swipeDown()
        tap(app.buttons["restorePrescription"].firstMatch)
        XCTAssertTrue(app.staticTexts["customPrescription"].firstMatch.waitForNonExistence(timeout: 5))
        capture("catalog-restored-template-large-text")
    }

    func testEmptyReplacementAndUnavailableResourceExplainNextStep() {
        preview("plan-catalog-empty-replacement")
        XCTAssertTrue(app.staticTexts["暂时没有合适的替代动作"].waitForExistence(timeout: 10))
        XCTAssertEqual(app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "replaceWith_")).count, 0)
        capture("catalog-empty-replacement")
        app.terminate()
        preview("plan-catalog-unavailable")
        XCTAssertTrue(app.staticTexts["这节教学暂时无法打开"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["训练文字仍然保留，请返回查看。"].exists)
        capture("catalog-resource-unavailable")
    }

    func testLegacyPreviewAndUnknownIdentityDoNotGuess() {
        preview("plan-catalog-legacy")
        XCTAssertTrue(app.navigationBars["你的训练草案"].waitForExistence(timeout: 10))
        XCTAssertEqual(app.buttons.matching(identifier: "exerciseLesson").count, 1)
        XCTAssertFalse(app.buttons["replaceExercise"].exists)
        tap(app.buttons["exerciseLesson"].firstMatch)
        XCTAssertTrue(app.buttons["lessonPlayback"].waitForExistence(timeout: 10))
        app.terminate()
        preview("plan-catalog-unknown")
        XCTAssertTrue(app.staticTexts["exerciseTeachingUnavailable"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["exerciseLesson"].exists)
        XCTAssertFalse(app.buttons["replaceExercise"].exists)
        capture("catalog-unknown-identity-preserved")
    }
}

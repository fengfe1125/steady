import XCTest

@MainActor final class SteadyUITests: XCTestCase {
    let app = XCUIApplication()
    override func setUpWithError() throws { continueAfterFailure = false }

    func tap(_ element: XCUIElement, file: StaticString = #filePath, line: UInt = #line) {
        for _ in 0..<8 {
            if element.exists && element.isHittable { element.press(forDuration: 0.15); return }
            app.swipeUp()
        }
        XCTFail("找不到可点击元素：\(element)", file: file, line: line)
    }
    func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
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
        tap(app.buttons["generatePlan"])
        XCTAssertTrue(app.navigationBars["你的训练草案"].waitForExistence(timeout: 10))
        tap(app.buttons["替换深蹲为坐站练习"].firstMatch)
        capture("04-Draft")
        tap(app.buttons["confirmPlan"])
        if app.buttons["关闭"].firstMatch.waitForExistence(timeout: 3) { app.buttons["关闭"].firstMatch.tap() }
        app.tabBars.buttons["计划"].tap()
        XCTAssertTrue(app.buttons["workoutRow"].firstMatch.waitForExistence(timeout: 5))
        tap(app.buttons["workoutRow"].firstMatch)
        XCTAssertTrue(app.staticTexts["坐站练习"].exists)
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

import XCTest

@MainActor final class WorkoutLoopUITests: XCTestCase {
    let app = XCUIApplication()
    override func setUpWithError() throws { continueAfterFailure = false }
    func launch(reset: Bool = false) {
        app.launchArguments = ["--ui-preview", "workout"] + (reset ? ["--reset-workout-qa"] : [])
        app.launch()
        XCTAssertTrue(app.navigationBars["我的训练"].waitForExistence(timeout: 15))
    }
    func tap(_ element: XCUIElement) {
        for _ in 0..<12 {
            if element.exists && element.isHittable { element.tap(); return }
            app.swipeUp()
        }
        XCTFail("Unreachable control: \(element)")
    }
    func fill(_ field: XCUIElement, _ text: String) { tap(field); field.typeText(text) }
    func screenshot(_ name: String) { let a = XCTAttachment(screenshot: app.screenshot()); a.name = name; a.lifetime = .keepAlways; add(a) }

    func testOfflineTrainingRestartAndNextPerformance() {
        launch(reset: true)
        tap(app.buttons["newWorkout"])
        tap(app.buttons["addWorkoutMove"])
        fill(app.textFields["customMoveName"], "本地验收动作")
        tap(app.buttons["addCustomMove"])
        tap(app.buttons["startWorkout"])
        XCTAssertTrue(app.buttons["workoutSet_0"].waitForExistence(timeout: 10))
        tap(app.buttons["workoutSet_0"])
        fill(app.textFields["setWeight"], "10"); fill(app.textFields["setReps"], "12")
        tap(app.buttons["saveWorkoutSet"])
        screenshot("workout-first-set")
        app.terminate(); launch()
        tap(app.buttons["continueWorkout"])
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "10 kg × 12")).firstMatch.waitForExistence(timeout: 5))
        tap(app.buttons["pauseWorkout"]); tap(app.buttons["pauseWorkout"])
        tap(app.buttons["workoutSet_1"])
        fill(app.textFields["setWeight"], "10"); fill(app.textFields["setReps"], "12")
        tap(app.buttons["saveWorkoutSet"])
        tap(app.buttons["finishWorkout"])
        tap(app.buttons["结束并保存"].firstMatch)
        XCTAssertTrue(app.staticTexts["workoutFinished"].waitForExistence(timeout: 5))
        screenshot("workout-completed")
        app.terminate(); launch()
        tap(app.buttons["我的训练"])
        tap(app.buttons["startWorkout"])
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label BEGINSWITH %@", "上次：")).firstMatch.waitForExistence(timeout: 5))
        screenshot("workout-next-performance")
    }

    func testLibraryMoveCanBeSearchedReadAndAdded() {
        launch(reset: true)
        tap(app.buttons["newWorkout"])
        tap(app.buttons["addWorkoutMove"])
        app.segmentedControls["moveScope"].buttons["动作库"].tap()
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 10))
        search.tap(); search.typeText("glwt")
        let row = app.buttons["libraryMove_edb-0025"]
        XCTAssertTrue(row.waitForExistence(timeout: 10))
        row.tap()
        XCTAssertTrue(app.staticTexts["杠铃卧推"].waitForExistence(timeout: 5))
        screenshot("library-detail")
        tap(app.buttons["addLibraryMove"])
        XCTAssertTrue(app.staticTexts["杠铃卧推"].waitForExistence(timeout: 5))
        screenshot("library-move-added")
    }
}

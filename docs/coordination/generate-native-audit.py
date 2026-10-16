from pathlib import Path
import json,shlex
r=Path(__file__).resolve().parents[2]
routes={'abs':'abs-collection',**{k:k+'-animation-collection' for k in ['arms','arms-extra','back','chest','functional','legs','shoulders']}}
rows=[]
for slug,route in sorted(routes.items()):
 d=r/'Sources/SteadyCore/Resources/TrainingCollections/Reviewed'/slug
 m=list(d.glob('*animations.json'));assert len(m)==1
 for a in json.loads(m[0].read_text())['animations']:
  rows.append((route,a['lessonID']))
assert len(rows)==83
p=r/'SteadyUITests/SteadyUITests.swift';s=p.read_text();assert '// BEGIN FULL TRAINING AUDIT' not in s
methods='\n'.join('    func testTrainingAll_'+id.replace('-','_')+'() { auditCandidate("'+route+'", "'+id+'") }' for route,id in rows)
block='''    // BEGIN FULL TRAINING AUDIT
'''+methods+'''
    private func auditCandidate(_ route: String, _ id: String) {
        app.launchArguments = ["--ui-preview", route]
        app.launch()
        XCTAssertTrue(app.navigationBars.firstMatch.waitForExistence(timeout: 15))
        tap(app.buttons["animatedLesson_\\(id)"])
        let playback = app.buttons["trainingPlayback"]
        XCTAssertTrue(playback.waitForExistence(timeout: 15))
        expectation(for: NSPredicate(format: "enabled == true"), evaluatedWith: playback)
        waitForExpectations(timeout: 15)
        tap(app.buttons["trainingStep_1"])
        XCTAssertEqual(playback.label, "播放")
        for _ in 0..<5 { app.swipeDown() }
        capture("all-\\(id)-motion")
        tap(app.segmentedControls.buttons["细节图解"])
        capture("all-\\(id)-detail")
        tap(app.segmentedControls.buttons["错误对照"])
        capture("all-\\(id)-mistakes")
        XCTAssertFalse(app.staticTexts["图解暂时无法加载，仍可阅读下方步骤。返回后重新打开此动作可重试。"].exists)
        app.terminate()
    }
    // END FULL TRAINING AUDIT

'''
i=s.index('    private func candidateFlow');p.write_text(s[:i]+block+s[i:])
cache=r/'docs/coordination/.cache';args=['xcodebuild','-project','Steady.xcodeproj','-scheme','Steady','-destination','platform=iOS Simulator,id=9126FF47-F174-47B2-BC46-4AB43F71EECD','-derivedDataPath',str(cache/'build/DerivedData'),'-clonedSourcePackagesDirPath',str(cache/'build/SourcePackages'),'-resultBundlePath',str(cache/'build/training-all-native.xcresult'),'-parallel-testing-enabled','NO','-collect-test-diagnostics','never','-test-timeouts-enabled','YES','-maximum-test-execution-time-allowance','90']
args += ['-only-testing:SteadyUITests/SteadyUITests/testTrainingAll_'+id.replace('-','_') for _,id in rows]
args += ['CLANG_MODULE_CACHE_PATH='+str(cache/'modules'),'SWIFT_MODULE_CACHE_PATH='+str(cache/'modules'),'CODE_SIGNING_ALLOWED=NO','test']
(r/'docs/coordination/run-native-audit.sh').write_text('#!/bin/zsh\ncd '+shlex.quote(str(r))+'\nexport TMPDIR='+shlex.quote(str(cache/'tmp'))+'\n'+shlex.join(args)+' > '+shlex.quote(str(cache/'build/training-all-native.log'))+' 2>&1\n')
(r/'docs/coordination/native-audit-inventory.json').write_text(json.dumps([dict(route=route,lessonID=id) for route,id in rows],indent=2)+'\n')

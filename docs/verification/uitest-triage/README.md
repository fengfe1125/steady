# XCUI 失败分诊（PR #6 之上）

分支 `claude/uitest-triage`，从 `claude/exercise-library` 的 `7ff6955f` 切出。
来源：`docs/verification/exercise-library/xcui-all-uitests.log` 里的 29 个失败
（`SteadyUITests.swift` 28 个，`LowerBodyUITests.swift` 1 个）。
模拟器：Steady QA iPhone 17 Pro（`83A3DC8A-BCFA-4608-A816-379C0E1A9D08`），iOS 27.0 SDK。

**结论：29 个都是测试问题，没有发现 App 回归。** 其中 1 个是计时巧合，1 个的超长耗时来自 Mac 睡眠。
每组一个提交；没有放宽断言，只是把断言对准当前有意的行为。

修复后在同一模拟器上重跑这 29 个测试：**29 个全部通过，0 失败**（2026-10-17，用时 1870 秒；日志：[`xcui-after-fix.log`](xcui-after-fix.log)）。

## 各组原因与修复

| 失败行 | 测试 | 原因 | 修复（提交） |
|---|---|---|---|
| `:908`、`:660`、`:1188` | 11 个器械 `testEquipment*`、3 个哑铃课程（`testDumbbellGobletSquat`、`testSingleArmDumbbellRow`、`testSeatedDumbbellShoulderPress`）、`testTrainingUnifiedUpper/LowerCollections`、`testAllEquipmentReturnFromBackground`，共 17 个 | 76c3368f 给 `--ui-preview coach` 加了专门分支，直接在 NavigationStack 里显示 CoachView，不再落到带 tab bar 的 RootView，所以找不到「教练」tab。 | 改为等待「你的教练」导航栏。真实 tab 路径仍由 `testActionLibraryOpensLesson` 覆盖。（`2028d98e`） |
| `:280` | `testAnatomyEquipmentSquarePanelsLight/Dark`、`testAllAnatomyEquipmentSquarePanelsLight/Dark` | `lessonArtwork` 带 `accessibilityAction`（轻点播放/暂停），XCUITest 把它报告为 Button，`otherElements` 查不到。实际层级里是 362×362 的方形画布。 | 按 identifier 跨类型查找（与 `auditEquipmentLargeComplete` 一致），宽度和正方形断言不变。（`b1bc580b`） |
| `:323`、`:324` | `testTrainingBackRowViews`、`testTrainingBackPulldownViews`、`testTrainingBackScapulaViews` | 背部课程已用共享解剖渲染器（tools/anatomy）重绘，规格的 `dropManifestKeys` 去掉了 `availableViews`、`defaultView`、`supportsSideSelection`，页面只有一个侧面视图，没有「观察视角」「示范侧」选择器（实机层级已确认）。 | 断言两个选择器都不存在，保留第 3 步暂停定位到 5.0 / 10.0 秒、滚动后姿势不变、细节图解与错误对照可打开。（`725536ad`） |
| `:489` | `testTrainingAll_functional_alternating_lunge` | 2040f31b 有意把「动作移动」改为 0.6–1.4 秒以对齐关键帧，预览点变为中点 1.0 秒；测试仍期待旧的 1.7 秒。 | 期待值改为 1.0。（`319e01f4`） |
| `:833` | `testTrainingCandidateCrossLeg` | 该课程是腿部合集第 7 行，在屏幕外；iOS 26 上未滚到的 List 行不存在，`waitForExistence` 15 秒必然失败。 | 先等合集导航栏，再用 `tap(_:)` 滚动到该行；找不到仍会失败。（`9eebc88a`） |
| `:206` | `testAnatomyShoulderNativePlaybackAndBackground` | 计时巧合：播放暂停在 4.0 秒，固定拖到 0.65（3.9 秒）又落在 4.0 秒，标签没变。单独重跑即通过。 | 改为拖到与暂停位置相反的半段，断言仍证明进度条能定位。（`c92eb5a0`） |
| `:1231`、`LowerBodyUITests:174` | `testMainFlowAndRestartPersistence`、`testChairAndSupportAreExplicitSelectionsAndRemembered` | catalog v2 起器材表先列出全部健身房器械，墙面、稳定椅子、固定支撑都在最后一节、屏幕外；iOS 26 下这些行不存在，读取 `.value` 或取坐标即报 "Failed to get matching snapshot"。椅子测试是重新打开表单后（又回到顶部）读取。 | 先滑动到这些行再操作或读取。（`3553fce5`） |

## 椅子测试「卡住约 45 分钟」

不是 App 或测试死循环，而是 Mac 合盖睡眠。原始运行日志里，这个测试的两次停顿与 `pmset -g log` 完全吻合：

| 测试日志 | pmset |
|---|---|
| t=4.9 s → 599.0 s，停顿 594 s | 18:00:54 `Entering Sleep state due to 'Clamshell Sleep' … 597 secs` |
| 5 秒的 `waitForExistence` 从 t=610 s 到 1680 s，停顿 1070 s | 18:11:01 `Entering Sleep state due to 'Maintenance Sleep' … 1071 secs` |

紧接着的 `testEveryScenePreviewReplaceConfirmAndRestart` 也因同样原因用了 1646 秒（仍然通过）。
修复后椅子测试用时 47 秒，主流程用时 84 秒。之后跑长测试请保持开盖、接电源，或用 `caffeinate -i` 包住 `xcodebuild`。

## 顺带发现（未修改）

- `EquipmentLessons.swift` 的画布无论是否允许轻点播放都挂了 `accessibilityAction`，减少动态效果时 VoiceOver 也会把它当成可操作按钮，但点了没有反应。属于无障碍细节，不影响本次测试，可另行处理。
- 外接盘 `/Volumes/Developer` 在睡眠后曾掉线，CoreSimulator 随后报 `Mach error -308 (ipc/mig) server died`，重启模拟器设备后恢复。

## 复现

```bash
xcodebuild build-for-testing -project Steady.xcodeproj -scheme Steady -destination id=83A3DC8A-BCFA-4608-A816-379C0E1A9D08
caffeinate -i xcodebuild test-without-building -project Steady.xcodeproj -scheme Steady -destination id=83A3DC8A-BCFA-4608-A816-379C0E1A9D08 -only-testing:SteadyUITests/LowerBodyUITests/testChairAndSupportAreExplicitSelectionsAndRemembered -only-testing:SteadyUITests/SteadyUITests/testMainFlowAndRestartPersistence
```

（其余测试名见 `xcui-after-fix.log`。）

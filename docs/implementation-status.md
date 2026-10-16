> 2026-09-23：本文保留第一阶段历史。真实接入的当前状态见 [live-development.md](live-development.md)。

# 第一阶段实施与验收记录

日期：2026-09-21。**工程和设计已落地，原生全流程验收尚未完成，不标记第一阶段全部通过。**

## 已交付

- Figma 文件 APLEefE2UxG4Vhd6W25zTl，jiwo 团队；29个页面/状态画板。
- 浅色/深色变量、字体和布局规范、可编辑指标卡与按钮实例、固定底部四入口、独立滚动内容。
- 欢迎、目标、健康、账户、隐私；四主页面；报告、依据、历史、聊天、计划表单/草案/修改、训练/反馈、补记与错误/取消/离线/缺失状态。
- 已在浏览器逐步点击：今天 → 生成中 → 报告 → 追问 → 计划表单 → 草案 → 修改 → 确认 → 训练详情 → 反馈 → **已完成**。保存结果截图在 `screenshots/figma-completed.png`。
- 深色、375×812 小屏、1.3倍字体的报告画板已截图检查；小屏按钮高度问题已修正；当前字体检查无 missing font。
- Figma 用经用户批准的 Noto Sans SC 与 Steady 本地控制组件；原生用系统字体、NavigationStack、TabView、Form、Picker、DatePicker、Sheet，不嵌网页。
- Xcode 工程、一个 App Target、UI Test Target、本地 Swift Package、构造注入、五类服务/仓储协议。
- 固定30天样例、报告依据、可取消流式演示聊天、草案修改确认、训练反馈、补记、场景切换、首次使用和确认重置。
- SwiftData 保存计划，以及报告/聊天/偏好/补记；两个容器均 CloudKit `.none`，失败 rollback，不静默退回内存。
- Supabase 后续接口、RLS、认证/同意、Edge Functions、离线队列/冲突/删除约定已写文档；未部署。

## 已通过的验证

| 项目 | 结果 |
|---|---|
| Figma 浏览器主流程 | 通过，包含修改与保存反馈后的明确完成状态 |
| Figma 深色/小屏/大字号截图 | 已检查代表性报告画板；不是原生设备可访问性测试 |
| Swift 核心测试 | 14项通过：缺失值、完全缺失、失败、报告取消、流式中途取消、草案/反馈校验、落盘重读 |
| 实际 AppModel 源码测试 | 3项通过：失败确认不退出、报告→草案→确认/补记状态流、旧取消任务不覆盖新消息 |
| iOS 模拟器编译 | 最终源码已在外置卷构建成功，Xcode27 / iOS27 SDK，部署下限18.0，无云配置或签名 |
| 模拟器实际启动 | 已启动 Steady，走过欢迎到首页并打开报告，已留原生报告截图 |

AppModel 状态测试运行在 macOS，不代替点击 UI。SwiftData 持久化测试包含关闭仓储后重新打开磁盘文件，不只是 Codable round-trip。

## 原生 UI 尚未通过

初始选用的旧 iPhone 17 Pro 设备目录缺失，未删除或重置它，另建 Steady QA：`0BBC87BE-3CBF-4825-A982-9843A7614E2F`（iPhone 17 Pro / iOS26.5）。

- 首轮执行已到报告和聊天入口，但键盘焦点失败；另一个用例未完成。
- 随后的单用例复测停在报告到聊天切换。已把会话创建移到导航之前，改用显式 navigationDestination 状态，并补充键盘 FocusState、取消处理、主按钮对比度和草案保存错误处理。
- 模拟器/测试会话反复长时间等待启动或收尾，DeviceHub 窗口调用也出现超时。仅操作 Steady QA 和本任务的测试进程；未重启全局 CoreSimulator 服务或终止其他项目。
- 最后构建出现明确的 `No space left on device`。现场 `df` 显示系统数据卷100%、可用约492MiB；外置 Developer 卷可用约389GiB。不能断言此前全部 UI 失败都由空间不足造成，但当前它阻塞最终编译与稳定验收。没有删除其他项目或用户文件。
- 已通过外置卷专用目录 `/Volumes/Developer/Xcode/steady-build.upy0KZ` 完成最终 `build-for-testing`。模拟器所在挂载卷另有约27GiB空闲；后续复测结果也放在该外置构建目录，未改变全局配置。
- 外置卷 `swift test --scratch-path .../SwiftTests` 的最终17项测试全部通过。系统盘可用空间随后回升到约3.7GiB，并非本任务执行清理。UI 会话仍未正常进入用例，已结束本任务的等待进程；共享服务未重启。
- 修正后还没有取得完整 UI 测试通过结果；不能宣称计划→反馈→重启链路已通过模拟器验收。

原始结果包保留于 `/private/tmp/Steady-UI-First.xcresult`、`Steady-UI-Second.xcresult`、`Steady-UI-Fourth.xcresult` 等；部分后续结果包因启动/收尾中断可能不完整，不算通过。

## 待验收 / 后续边界

### 共享服务重启后的补充验收（2026-09-21 晚）

- 用户明确同意中断其他模拟器后，执行 `simctl shutdown all` 并向已确认的 CoreSimulatorService 发送 TERM；没有 erase/delete，没有清除模拟器数据，也未直接终止其他项目的构建进程。
- Steady QA 重新启动，`bootstatus` 成功。测试会话恢复为可进入用例并正常返回结果。
- `Steady-UI-AfterRestart.xcresult`：2项用例，1项通过、1项失败。**离线历史、补记输入保存及终止 App 后重新启动的补记保留已通过**；首次引导主流程未通过。
- 逐页等待标题，并将测试辅助触按由默认50ms改为150ms后，`Steady-UI-Press.xcresult` 已通过引导、生成报告、进入聊天、键盘输入和出现模拟回复，随后等待计划入口可用超时。结果同时记录 `Invalid frame dimension (negative or non-finite)`，按钮快照坐标为无穷值；原因尚未确定，不把它归结为已证实的业务逻辑错误。
- 最后一次成功的 `build-for-testing` 包含逐页等待与150ms触按。之后增加了先滚动计划入口、30秒状态等待和最终截图；截图钩子的线程隔离编译问题已在源码修正，但**这组最新测试改动尚未重新编译验证**。
- 下一次构建权限审核先超时，按工具指示重试一次后，因 Codex 无法创建线程锁而失败：`No space left on device`。操作没有执行。现场系统数据卷仅约102MiB可用（100%），外置 Developer 卷约385GiB；没有绕过审核或清理用户文件。
- 本节结果包位于 `/Volumes/Developer/Xcode/steady-build.upy0KZ/`。`screenshots/native-offline-history.png` 是通过用例的历史页面截图（截取时仍有导航过渡），不是完整视觉验收证据。

以下事项仍待完成；共享服务重启已经获得本次批准并执行，不需要重复申请同一次操作。

1. 在稳定模拟器会话上重跑主流程、输入键盘、离线历史与重启后的计划/反馈/补记。
   先解决系统盘空间和权限审核写入失败，再重新构建最新 UI 测试。若要再次中断其他模拟器，应重新协调，不直接终止其他项目。
2. 原生深色、Dynamic Type、小屏检查并导出截图；Figma 检查不能替代它。
3. 真机签名和运行未做；iOS18运行时未安装，当前只确认编译部署下限。
4. 真实 HealthKit、Apple 登录、Supabase、AI 均未接入，也未创建云项目、上传健康信息或验证报告准确性。

演示表单可输入真实样式字段，但回复与训练来自固定模板。正式供应商选择、大陆可达性、两账户RLS隔离、断网重试、换机恢复、删除传播均留给真实接入阶段。

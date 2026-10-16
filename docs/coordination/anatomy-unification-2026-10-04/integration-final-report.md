# Steady 解剖动画集成最终报告

更新：2026-10-05 05:43 Asia/Shanghai。本次集成负责的生成、资源一致性、Swift、真实浏览器运行、模拟器原生测试和独立视觉审核均通过。范围为 **8 组训练 83 个身份 + 14 个器械 = 97 个身份 / 96 个唯一页面**。主审已接受最后 41 张联系表中的 241 张原生截图，器械完整大字号及训练来源替代的画面门槛关闭。主审已完成[最终哈希清单的独立复核](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/coordinator-final-ledger-verification.json)，源码、冻结及实际安装的 App/运行器与证据哈希一致。项目最终签收和自动跟进关闭由主审负责。

## 结果与范围

| 验证 | 最终结果 | 证据 |
| --- | --- | --- |
| 全量生成、严格身份及静态抽样 | 97/97 身份、96 页面、0 问题；每页 60 个周期样本 | [生成日志](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/final-generation.log)；[静态报告](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/final-static-verification.json) |
| 已测试 App 资源 | 96 HTML、9 引擎副本与源码逐字节一致 | [App 资源校验](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/final-repaired-bundle-verification.json)；[逐页哈希](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/final-repaired-artifact-hashes.json) |
| Swift Testing | 60 项通过，三个实际运行分别为 4、43、13 项 | [计数与日志哈希](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/final-swift-test-count-verification.json) |
| iOS 构建 | 当前产品 App 和测试运行器构建成功 | [产品及可访问性修复构建](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/native-accessibility-repair-build.log)；[v2 运行器构建](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/native-supplement-v2-build.log) |
| 真实浏览器 rAF / DOM | 96 页面 / 97 身份，0 失败；384 完整周期、94,270 帧样本 | [最终运行验证](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/final-runtime-verification.json)；[原始运行数据](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/runtime-evidence/runtime-2026-10-04T18-58-25-595Z-96.json) |
| 有效原生 XCTest 方法 | **129 通过、0 失败或跳过**，710 张实际导出截图 | [精确方法、版本、截图及主审映射](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/final-effective-native-map.json) |
| 本轮补验 | 19/19 通过，正常退出 0；241 张 PNG 的采集时 SHA 与导出字节一致 | [补验收据](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/native-supplement-v2-bulk-verification.json)；[串行导出收据](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/native-supplement-v2-bulk-export-receipt.json) |
| 最终哈希冻结 | 源码 159、实际安装 App 155、运行器 5 全部匹配；原 158 产品输入及 160 旧冻结原生文件未改变 | [最终完整哈希清单](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/final-delivery-hash-ledger.json) |

真实运行还完成 288 次暂停检查、192 次周期端点接缝检查和 384 次实际渲染后的面板检查。1 倍速实测比率为 0.996529–0.999834，半速为 0.499139–0.499950；最大采样间隔 44.7 ms。`shoulders-trx-w` 为有意保持静态的 W 姿势，其余 95 页面显示关节变化。静态 `scene.sample`、真实 DOM 后渲染和各主题的物理/接触审查分别保留其证据范围，不把静态通过作为全量物理正确性的证明。

![实际浏览器全量运行结果](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/runtime-evidence/runtime-ui-2026-10-04T19-03-04-373Z.jpg)

## 97 个身份与单课预览

| 类别 | 课程身份 | 唯一页面 | 默认暂停单课示例 |
| --- | ---: | ---: | --- |
| 肩部 | 11 | 11 | [shoulders-band-pass-through](http://127.0.0.1:8777/tools/anatomy/preview/index.html?topic=shoulders&lesson=shoulders-band-pass-through&mode=motion&t=0) |
| 手臂 | 8 | 7 | [arms-incline-dumbbell-curl](http://127.0.0.1:8777/tools/anatomy/preview/index.html?topic=arms&lesson=arms-incline-dumbbell-curl&mode=motion&t=0) |
| 手臂补充 | 7 | 7 | [arms-extra-cable-pushdown](http://127.0.0.1:8777/tools/anatomy/preview/index.html?topic=arms-extra&lesson=arms-extra-cable-pushdown&mode=motion&t=0) |
| 胸部 | 13 | 13 | [chest-flat-press](http://127.0.0.1:8777/tools/anatomy/preview/index.html?topic=chest&lesson=chest-flat-press&mode=motion&t=0) |
| 背部 | 9 | 9 | [back-bench-support](http://127.0.0.1:8777/tools/anatomy/preview/index.html?topic=back&lesson=back-bench-support&mode=motion&t=0) |
| 腹部 | 10 | 10 | [abs-hanging-leg-raise](http://127.0.0.1:8777/tools/anatomy/preview/index.html?topic=abs&lesson=abs-hanging-leg-raise&mode=motion&t=0) |
| 腿部 | 13 | 13 | [legs-90-90-hip-rise](http://127.0.0.1:8777/tools/anatomy/preview/index.html?topic=legs&lesson=legs-90-90-hip-rise&mode=motion&t=0) |
| 功能训练 | 12 | 12 | [functional-alternating-lunge](http://127.0.0.1:8777/tools/anatomy/preview/index.html?topic=functional&lesson=functional-alternating-lunge&mode=motion&t=0) |
| 器械 | 14 | 14 | [dumbbell-goblet-squat](http://127.0.0.1:8777/tools/anatomy/preview/index.html?topic=equipment&lesson=GobletSquatArtwork&mode=motion&t=0) |

`arms-warmup-triceps` 与 `arms-single-cable-extension` 复用 `arms-single-cable-extension.html`，身份仍分别覆盖。[97 个可点击单课链接](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/final-single-lesson-preview-links.md)，[身份、资源与 URL JSON](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/final-single-lesson-preview-links.json)。

链接在创建 iframe 前按身份过滤，带 `t=0` 时初始暂停；每个有效单课链接只加载一个页面。最终刷新验证了精确清单映射、源码过滤顺序及 **114 个 HTTP 资源**与本机字节一致。此前的[真实单课 UI 验证](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/gallery-single-page.json)单独保留；本次交付阶段没有重复浏览器或原生测试。旧预览监听已不可用，现由集成持有的只读本机服务提供同一 `127.0.0.1:8777` 地址，[服务 PID 与启动收据](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/final-preview-server.json)记录所有权；未停止其他进程。

## 原生有效映射和独立主审

129 个方法为三个冻结测试版本的明确并集，使用同一个已冻结产品 App。有效覆盖为：83 个普通训练身份，20 条深色用例，8 条大字号训练用例，器械浅/深色三模式各一条全 14 项巡检，14 条完整大字号器械用例，以及 2 条肩部播放/减少动态/生命周期用例。深色和大字号训练范围为已列出的用例，不宣称 83 课全部进行了深色大字号原生验收。

| 实际测试版本 | 选入有效方法 | 选入截图 | 说明 |
| --- | ---: | ---: | --- |
| original | 103 | 387 | 101 个未变通过项 + 已修复可访问性的两条器械巡检 |
| supplement-v1 | 6 | 70 | 有效训练补验；该原始整轮的另外 14 个器械 helper 失败继续保留 |
| supplement-v2 | 20 | 253 | 座式胸推 smoke 1 项/12 图 + 本轮 bulk 19 项/241 图；全部采集时 SHA 匹配 |
| 合计 | **129** | **710** | 每项记录方法、身份、模式、主题、来源源码/运行器、结果包、PNG SHA 和主审引用 |

主审证据引用：

- [83 个普通训练身份的三模式](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/coordinator-training-light-sheets/index.json)；[16 条未变深色及前期大字号面板](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/coordinator-training-supplement-sheets/index.json)。
- [肩部生命周期及减少动态](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/coordinator-native-special-sheets/index.json)：有效映射仅选肩部 6 图；旧器械顶部 28 图已被完整用例替代。
- [器械普通浅深色 84 图](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/coordinator-native-equipment/manifest.json)和[主审接受声明](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/final-review-checklist.md)第 35 行。
- [v1 六条有效训练补验](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/coordinator-supplement-training-review/index.json)：主审亲看其中 54 张完整面板、滚动末尾和模式栏截图；不宣称单独亲看了该版本所有 70 张重复/中间采样图。
- [座式胸推完整大字号 12 图](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/coordinator-equipment-large-smoke/index.json)。
- [本轮 41 联系表 / 241 原始 PNG 的独立接受与 SHA 核对](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/coordinator-native-bulk-v2-review.json)；[集成逐表审阅记录](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/native-supplement-v2-integrator-visual-review.json)。

器械完整大字号证据包含三模式完整正方形图解、说明及补充教学文字滚至末尾、控件可达、暂停步进，以及返回动作模式保持选中并暂停。训练补验证明详情/错误说明均滚至末尾、模式栏完整回到安全视口、详情切到错误的选中态正确；最后错误切回动作没有专门执行断言，映射和记录已注明该边界。原始截图索引的创建时“待审”状态未改写，最终接受由上述独立审核收据覆盖。

## 实现变化

- 通用引擎统一骨架、身体画法、主题、器械和课程渲染；深拷贝修复避免 IK 或混合姿势污染共享默认关节。主题扩展 51–59 和各课规范由原主题负责人维护、冻结。
- 全量构建从 8 组课程及 14 个原生器械定义推导身份清单，阻止不完整生成、重复页面、错误资源与姿势继承环；共享手臂页面保留两个课程身份。
- 所有原生目录读取已打包 HTML 及相邻通用引擎。新版页面不再注入旧绘画脚本，保留原生控制与生命周期。实际渲染样本/播放状态由只读接口提供，运行审计使用 post-equipment-update 的真实结果。
- 原生器械三模式均使用完整宽度的正方形画布，修复旧 130 pt 错误对照画布难读的问题。编号说明和对照说明由同一生成 HTML JSON 解码，原生段落保留独立可访问性标识；`.accessibilityElement(children: .contain)` 修复父级标识覆盖段落的问题。
- 警示文字与橙色图形分开定义，浅色文字对比度 5.26:1，深色 6.43:1。预览保留逐帧加载/错误状态和低并发，单课过滤减少同时运行的页面。
- 后续深滚修复仅改 UI 测试 helper：先检查 lazy 元素存在性再取 frame，保留安全视口、可点击、选中态、说明及暂停检查；v2 增加运行版本标记、采集时 PNG SHA 和实际原生 frame/滚动元数据。原 158 个产品输入未随 helper 修复改变。

## 冻结与历史边界

[最终哈希清单](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/final-delivery-hash-ledger.json)保存当前 159 源码、96 生成页面、9 引擎副本、155 文件的冻结及实际安装 App、5 文件 v2 冻结及实际安装运行器、原 160 原生文件、各结果 Info.plist、710 原始截图和所有关键审核收据的 SHA。实际安装路径通过只读 `simctl get_app_container` 重新解析，[安装目录快照](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/build/integration/final-installed-paths.json)保留查询时路径。预览源码另外单列，其不属于原 159 项测试输入。

- 最终通用引擎 SHA：`7a0a1e08de362ed31ec47fe2cb3a09ceedcb04b35c211174b8813ada622c23b5`。
- 当前 UI 测试源码 SHA：`eb27cc5911068ddd58202d22f541c236882903f357fcdd38941a968c7babd6ff`。
- 当前实际 XCTest 二进制 SHA：`64d4403acd8b99ae369ad0d81aa42bc0ecf22c83f1a8cf3ec2fd454081d3f470`。
- 冻结 `.xctestrun` SHA：`2bc3514089cfe89aee4670e435876f0007700b9bd5ef303f0360cee62e506ec7`。

原始 `FinalNativeRemaining` 保持 **112 通过 / 2 失败**，两条三头深滚失败已由当前有效训练补验替代；不重标整轮为通过。初期中断结果、诊断、录屏和失败截图继续保留。旧 `LargeModeRepair` 的 8 通过结果声明了未出现在命名附件中的 mode-return 截图；反汇编已证实二进制构造该字符串并调用 capture，其运行时缺附件原因仍未解释。相关路径现以实际运行版本标记、安装字节、采集 PNG SHA 和原生元数据替代，旧结果不独自作为当前来源证明。v1 的 14 个器械失败是 helper 在 lazy 元素出现前取 frame 的前置条件错误，当前 14 完整器械均有 v2 通过及主审截图。

本次交付验证截至上述冻结时刻。真实浏览器运行与 iOS 模拟器原生验收均有实际证据；物理 iPhone 的安装和验收未在本次授权范围执行。工作区原有 WIP 保留，未提交、推送或清理。[原集成实现与逐轮历史](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/integration-report.md)、[进度历史](/Volumes/Developer/Projects/steady/docs/coordination/anatomy-unification-2026-10-04/integration-progress.md)继续保留；最后项目签收及自动跟进关闭由主审完成。

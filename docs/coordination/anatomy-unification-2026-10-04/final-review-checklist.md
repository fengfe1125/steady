# Final coordinator acceptance checklist

Updated 2026-10-04 17:57 UTC. Scope:83 training IDs+14equipment=97IDs/96HTML. No overall acceptance yet.

## Topic handoff and personal visual review

All9 topic reports delivered; owned source frozen. Main coordinator personally inspected real browser screenshots for every lesson. This is first-pass static visual review, not current final engine/native acceptance. Detailed evidence filenames and limits are in status.md.

| Topic | IDs | Personally reviewed scope | Outstanding final gate |
|---|---:|---|---|
| arms |8|All final phone light details, all dark mistakes, all start/return3panel sheets|Current final runtime/native|
| arms-extra |7|All phone light/dark phase/3mode sheets; final contrast samples|Current final runtime/native|
| chest |13|All light/dark phase/3mode sheets; wall label repair|Current final runtime/native|
| back |9|All phase/lightdark sheets and all9phone3mode sheets|Current final runtime/native|
| abs |10|All phone light/dark phase/detail/mistake sheets|Current final runtime/native|
| legs |13|All phase/3mode;7warmup both phone themes;6formal both-theme detail/mistakes|Final runtime/native|
| functional |12|All lessons at least1profile, manyboth themes; seam corrected frame evidence personally reviewed|Current final runtime/native|
| shoulders |11|All88current contact-sheet frames; warmup cropfix JPG; independent5511contact+99imagearchive checks|Current final runtime/native incl70hook|
| equipment |14|All140phase/3mode/lightdark sheet frames; chestpress repaired detail2JPG; earlier native6screens|Final regenerated runtime and current native|

## Remaining integrated acceptance

- [ ] Final source/engine hash inventory frozen and generated copies/bundle equal.
- [x] Strict97identity/96page full coverage on final input: final-static-verification.json read18:02,zero problems.
- [ ] All96pages actual rendered full-cycle seam continuity, pause and speed checks; hold lessons correctly identified.
- [x] FullSwift60 tests and current iOS test build successful; retry/build logs inspected18:07.
- [ ] Current simulator real WKWebView offline resources and native bridge/control lifecycle verified.
- [ ] Current simulator light/dark3mode screenshots personally inspected; clear per-topic/course coverage boundaries.
- [x] Equipment native-handoff14 exact text test passed; same-source native implementation reviewed. Final screen rendering remains a separate gate.
- [ ] Any returned defects repaired and specifically revalidated.
- [ ] Final Chinese delivery with evidence and remaining limits; disable heartbeat only after achieved.

Constraints: only task-created gpt-6.1-sol/max chats modify; main audits. No oldchat delegation, commit,push,unrelatedWIP cleanup,physical-device install,Ego restart. Existing oldarms stop verified, no new instruction sent.

- [x] 18:42 UTC：当前 NativeAccessibility 器械14项浅深色三模式84张原生截图，主审逐项查看；2测试0失败，说明标识缺陷关闭。
- [ ] 其余最终训练课/大字号/减少动态/生命周期原生验收与截图复核仍待完成。

- [x] 18:59 UTC：最终引擎96唯一页面/97课真实rAF连续播放、半速、暂停、浅深色接缝通过；主审独立核对完整数据。原生剩余门槛仍未完成。

- [ ] 19:29 UTC新增：三头热身深色大字号深滚返回模式栏后错误对照说明未出现，需定位、修复及实际截图复核。

- [ ] 19:39 UTC同源失败范围更新：三头热身大字号浅色和深色均需修复与重验（114测试最终112通过、2失败）。

### 主审 2026-10-04T20:01:24.513476+00:00
- 亲自查看训练浅色联系表21–42，补齐剩余43课129原生截图。累计83/83训练课249张三模式截图全部亲审，无新增阻断。深色、大字号和特殊场景仍待本对话补充视觉审核。
- 大字号返修仅加强测试模式栏完整可见和选中态检查，8条共享深滚路径正在重跑；两项原失败仍未关闭。10个新对话游标已保存。

### 主审 2026-10-04T20:04:16.516650+00:00
- 亲看coordinator-native-special-sheets/01–06共34张特殊场景原生截图。肩部6张三模式浅色播放与深色减少动态画面通过；结合之前原生测试日志验证其行为边界。
- 14器械大字号28图均停于顶部，图解下半部与说明未展示；现有测试仅验证部分存在性，不足作完整大字号视觉验收。已退回集成补充滚动后完整图解/细节/错误说明、控件可达和暂停步进证据，尚不判产品缺陷。
- 当前8条大字号训练返修路径继续跑，原失败在最终结果封装/画面审阅前不关闭。

### 主审 2026-10-04T20:09:11.478244+00:00
- LargeModeRepair最终日志8/8通过，504.644秒，包含原2失败；新截图待亲审，不以日志独自关闭视觉门槛。
- 亲看coordinator-training-supplement-sheets/01–10共60原生图：16深色案例（腹背肩各1、腿13）和4浅色大字号案例（腹背腿肩各1）三模式画面通过。
- 后4大字号下方说明未在视口内，已要求集成随14器械补证验证滚至末尾/回切模式；不重复83浅色或16深色全量。

### 主审 2026-10-04T20:19:38.702010+00:00
- 亲看coordinator-mode-repair-sheets全部16联系表、8测试79原生截图。浅深色三头热身均实际切换错误对照且说明滚动到底；其余6案例三模式及说明同样可见。结合此前16深色补审，20深色案例画面已覆盖；8大字号案例画布已覆盖，另4大字号说明待补证。
- 新证据一致性疑点：声明的large-mode-repair-SteadyUITests.swift有mode-return capture，但79导出附件无该类。已要求集成核对实际编译/冻结runner来源与附件过滤，未贸然认定旧runner，也不关闭来源门槛。
- 14器械+4训练的大字号滚动补证正在构建，整体仍待最终通过。

### 主审 2026-10-04T20:24:05.813318+00:00
- NativeSupplement新增14器械失败均swift:40 No matching snapshot，约8秒。主审读exposeNativeElement发现先取frame后查exists，Lazy列表中目标按钮未出现即抛错，未进入滚动。已退回集成先exists守卫、保留严格视口断言，先单课验证后14全覆盖；不是依据本次测试宣称产品缺陷。
- 该轮训练补证仍运行，深色三头热身已通过；mode-return来源疑点调查中，整体验收未完成。

### 主审 2026-10-04T20:28:41.396515+00:00
- NativeSupplement最终20测试：6训练通过、14器械helper失败，493.248秒。6训练覆盖4补充大字号说明及原2三头失败，待导出画面亲审。
- 主审独立读取二进制：旧LargeModeRepair SHA65b3fd78含安全视口断言文本但不含mode-return-，新NativeSupplement SHAee8ab789两者均含。支持旧构建早于截图追加的可能，未证明具体过程；已让集成核对构建记录、准确注明差异，避免误称完整源码一致或完全未修复。

### 主审 2026-10-04T20:39:28.114023+00:00
- 亲看coordinator-supplement-training-review/01–10共54图：4训练大字号（腹背腿肩）完整说明滚动及回到模式栏；2三头浅深色三模式与mode-return均正常。结合NativeSupplement6训练通过，原2失败当前复验通过，旧失败证据保留。
- 纠正20:27推断：主审读取反汇编f210–f248，立即数拼接mode-return-后调用capture；连续字节搜索未命中不证明函数未编译，也不能支持构建早于capture的结论。旧运行缺附件原因仍未明，不以此扩大成功来源主张；当前补验明确输出了所需证据。
- 14器械补验及其余6路径来源替代继续，整体未完成。

### 主审 2026-10-04T20:50:09.166186+00:00
- 亲看coordinator-equipment-large-smoke/01–02全部12张座式胸推大字号原生截图：完整三模式画布、说明末尾、回切模式和暂停步进通过。14器械完整大字号现为1/14亲审通过。
- 已核对12原始PNG SHA；原runner安装目录已迁移，改查当前目录并保存coordinator-v2-installed-runner-verification.json。当前5文件匹配情况：{'Info.plist': True, 'PkgInfo': True, 'SteadyUITests-Runner': True, 'PlugIns/SteadyUITests.xctest/SteadyUITests': True, 'PlugIns/SteadyUITests.xctest/Info.plist': True}。
- 其余13器械及6训练来源替代串行运行；尚未最终验收。10新对话游标已保存。

### 主审 2026-10-04T21:06:01.292744+00:00
- NativeSupplementV2Bulk日志19/19通过、TEST EXECUTE SUCCEEDED，覆盖剩余13器械完整大字号及6训练来源替代。尚待导出截图逐组亲审，不以日志替代画面验收。
- 审阅有效用例映射脚本：保留原失败历史，逐项选择当前通过证据；预期129有效方法为多个冻结测试版本的并集，不宣称原失败批次全量通过。

### 主审 2026-10-04T21:15:54.164895+00:00
- 亲看equipment-large-bulk-v2-review/01–29及training-large-bulk-v2-review/01–12，共241张实际原生截图：13器械170图、6训练71图。三模式、器械接触、完整图解、说明末尾、浅深色及模式返回无新增阻断，全部接受。独立核对41联系表和241 PNG SHA一致。
- 加上此前座式胸推，14器械完整大字号亲审全部通过；6训练来源替代画面门槛关闭。证据coordinator-native-bulk-v2-review.json。
- 仍待最终集成报告及最新源码/App/runner哈希冻结复核后交付。

### 最终签收 2026-10-04T21:47:13.262949+00:00
- 本次97身份/96页授权范围全部完成，代码、实际画面、测试构建和哈希证据复核通过。详见final-signoff.md及integration-final-report.md。关闭自动跟进；真实设备未安装。

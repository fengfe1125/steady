# 交接：胸部动作库 · WorkBuddy/DeepSeek 批量生产与验收

写给接手的 Codex。2026-10-14 晚由 Claude 交出。先读 `README.md`（流程）和 `build/action-library/workbuddy/chest/开工说明.md`（批次表）。

## 你的角色

DeepSeek（在 WorkBuddy 桌面 App 里）写动作 JSON；你负责：开窗口 → 收集 → 自动检查 → **看图验收** → 退回或通过 → 补开下一批。直到胸部各批跑完。

## 现在的进度（交接时）

| 批次 | lane | 状态 |
|---|---|---|
| 试点 | round1-pilot/lane-01~04 | 8/8 已验收 |
| 第二轮 A | round2/lane-11~17 | 70 个里 68 已验收；lane-12 的 04 俯冲轰炸机、08 击掌俯卧撑在返工（错误示意穿地） |
| 第二轮 A | round2/lane-18~22 | 22:20 左右刚开，正在跑 |
| 第二轮 A | round2/lane-23 | 22:55 已开（GLM-5.3-Flash） |
| 第二轮 B | round2/lane-04、05、08（哑铃、弹力带） | 04、05、08 均已开（GLM-5.3-Flash） |
| 第二轮 C | 其余 lane（器械、龙门架、健身球等） | 由你补器材模型后开（见下方“第二轮 C”） |

最新数字随时看：`python3 -I tools/action-library/collect.py --part chest`，汇总在 `build/action-library/workbuddy/chest/汇总.md`。

## 一个循环

1. 等结果：`python3 -I tools/action-library/ops/watch.py /tmp/action-library-ops/watch-state.json 120 1200`
   （有 JSON 新增/改动并安静 120 秒后退出并列出变动；最长 20 分钟。第一次运行先用 `... 0 1` 建基线。）
2. 收集：`python3 -I tools/action-library/collect.py --part chest`
   - 自动把 JSON 复制到 `specs/chest/`、跑 `check.mjs`、渲染 `build/action-library/<id>/comparison.jpg` 和 `svg-mistakes.png`，并把 `检查结果.md` 写回每个动作文件夹。
   - 需要本地 8767 端口服务和 Chrome，collect 会自己起服务。
3. 看图验收「待验收」的：`tools/action-library/ops/sheet.sh /tmp/x.jpg <id1> <id2> <id3>` 把对比图 + 错误示意拼成一张，逐张看。
4. 写结论到 `tools/action-library/reviews/chest.json`：`{"<id>": {"status": "approved"}}` 或 `{"status": "rejected", "note": "具体改法和数值"}`（保留已有 `digest` 字段）。
5. 再跑一次 collect，结论会写进 `检查结果.md`（✓/✗）。
6. 某 lane 的窗口已跑完但还有 ✗ → 在该 lane 开**新**窗口发返工指令（见下）。窗口空出来就补开新 lane。同时保持 6~8 个窗口。

JSON 被 DeepSeek 再次修改时 digest 变化，之前的结论自动失效、回到「待验收」，要重新看。

## WorkBuddy 操作（computer-use，需全屏控制）

- 新建任务 → 下方「选择工作空间」→「打开本地文件夹」→ 文件对话框里 `cmd+shift+g` 输入 lane 绝对路径 → 回车 → 「打开」。
- 模型：22:50 起 DeepSeek 显示拥堵，默认已改为 `GLM-5.3-Flash`（能读帧图、产出可用）；DeepSeek 恢复后可换回，权限保持「默认权限」。
- 首跑消息：`请完整阅读本文件夹的 任务说明.md 和 PROMPT.md，然后按要求依次完成所有动作。`
- 继续+返工通用消息（窗口中途停了或报错时用）：`请阅读 任务说明.md 和更新过的 PROMPT.md：先完成还没有 JSON 的动作，再修改带 ✗ 检查结果的动作（先读每个 检查结果.md 里的修改意见）。`
- 返工消息：`请阅读 任务说明.md 和更新过的 PROMPT.md，只修改带 ✗ 检查结果的动作。`
- 每步留足等待（对话框 2 秒），输入前先 `cmd+a`+Delete 清空——曾出现输入法残留字符“了/l”。发送前截图确认输入框左下显示的是正确 lane。
- 后台截图（app_screenshot）对 WorkBuddy 常常是旧画面，要看真实状态用全屏截图。
- 侧边栏：转圈 = 在跑；绿点/“xx分钟前” = 已结束。

## 已知坑

- **WorkBuddy 服务报错**：对话里出现“服务暂时不可用，请稍后重试”和红色感叹号时，点「重试」即可继续（23:26 lane-04 出现过）。
- **跪姿上斜**：用 PROMPT 的 B4 模板；`mirror` 为 true 时器材 x 也翻转。

- **窗口卡死**：lane-15 曾两次在读第一张帧图时卡 31 分钟后被取消。同一对话重试无效，**新开窗口**就好。某 lane 超过 15 分钟没有任何 JSON 就去看。
- **侧面视角看不出手宽**：宽距/窄距/钻石/击掌/宽窄交替等在侧面只能靠 `dx` 区分（窄距约 -14，宽距约 12）；剩下的差别靠节奏，这是可接受的视角限制，别逼 DeepSeek 编造差异。
- **正面视角**：`el` 为正 = 前臂外翻（投降状）；合掌/夹胸/交叉要用负 `el`（合掌约 `abd 30, el -120`）和负 `abd`（越过中线）。PROMPT 已写明。
- **侧向伸出的手臂**（弓箭俯卧撑等）用透视缩短 `f`，画面上手靠近头部，可接受。
- 模板数值是关键：DeepSeek 基本照抄 PROMPT 模板再微调。发现系统性错误时**改 `tools/action-library/PROMPT.md` 的模板**（先用 `ops/try.sh` 渲染、`check.mjs` 验证），然后同步到所有 lane：
  `for f in build/action-library/workbuddy/chest/round*/lane-*/PROMPT.md; do cp tools/action-library/PROMPT.md $f; done`
- 验证数值的工具：`node tools/action-library/ops/reach.mjs <spec.json> '[{"poses.0.pelvis":78}]'` 快速试够不够得着；`SC=/tmp/x tools/action-library/ops/try.sh <spec.json> <临时名> '<JSON patch>'` 渲染变体。

## 本次已改过的东西（都在工作区，未提交）

- `PROMPT.md`：跪姿模板（小腿抬起）、俯卧撑起点 pelvis 78、上斜/下斜模板 B2/B3、塌腰错误示意写法、`hand cannot reach` 修正规则、正面 el/abd 说明、窄距 dx、`wall_back` 器材说明。
- `check.mjs`：手够不到时不再崩溃；错误示意也做穿地检查；“动作完全一样”只在时间点、手距、器材都相同时才报错，其余降为警告由人工比对；白名单加 `wall_back`。
- `tools/video-svg/equipment.js`：新增 `wall_back`（人物身后、与镜头平行的墙板）。**不要改 `tools/anatomy/engine/`**，那是 App 已上线课程的共享引擎。
- `tools/action-library/ops/`：上面提到的辅助脚本。

## 验收标准（我这几轮的尺度）

- 必须退回：姿态与视频明显不符（如四点跪撑画成俯卧撑、单臂动作画成双臂）、错误示意看不出错或穿地、窄距没区分 dx、动作方向反了。
- 可以通过：只因视角看不出的差别（手宽、击掌离地、弓箭侧伸），以及视频是特写、DeepSeek 在 observation 里如实说明了的。
- 退回意见要写具体数值，DeepSeek 照数值改的成功率很高。


## 第二轮 C：器材适配（你自己规划、自己推进）

用户要求：A、B 跑完后不要停，继续把 C 批做完。C 批卡在“器材模型没有”，这部分由你自己设计和实现：

1. 盘点 C 批 lane（round2 里除 04、05、08、11~23 以外的 lane-01、02、03、06、07、09、10、24~28）需要的器材：杠铃+杠铃架、史密斯机、上斜/下斜凳（`bench` 的 `back`）、健身球/瑜伽球、波速球（半球）、悬挂带 TRX（已有 `trx`）、弹力绳/绳索/龙门架、推胸器械、双杠、普拉提圈、泡沫轴（已有 `roller`）、筋膜球/筋膜枪、药球、踏板、壶铃、VIPR、牛角包等。先在 codex-report.md 列出“器材 → 需要的 lane/动作 → 是否已有类型”。
2. 新器材类型**只加在 `tools/video-svg/equipment.js`**（参照已有的 `reference_sled`、`reference_press`、`wall_back`），**不要改 `tools/anatomy/engine/`**。同时加进 `check.mjs` 的 `EQUIPMENT` 白名单，并在 `PROMPT.md` 第六节器材表写清参数和用法（含一个已验证的完整姿态模板）。
3. 每加一种器材都要验证：用 `ops/try.sh` 拿一个相近的已验收 spec 改出示例，渲染对比图看清楚，再跑 `check.mjs`。不合格不要写进 PROMPT。
4. 某个 lane 需要的器材全部就绪、PROMPT 已同步到所有 lane（`cp tools/action-library/PROMPT.md` 到每个 `lane-*/PROMPT.md`）后，再在 WorkBuddy 开这个 lane；同时 6~8 个窗口。
5. 实在画不出来的器材（如筋膜枪），可以用最接近的简化形状或不画器材，但要在 observation 和 codex-report.md 里说明。
6. 每一轮在 codex-report.md 记录可量化的进展：本轮新验收数、退回数、新增器材、开了哪些 lane。连续两轮没有任何进展时，写明卡在哪里、你打算怎么换方法。

## 自动接手机制

- Claude 每个循环把当前时间（秒）写入 `ops/heartbeat`。`ops/handoff_watchdog.sh`（nohup 后台常驻）发现心跳超过 45 分钟未更新，就以完全权限启动 `codex exec` 接手，日志在 `ops/codex-run.log`。
- Codex 运行期间存在 `ops/codex.lock`；Claude 回来看到锁就不要操作，避免两边同时开窗口、同时写 reviews。
- Codex 每个循环写 `ops/codex-heartbeat`；结束时写 `ops/codex-report.md`。
- WorkBuddy 的 DeepSeek 若额度用完或下线，在模型菜单里改选其他可用模型（优先 Deepseek-V4-Pro，其次 GLM-5.3 / Kimi-K2.6），在 codex-report.md 里记下从哪个 lane 起换了模型。
- 控制 WorkBuddy 需要 GUI 操作；如果你的环境没有全屏控制工具，可用 `osascript`（System Events）操作，或者至少完成收集、验收、写返工意见，把需要开的窗口列在 codex-report.md 里等用户处理。

## 收尾

全部跑完后告诉用户：各批完成数、仍未通过的动作和原因、对 PROMPT 的改动建议。结果不提交 git，除非用户要求。

## 2026-10-15 03:20 更新（Claude 夜班后）

- **C 批器材已全部就绪，所有 lane 都已开过并跑完首轮**；283 个里约 265 个已验收，剩下的是返工尾巴。最新状态看 `汇总.md`。
- 新器材都在 `tools/video-svg/equipment.js`（engine 没动）：`barbell`、`smith`、`ball`（可 `under`/`between`）、`bosu`（`flip`）、`ring`、`kettlebell`、`pushup_bars`、`box`（可 `under`）、`cable`（`style: band`、`column`）、`lever`（器械推臂）。check.mjs 白名单另加了 engine 已有的 `chest_parallelBars`、`reference_press`、`library_chestPress`。PROMPT 第五节 E2/E3/F/G/H 是对应的已验证模板。
- 验收时常见的坑（已写进 PROMPT，但模型仍会犯）：
  1. 上斜/下斜凳上 `sh` 相对躯干：上斜顶端 `sh 118`、下斜 `sh 70`，照抄 90 手臂会歪。
  2. 飞鸟别画成手往头顶甩；侧面飞鸟用 `sh 60, el 25, f 0.35`。engine 的 `f` 缩短效果很弱，侧面飞鸟/双臂侧开的拉伸只能表现个大概，这是视角限制，可通过。
  3. 正面视角 `r` 手在画面**右侧**（x 正）：绳索固定点 `r` 写 +x。
  4. 正面站姿要整段照抄 `x/y/legs`，只写 arms 会报 `ankle.r cannot reach (12, -19)`。坐姿/弓步/俯身的绳索动作用侧面。
  5. 绳索/推胸：手要往远离固定点的方向推；坐姿夹胸的立柱在身后。
- 自己修 spec 的办法（模型反复修不好时）：在 `/tmp/action-library-ops/` 下用 python 生成变体 → `node tools/action-library/check.mjs <变体>` 验证（变体放单独目录，否则互相报“moves exactly like”）→ 写回 lane 里的 JSON，observation 末尾注明“统筹修正”→ reviews 里删掉该 id 的 `digest` 再写 approved。lane-04/02、lane-09/05~07 就是这么修的。
- collect 一次要 7~10 分钟（新渲染多）。**collect 运行期间不要写 reviews/chest.json**（collect 结束时会整体覆盖它）。

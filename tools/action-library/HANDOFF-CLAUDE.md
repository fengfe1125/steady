# 交接给下一个 Claude 会话：胸部动作库夜间生产（统筹者）

写于 2026-10-15 00:30，由上一个 Claude 会话交出（额度用完，用户换账号）。
你的角色是**统筹者**：Codex 负责规划、检查、操作 WorkBuddy、推进器材适配；你监督它、纠正它，**Codex 额度用完的时候你顶上**，把活接着干下去。用户在睡觉，项目不能停。

先读这三份，再动手：

1. `tools/action-library/HANDOFF.md`：执行流程的细节（循环、命令、WorkBuddy 操作、坑、验收尺度、第二轮 C 器材适配计划）。Codex 也按它干活。
2. `tools/action-library/ops/codex-report.md`：Codex 每一轮的进展、遇到的问题、它打算怎么做。
3. `build/action-library/workbuddy/chest/汇总.md`：每个动作的最新状态（collect 生成）。

---

## 1. 项目是什么

把 Keep 动作库里的胸部动作（共 280 个）做成 Steady App 里的 SVG 教学动画：

- WorkBuddy（桌面 App）里的大模型看 12 张帧图，按 `PROMPT.md` 写动作 JSON。最早用 DeepSeek，22:50 起 DeepSeek 拥堵，改用 `GLM-5.3-Flash`，lane-04 里还用过 Kimi。
- `tools/action-library/collect.py` 负责收集：自动检查、渲染对比图、把 `检查结果.md`（✓/✗）写回各动作文件夹。
- 人工（Claude/Codex）看对比图做验收，结论写在 `tools/action-library/reviews/chest.json`。
- 有 ✗ 的，在 WorkBuddy 新开窗口让模型返工。

## 2. 交接时的进度（00:27）

`missing 115 · failed 9 · passed 4 · approved 150 · rejected 2`。总共 280，C 批约 110 个没开。

| 批次 | lane | 状态 |
|---|---|---|
| 试点 | round1-pilot/lane-01~04 | 8/8 已验收 |
| 第二轮 A（徒手） | round2/lane-11~23 | 基本全部验收；lane-18、lane-23 各剩 1~2 个返工（交替抬臂“hand jumps”、靠墙俯卧撑、跪姿对侧扩胸穿地） |
| 第二轮 B（哑铃、弹力带） | round2/lane-04、05、08 | 进行中：04 的对角上抬/T 字转体/卧推+飞鸟有自动检查错误；05 的臀桥系列 Codex 刚复审（2 通过、2 退回）；08 的坐姿弹力带夹胸“ankle cannot reach” |
| 第二轮 C（器械等） | lane-01、02、03、06、07、09、10、24~28 | **没开**。先补器材模型，见 HANDOFF.md「第二轮 C：器材适配」 |

另外：Codex 00:10 暂存的 7 条验收结论，我已在 00:30 合并进 reviews/chest.json，原文件改名为 `/tmp/action-library-ops/pending-verdicts.merged.json`。合并后的 collect 当时在后台跑，跑完后数字会更新。

## 3. 夜间无人值守机制（都在 `tools/action-library/ops/`）

| 组件 | 说明 |
|---|---|
| `handoff_watchdog.sh` | nohup 常驻，用 `pgrep -fl handoff_watchdog` 查看。`heartbeat` 文件超过 45 分钟没更新且没有 `codex.lock` 时，就启动 `codex exec --dangerously-bypass-approvals-and-sandbox`。Codex 的 `codex-heartbeat` 超过 60 分钟没更新时，杀掉重启。Codex 启动不到 60 秒就退出（通常是额度用完），就退避 15 分钟再试。日志在 `codex-run.log` |
| `heartbeat` | **现在写的是 0**，表示“Claude 不在岗”，让看门狗一直让 Codex 干。你自己顶班时要改，见第 5 节 |
| `codex.lock` / `codex.lock.t` | Codex 正在运行的标志（内容是 pid）。有锁并且进程活着，就说明 Codex 在干活，**你不要同时操作 WorkBuddy、写 reviews 或跑 collect**，否则会互相覆盖 |
| `codex-report.md` | Codex 的工作日志；你的纠正意见也写在这里（开头写“## Claude 纠正 时间”） |
| `caffeinate -dims -t 43200` | nohup 运行，防休眠到 10/15 约 11:40 |
| `watch.py` / `sheet.sh` / `try.sh` / `variant.py` / `reach.mjs` | 监视结果变动、拼对比图、渲染变体、测手够不够得着，用法见 HANDOFF.md |

看门狗交给 Codex 的指令（写在脚本里的 PROMPT）：一直循环，不准因为“暂时没事做”就退出；A、B 完成后自己规划 C 批器材适配；每轮都要有可量化的进展；直到胸部所有 lane 验收完才能结束。

**Codex 额度：**ChatGPT 账号 hkd@outlook.lv（Plus），00:18 用完，日志显示 **03:31 恢复**。看门狗会自动重试，不用手动去启动。

## 4. 你作为统筹者：每次醒来做什么（建议每小时一次）

1. **Codex 在不在干活：**
   - `cat tools/action-library/ops/codex.lock; kill -0 $(cat tools/action-library/ops/codex.lock) && echo alive`
   - `tail -40 tools/action-library/ops/codex-run.log`：有 `usage limit` 就是额度用完；有 `exited` 就看原因。
   - 读 `codex-report.md` 的最新几轮。
2. **Codex 是不是在偷懒或做错：**
   - 最近一小时的 report 里有没有可量化进展：新验收数、开了哪些 lane、新增了哪些器材。连续两轮没进展就是有问题。
   - 抽查它的验收：从 reviews/chest.json 挑几个最近 approved 的，用 `tools/action-library/ops/sheet.sh /tmp/x.jpg <id>...` 拼图看一下，确认尺度和 HANDOFF.md「验收标准」一致。
   - 器材适配：看 `git diff tools/video-svg/equipment.js tools/action-library/check.mjs tools/action-library/PROMPT.md`。器材只能加在 `tools/video-svg/equipment.js`，**不准改 `tools/anatomy/engine/`**（那是 App 已上线课程的共享引擎）；改完 PROMPT.md 必须同步到每个 lane。
3. **纠正方式：**在 `codex-report.md` 末尾追加“## Claude 纠正 <时间>”，写清楚问题和正确做法，Codex 每轮都会读。系统性的问题同时写进 HANDOFF.md。错得很严重时（比如改了 anatomy engine），可以直接 `kill $(cat codex.lock)`，看门狗会用最新指令重新拉起。
4. **WorkBuddy 抽查：**`screencapture -x /tmp/s.png` 看一眼，有红色感叹号就点「重试」；侧边栏转圈表示在跑，绿点或“xx分钟前”表示已结束。

## 5. Codex 额度用完时你怎么顶班

1. 确认 Codex 不在跑：没有 `codex.lock`，或者锁里的进程已经不在了。
2. 开工就写 `date +%s > tools/action-library/ops/heartbeat`，**之后每个循环都刷新一次**。这样看门狗认为你在岗，不会在你干活时启动 Codex，避免两边同时操作。
3. 按 HANDOFF.md「一个循环」干：watch.py 等结果 → collect → 用 sheet.sh 看图 → 写 reviews/chest.json（保留 digest）→ 再 collect → 已结束但还有 ✗ 的 lane 开返工窗口 → 补开新 lane。
4. **交还给 Codex：**在 Codex 额度恢复前后（比如 03:31），写 `echo 0 > tools/action-library/ops/heartbeat`，看门狗会在 2 分钟内拉起 Codex。
5. 你自己的额度快用完时，也一定要先把 heartbeat 写回 0，再在 codex-report.md 里记下你做到哪一步了。

## 6. WorkBuddy 操作要点（computer-use）

- 先 `request_access` 申请 WorkBuddy，再 `request_full_control`。拿到授权后**不要调用 release_full_control**，否则下次又要用户批。用户睡觉时没人能批。
- 后台截图 `app_screenshot` 对 WorkBuddy 经常是旧画面，要看真实状态用全屏截图。
- 开窗口：新建任务 →「选择工作空间」→「打开本地文件夹」→ 对话框里 `cmd+shift+g` 输入 lane 绝对路径 → 回车 →「打开」→ 点输入框 → **先 `cmd+a`+Delete 清空**（有输入法残留字符）→ 输入消息 → 截图确认左下角是正确的 lane → 发送。每一步留 1~2 秒等待，对话框要等 2 秒。
- 上一会话在窗口位置 x≈130~1250、y≈66~810（1372×892 坐标系）时用过的坐标：新建任务 (310,226)；选择工作空间 (636,530)；打开本地文件夹 (662,486)；对话框「打开」(1162,650)；输入框 (940,410)；发送 (1290,485)。**窗口会移动，用之前先截图确认。**
- 三种消息：
  - 首跑：`请完整阅读本文件夹的 任务说明.md 和 PROMPT.md，然后按要求依次完成所有动作。`
  - 继续+返工：`请阅读 任务说明.md 和更新过的 PROMPT.md：先完成还没有 JSON 的动作，再修改带 ✗ 检查结果的动作（先读每个 检查结果.md 里的修改意见）。`
- 模型：DeepSeek 拥堵（模型菜单里有红色标志）就用 GLM-5.3-Flash，它能看帧图、产出可用，但 levels 格式错得多一些。窗口同一个对话里卡死（比如读第一张帧图卡 30 分钟），就**新开窗口**，不要在原对话里重试。
- 同时开 6~8 个窗口。

## 7. 今晚修过的东西（都在工作区，没提交 git；不要提交，除非用户要求）

- `PROMPT.md`：
  - 模板：跪姿（小腿抬起）、俯卧撑起点 pelvis 78、B2 上斜、B3 下斜（含错误示意）、B4 跪姿上斜（mirror 时器材 x 会翻转）。
  - 写法说明：塌腰错误示意、“hand cannot reach”怎么修、正面视角 el/abd 正负号（合掌、夹胸、交叉）、窄距 dx -14、`wall_back` 器材。
- `check.mjs`：手够不到时不再崩溃；错误示意也做穿地检查；“完全照抄”只在时间点、手距、器材都相同时才报错；白名单加 `wall_back`。
- `collect.py`：JSON 没变而且对比图已存在的，跳过重新渲染（从 10 分钟降到几十秒）。
- `tools/video-svg/equipment.js`：新增 `wall_back`。
- `ops/`：上面那些脚本。

## 8. 用户的偏好（这次会话里说过的）

- 用中文回复。
- 整晚不能停；Codex 要一直干，不准偷懒；有很多器械还没适配，要推进 C 批。
- 已经给了完全权限，不用再问；全屏授权一旦拿到就不要交还。
- 用户醒来会看 `codex-report.md` 和 `汇总.md`。早上请在 codex-report.md 末尾写一段汇总：完成数、仍未通过的动作和原因、新增器材、PROMPT 的改动、需要用户拍板的事。

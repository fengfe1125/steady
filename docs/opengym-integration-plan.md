# openGym × Steady 融合计划

日期：2026-10-16。参考仓库：`/Volumes/Developer/Projects/openGym-reference`，固定提交 `e348fc17`。
本文是执行计划，不是法律意见；涉及发布前的授权判断请以权利人书面答复为准。

## 一、先说结论：瓶颈在哪里，openGym 能解决哪一部分

Steady 现在的目录只有 92 个动作（39 approved / 53 learningOnly），因为每个动作都要配一套手绘 SVG 动画并逐项审核。**"动作存在于库里" 和 "动作有动画" 被绑在了一起**，这才是瓶颈。

openGym 的 5,632 个动作之所以快，是因为动画是从 Gym visual 买的授权素材。这部分**拿不过来**（见下）。真正能融合的是三样东西：

1. **动作文本库**：1,324 条 MIT 授权的动作（名称、器械、主/次肌群、步骤）。
2. **肌肉图**：body map 来自 MuscleMap（MIT，原本就是 Swift 包），可直接用于 SwiftUI。
3. **训练引擎的设计**：进阶规则、1RM、PR、热身、杠铃片计算、超级组、轮换计划、CSV 导入等。代码是 AGPL 的 JS，Steady 是 Swift，本来也没法直接合并，按功能规格独立重写即可（Codex 这次的训练闭环已经是这么做的）。

所以融合方案是：**把 Steady 拆成"动作库（广）＋ 教学动画（精）"两层**，库从 openGym 的 MIT 部分起步，动画继续用 Steady 自己的管线，按实际使用频率逐步补。

## 二、授权边界（必须先定）

| openGym 内容 | 授权 | Steady 能否使用 |
|---|---|---|
| `catalogue/media/`（静图、动画） | Gym visual 专有授权，仅限 openGym | **不能**。不能打包、不能热链，也**不能作为 AI 或 SVG 动画制作的参考**（NOTICE 原文明确禁止作为生成动画的依据）。`tools/video-svg` 必须继续只用自有素材源。 |
| `textSource: "exercisedb"` 的 1,324 条：名称、肌群、步骤 | MIT（ExerciseDB v1 → hasaneyldrm/exercises-dataset） | **可以**，保留 MIT 声明。建议从上游 `hasaneyldrm/exercises-dataset` 原始数据导入，而不是 openGym 改过的副本（openGym 社区之后的修改属于 AGPL）。 |
| 这 1,324 条的 `description`、`muscleMap` 修正 | AGPL（openGym 自写） | 不能（除非走 AGPL 路线） |
| 其余 4,308 条动作文本 | AGPL | 不能（除非走 AGPL 路线） |
| `i18n/zh.json`（5,632 条完整中文） | AGPL（openGym 自写译文） | 不能（除非走 AGPL 路线）。MIT 那 1,324 条也需要 Steady 自己翻译。 |
| `frontend/src/lib/body-paths.js` / MuscleMap | MIT | **可以**。直接用 MuscleMap 的 Swift 源更合适。 |
| 前后端代码（进阶、同步、导入、教练） | AGPL | 不复制；按功能规格在 Swift 中独立实现。公式（Epley 1RM 等）、通用训练计划（PPL、5×5）、Strong/Hevy 的 CSV 格式属于公共知识。 |

### 授权路线（2026-10-16 已决定：路线 A）

- **路线 A（推荐）：保持 Steady 现有授权，只用 MIT 部分 + 独立实现。** 风险最低，不影响 App Store 上架，立刻能开工。代价是首批库只有约 1,300 条，中文需要自己翻译。
- **路线 B：给 openGym 作者发邮件，申请单独授权使用 AGPL 的动作文本和中文译文。** openGym 有 CLA，作者有权再授权。可以和 A 并行：先按 A 开工，若获批再追加 4,308 条和现成中文。
- **路线 C：Steady 整体改为 AGPL。** 仓库已经公开，表面上成本不高，但 AGPL 与 App Store 条款有已知冲突，openGym 的"应用商店例外"只写明适用于 openGym 自己的 App，衍生作品是否覆盖并不明确；后端 Supabase 函数也要按 AGPL 网络条款提供源码。不建议在没有书面确认前选择。

## 三、执行阶段

### 阶段 0：收口当前分支（1 天内）

（已完成，提交 `76c3368f`；`docs/verification` 下约 650 MB 的验收证据未入库，保留在本地。）当时 `codex/workout-loop` 有 34 个已修改文件和大量未跟踪文件（训练闭环、目录 v2、下肢、视频还原 SVG）。融合会动目录和训练选择器，**先把这批工作提交、跑完测试、合并到 main**，否则后续改动无法分辨归属。交付记录里写明 XCUI 完整用例尚未成功执行，这一项要在合并前补齐，或在 PR 中明确标为已知缺口。

另外加一道防线：`scripts/check-third-party.mjs`，在 CI 和 `swift test` 前运行，若仓库中出现 openGym 媒体文件哈希、`textSource: "opengym"` 的条目、或 openGym 独有的描述文本，就失败。

### 阶段 1：动作库层（已完成首版，分支 `claude/exercise-library`）

已确定走路线 A。实际做法与最初设想的差异已写在下面。

**数据**
- 来源：`hasaneyldrm/exercises-dataset` 固定提交 `7455efae`，`data/exercises.json` SHA-256 `656634…f93d`。上游的 MIT 范围包括动作文字及其多语言译文，**自带全部 1,324 条的中文步骤**，所以不需要使用 openGym 的 AGPL `zh.json`。上游图片和动画属于 Gym visual，不在 MIT 范围内，导入脚本既不读取也不引用。
- `tools/exercise-library/build.mjs --refresh <下载路径>` 核对哈希后，只保留名称、部位、器材、肌群和中英文步骤，写入 `tools/exercise-library/source/exercises.mit.json`（附上游 LICENSE）。不带参数运行时生成 `Sources/SteadyCore/Resources/TrainingCollections/exercise-library.v1.json`（约 1.5 MB），`--check` 检查是否过期。
- 中文名：`names.zh.tsv` 是 Steady 自己的机器翻译，一行一个，方便逐条审核；界面标为"机器翻译，尚未人工审核"。
- 器材**不强行映射**到 Steady 的 41 个器材 ID：那些 ID 精确到具体器械，与上游的粗分类含义不同。动作库使用自己的 28 种器材和 10 个部位，中文标签放在 `vocab.json`。
- 记录方式：拉伸、静态支撑和有氧按计时记录；无负重器材按仅次数；其余按重量×次数。单臂、单腿动作默认左右分别记录。规则写在 `vocab.json`，例外逐条列出。
- 去重：`equivalents.json` 把 32 个审核目录动作对应到库中的同一动作。选择器隐藏这些库条目，只显示目录版本。这样，目录中标为"仅供学习"的动作不会通过动作库被加入训练。

**代码**
- `SteadyCore/ExerciseLibrary.swift`：加载（`shared` 只加载一次，界面在后台读取）、按部位和器材筛选，支持中文、英文、全拼和拼音首字母搜索。
- `WorkoutMove(library:)`：身份为 `library:edb-0001`，`catalogID` 为空，默认 3 组 × 8–12 次。
- `WorkoutViews` 选择器新增"审核目录 / 动作库"切换；库动作进入详情页（中英文步骤、肌群、来源与 MIT 许可全文），确认后再添加。已保存的库动作可在"动作目标"页查看说明。
- AI 计划生成不使用库动作。

**Supabase**：不需要改动。训练记录照常走 `sync-push` / `sync-pull`，`workout.ts` 只要求 `identity` 是长度 1–200 的字符串；没有新迁移，也不需要部署函数。

**验收**：`node --test tools/exercise-library/build.test.mjs`（构建可复现、字段完整、中文名不重复、不含媒体字段或 openGym 文本、对应关系有效、记录方式推断）；`swift test --filter ExerciseLibraryTests`（加载、搜索、筛选、隐藏重复项、身份编码往返）。

**尚未完成**：中文名人工审核；XCUI 点击用例；真机上首次加载的耗时测量。

### 阶段 2：肌肉图（约 1 周）

- 引入 MuscleMap（MIT）的 Swift 路径数据，放进 `SteadyCore` 或作为 SPM 依赖，附 MIT 声明。
- 三处使用：动作详情页高亮主/次肌群；训练结束页显示本次练到的部位；趋势页按周显示各肌群训练量。
- 遵守现有动画规范：肌肉图是独立视图，**不叠加在教学动画的人物上**，肌群名称用原生文字放在图下方。

### 阶段 3：训练引擎补齐（约 2–3 周，可拆分并行）

按对 Steady 用户的价值排序，全部做成 `SteadyCore` 里的纯函数加单测，与现有 `WorkoutProgression` 同一风格：

1. 预估 1RM（Epley/Brzycki）与 PR 识别（重量、次数、预估 1RM），训练中即时提示。
2. 热身组自动生成（按工作重量和器械步长）。
3. 杠铃片计算（按用户拥有的杠铃片）。
4. RIR/RPE 记录列（可选，默认关闭）。
5. 进阶规则扩展：线性进阶、停滞自动减载；已有的双进阶保持不变。
6. 超级组 / 循环。
7. 轮换计划（A/B/C 按完成顺序推进，不绑定星期几）。
8. 入门计划模板：推拉腿、上下肢、全身、5×5，只用 approved 动作组装。
9. 同模式 / 同肌群替换动作。
10. 从 Strong / Hevy CSV 导入历史，按名称匹配到库 ID，匹配不上的转为自定义动作。

### 阶段 4：动画覆盖率（持续进行）

- 统计库动作在训练记录中的使用频率，每批取前 N 个，用现有 `tools/anatomy` / `tools/video-svg` 制作动画，素材只用自有来源。
- 如果追求速度：可以直接向 gymvisual.com 购买商业授权（与 openGym 同一素材来源）。这是付费路线，需要你评估成本，届时以 Gym visual 的授权条款为准。

## 四、明确不融合的部分

- openGym 的 Web / Capacitor 前端、自托管 Docker、Passkey 服务端、MCP 服务端：Steady 是原生 SwiftUI + Supabase，不需要。
- openGym 的同步引擎：Steady 已有 outbox / 冲突 / tombstone 机制和 `X-Steady-Record-Kinds` 协商，继续沿用。
- openGym 的 AI 教练：Steady 的"AI 只选审核编号、程序填用量"更严格，保留 Steady 的做法。

## 五、建议的执行顺序

阶段 0、阶段 1 已完成 → 阶段 2 与阶段 3 的前几项可以并行 → 阶段 4 持续进行。

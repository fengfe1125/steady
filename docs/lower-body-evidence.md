# 下肢基础计划 v2：来源、派生模板与边界

核对日期：2026-10-10。本文记录目录内容依据与产品规则。来源包括官方公开文字和仓库现有教学；没有新增专家亲审、临床验证或逐帧视频审查。新增课与新剂量属于 `supplemental`，不能标成原视频教练的新增口述。

## 官方来源与实际支持的结论

| 来源 | 核对到的内容 | 在 Steady 中如何使用 |
| --- | --- | --- |
| [ACSM 2026 阻力训练指南发布说明](https://acsm.org/resistance-training-guidelines-update-2026/)（2026-03-17） | 面向健康成人，强调持续训练、主要肌群覆盖和按个体条件安排负荷、训练量。 | 支持简洁、可持续和个体化的产品方向。不能据此宣称任何具体动作的固定用量已获得 ACSM 审核。未把面向力量目标的高强度建议自动赋给初学者。 |
| [NASM Beginner Fitness Routine](https://www.nasm.org/resource-center/blog/training/beginner-fitness-routine)（页面更新 2026-08-05） | 一般初学者安排为 2–3 组、8–12 次、组间 60–90 秒；强调受控动作及每组保留至少约两次余力。 | 取较低组次端点，派生 2×8；多关节膝/髋主导模板取 90 秒，辅助模板取 60 秒。其对每个具体变式的使用是本产品的推导，不是该文章给出的逐动作处方。 |
| [NHS Strength exercises](https://www.nhs.uk/live-well/exercise/strength-exercises/)（审阅 2024-02-28） | 坐站使用结实、防滑、无轮且高度合适的椅子，起始目标 5 次；扶稳双脚提踵也从 5 次开始，去掉支撑是更难变式。 | 坐站与扶稳提踵初学模板每组 5 次；2 组、60 秒休息和其他经验档 8 次由产品派生。椅子与手扶物分别确认；无扶提踵保留独立身份及平衡条件。 |
| [ACE Romanian Deadlift](https://www.acefitness.org/continuing-education/certified/may-2025/8865/the-ace-do-it-better-series-the-romanian-deadlift/)（2025-05） | 建议能完成 10–15 次保持脊柱与动作范围控制的徒手髋铰链，再考虑外部负重；可先用轻哑铃。 | `hip-hinge` 为负重 RDL 的准备条件。取 10 次作为 1 组徒手准备练习是产品派生，不能替代髋主导主练。 |
| [ACE Glute Bridge](https://www.acefitness.org/resources/everyone/exercise-library/49/glute-bridge/) | 仰卧于垫或地面，屈膝、双脚踩稳，受控抬髋。 | 支持地面双腿臀桥身份与动作要点；垫子可选。本模板仅自重，不覆盖负重、单腿或背部架高的其他版本。 |
| [ACE Side Lying Hip Abduction](https://www.acefitness.org/resources/everyone/exercise-library/38/side-lying-hip-abduction/) | 无器械侧卧髋外展；保持躯干与髋部叠放，控制抬放，不用骨盆倾斜扩大幅度。 | 支持独立侧卧外展身份与骨盆控制要点。每侧 2×8、60 秒休息来自一般剂量派生；该页没有这个逐项处方。 |
| [ACE Bodyweight Squat](https://www.acefitness.org/resources/everyone/exercise-library/135/bodyweight-squat/) / [Goblet Squat](https://www.acefitness.org/resources/everyone/exercise-library/362/goblet-squat/) | 分别提供徒手深蹲与胸前持哑铃深蹲教学。 | 保持两个动作身份、器械条件与准备时间；不会仅因都有下蹲动画就合并。 |
| [ACE Seated Leg Press](https://www.acefitness.org/resources/everyone/exercise-library/154/seated-leg-press/) / [NASM Seated Leg Curl](https://www.nasm.org/resource-center/exercise-library/seated-leg-curl) | 对应器械动作与设置、控制要点。 | 结合现有器材教学要求用户确认设置能力。具体机器设置遵循该器械说明，不能由“健身房”场景自动认定。 |
| [NASM Squat Alternatives](https://www.nasm.org/resource-center/blog/squat-alternatives) | 讨论包括腿举、保加利亚分腿蹲在内的蹲类替代。 | 用作膝主导分类的辅助依据；扶稳、双脚在地的分腿蹲是产品教学回退版本，不能标成该文对同一版本的完整教学或剂量。 |

现有的俯卧腿弯举、髋内收和器械腿屈伸以仓库已存步骤、错误提示、自检和器械设置说明为动作依据；本次增加一般剂量派生，没有伪造新的公开视频证据。对应源分别是 `Reviewed/legs/tanchengyi-legs.json#legs-prone-leg-curl`、同文件的 `#legs-hip-adduction` 和 `Sources/SteadyCore/EquipmentLessonDefinition.swift#seated-leg-extension`。所有逐动作出处都保存在 v2 的 `review.basis`，完整文件摘要由 [v2 审查清单](exercise-catalog-review.v2.json) 自动记录。

## 16 个目标的可执行边界

三档经验统一指「初学者／偶尔运动／规律运动」。下列均还要求本次器材可用、相关条件 `ready` 且条件版本匹配；经验本身不能证明动作能力。条件页可以直接打开教学，未确认条件的用户仍可学习。保加利亚分腿蹲仅后两档；其模板限定自重，原教学可继续展示其他内容。

| 动作 ID | 位置 / 用量 | 必要条件 | 准备秒 / 预计秒 |
| --- | --- | --- | --- |
| `dumbbell-goblet-squat` | 膝主导；2×8，休 90 秒 | `basic-squat`, `dumbbell-control` | 60 / 214 |
| `functional-dumbbell-romanian-deadlift` | 髋主导；2×8，休 90 秒 | `hip-hinge`, `dumbbell-control` | 60 / 214 |
| `seated-leg-press` | 膝主导；2×8，休 90 秒 | `leg-press-setup` | 90 / 244 |
| `seated-leg-curl` | 屈膝辅助；2×8，休 60 秒 | `seated-curl-setup` | 90 / 214 |
| `legs-prone-leg-curl` | 屈膝辅助；2×8，休 60 秒 | `prone-curl-setup` | 90 / 214 |
| `legs-calf-raise` | 小腿辅助；仅自重无扶双脚，2×8，休 60 秒 | `balance-standing` | 30 / 154 |
| `legs-bulgarian-split-squat` | 膝主导；仅自重，每侧 2×8，每轮休 90 秒 | `split-stance`, `rear-support-stable` | 30 / 278 |
| `legs-hip-adduction` | 内收辅助；2×8，休 60 秒 | `hip-adduction-setup` | 90 / 214 |
| `seated-leg-extension` | 伸膝辅助；2×8，休 60 秒 | `leg-extension-setup` | 90 / 214 |
| `chair-sit-to-stand` | 膝主导；仅自重，初学 2×5，其余 2×8，休 60 秒 | `chair-rise`, `chair-stable` | 30 / 130 或 154 |
| `floor-glute-bridge` | 髋主导；仅自重双腿，2×8，休 60 秒 | `floor-access` | 30 / 154 |
| `supported-calf-raise` | 小腿辅助；仅自重扶稳双脚，初学 2×5，其余 2×8，休 60 秒 | `support-stable` | 30 / 130 或 154 |
| `bodyweight-squat` | 膝主导；仅自重，2×8，休 90 秒 | `basic-squat` | 30 / 184 |
| `supported-split-squat` | 膝主导；仅自重且双脚在地，每侧 2×8，每轮休 90 秒 | `split-stance`, `support-stable` | 30 / 278 |
| `side-lying-hip-abduction` | 外展辅助；仅自重，每侧 2×8，每轮休 60 秒 | `floor-access` | 30 / 248 |
| `unloaded-hip-hinge` | 准备活动；仅徒手 1×10，无组间休息 | `hip-hinge` | 30 / 70 |

这些模板是健康一般训练的可选起点，没有固定公斤数或自动加重。处方允许因需要增加休息，要求不适时停止。它们不代表康复方案，也不保证某个用户能完成。

## 估时与替代规则

估时是计划预算：每次 4 秒，徒手或支撑物准备 30 秒、哑铃 60 秒、器械 90 秒，单侧每轮留 15 秒换侧。双侧完整一轮后才计算一次组间休息。公式为：

```text
sets × reps × 4 × (perSide ? 2 : 1)
+ max(0, sets − 1) × restSeconds
+ setupSeconds
+ (perSide ? sets × 15 : 0)
```

计划引擎另外加入动作之间每次 30 秒。上述数字是产品调度假设，并不是文献验证的时长、强制节拍或动画播放速度；多休息或设置器械更慢时会超出预计。动画仍表达动作路径与关键姿态。

替代图完整对称：坐站／徒手深蹲／高脚杯深蹲／腿举／扶稳分腿蹲／保加利亚分腿蹲同属膝主导组；RDL／双腿臀桥同属髋主导组；两种腿弯举同组；有扶／无扶双脚提踵同组。髋内收、髋外展、器械伸膝和徒手髋铰链默认无替代。伸膝辅助不替代膝主导主练。候选替代仍须经过具体器材、经验、条件、组数结构及完整计划时长校验，不能把替代关系当作个人适用性的证明。

## 目录与教学的唯一来源

当前编辑源为 `Sources/SteadyCore/Resources/TrainingCollections/exercise-catalog.v2.json`；旧 v1 JSON、原 `exercise-catalog.ts` 与 v1 审查记录保持原字节。v2 含 104 个教学身份（原 97 + 新 7），去重为 92 个动作，39 个可编排、53 个仅学习，另有 4 个纯教学流程；41 种具体物件、15 条条件、42 个模板。新增可编排下肢身份为 16 个，其中 15 个有主练模板，1 个只有热身。

v2 保留既有上肢动作及模板的原语义。`lowerBodyBasics` 主练只允许选下肢位置字段，不能把上肢的 `approved` 当作本计划资格。原复杂单腿、复合协调、拉伸准备、设置讲解等未在本轮开放的课程仍留在学习区，详见生成清单。

执行 `node scripts/export-exercise-catalog.mjs` 只生成 v2 TypeScript 和 v2 审查记录；执行 `node scripts/export-exercise-catalog.mjs --check` 比较派生内容，并检查历史冻结摘要。脚本仅读取教学、课程和清单，不调用动画构建、不重写课程。`node --test scripts/exercise-catalog.test.mjs` 验证引用覆盖、版本继承、模板唯一性、条件、器材、估时、替代图与生成摘要。教学资源若再次改变，需重新导出 v2 审查摘要。

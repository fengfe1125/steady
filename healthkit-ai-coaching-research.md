# HealthKit + AI 报告、身体问答与训练计划专项调研

日期：2026-09-21  
目标：评估“读取 Apple Health 数据 → AI 生成报告 → 用户询问当前身体状态 → AI 安排训练计划”的产品和技术可行性。

## 结论先说

**可以做，而且比单纯的 HealthKit 数据看板更有产品价值。** 但产品边界要这样定义：

> AI 负责解释已授权、已计算、带来源的数据，并把用户的训练目标转成可执行的计划草案；它不负责诊断疾病，也不应该直接根据几个心率或睡眠数字宣布“身体异常”。

推荐的最终形态是：

```text
HealthKit / 用户手动输入
        ↓
本地数据清洗、去重、按日聚合
        ↓
用户明确同意后，发送最小化的结构化摘要给 AI
        ↓
AI 输出结构化报告 / 问答 / 训练计划草案
        ↓
规则校验 + 风险拦截 + 用户确认
        ↓
展示，或通过 WorkoutKit 加入 Apple Watch 训练日程
```

最大的新增风险不是 AI API 能不能调用，而是：

1. HealthKit 健康数据是否被明确同意后发送给第三方 AI 服务；
2. AI 的“身体现状”回答是否会被用户理解成医疗结论；
3. 训练计划是否可能造成过量训练、受伤或不适合已有疾病；
4. AI 是否只使用了当前真实数据，而不是凭上下文猜测；
5. API 数据留存、API Key、删除和 App Store 审核是否处理完整。

## 1. 三个功能分别能不能做

| 功能 | 技术可行性 | 产品风险 | 我的判断 |
|---|---:|---:|---|
| AI 每日身体/减脂报告 | 高 | 中 | 适合首先做 |
| 询问“我现在身体状态怎样” | 高 | 高 | 可以做，但必须是数据事实和个人趋势问答 |
| AI 自动安排训练计划 | 中高 | 高 | 可以做计划草案，必须经过规则校验和用户确认 |
| AI 诊断、判断疾病或代替医生 | 不应做 | 极高 | 明确排除 |
| 直接同步训练到 Apple Watch | 高 | 中 | 可用 WorkoutKit，作为计划确认后的执行层 |

Apple 明确鼓励 HealthKit 和 WorkoutKit 用来提供更个性化的健康、健身和训练体验；WorkoutKit 可以创建、预览和安排训练，并在用户授权后同步到 Apple Watch 的 Workout App。[Apple Health and Fitness Apps](https://developer.apple.com/health-fitness/) [WorkoutKit](https://developer.apple.com/documentation/workoutkit)

## 2. AI 每日报告应该怎么做

### 2.1 AI 不应该直接读取所有原始 HealthKit 样本

先在设备端生成一个 `DailyBodyRecord`，再把必要的摘要发给 AI。例如：

```json
{
  "period": "2026-09-21",
  "timezone": "Asia/Shanghai",
  "goal": "减脂并保持力量",
  "profile": {
    "age_band": "adult",
    "training_experience": "beginner",
    "available_days": 4,
    "equipment": ["bodyweight", "dumbbell"]
  },
  "metrics": {
    "weight_kg": {"value": 72.4, "source": "HealthKit", "observed_at": "..."},
    "weight_trend_14d_kg": -0.3,
    "steps": 7860,
    "active_energy_kcal": 420,
    "sleep_duration_min": 432,
    "workout_count": 1,
    "workout_minutes": 42
  },
  "data_quality": {
    "sleep": "complete",
    "nutrition": "missing",
    "weight": "partial"
  },
  "user_note": "今天感觉有点累"
}
```

不要默认发送：

- 每一条心率原始点；
- 完整睡眠阶段原始样本；
- HealthKit UUID、设备序列号、来源 App 标识；
- 不影响当前功能的临床记录、用药、位置路线；
- 用户没有主动同意的敏感属性。

AI 需要的是“已经聚合、已经标注来源和完整度的数据”，不是一堆原始健康数据。这样更省 API 成本，也更容易解释和删除。

### 2.2 报告输出必须结构化

建议 AI 不是直接返回一大段 Markdown，而是返回结构化对象：

```text
DailyReport
- headline                 一句话摘要
- observed_facts[]         事实，必须带 evidence_id
- personal_trends[]        与用户近期基线比较
- missing_data[]           明确缺失，不把缺失当 0
- possible_explanations[]  只能写成可能性
- next_actions[]           1～3 个低风险行动
- safety_notice            必要时提示咨询医生
- confidence               high / medium / low
```

OpenAI 的 Structured Outputs 可以让模型按 JSON Schema 输出；官方建议在需要固定数据结构时使用 `json_schema`，而不是只要求模型“返回 JSON”。模型连接本地数据查询、趋势计算或保存计划时，再使用 function calling。[Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) [Function Calling](https://developers.openai.com/api/docs/guides/function-calling)

Structured Outputs 只解决“输出形状”问题，不保证健康结论正确，也不保证模型一定会按 Schema 正常回答。模型可能因安全原因拒答，因此客户端还要处理 `refusal`、超时、截断、空字段和不完整计划，不能因为 JSON 能解析就直接展示或执行。

产品上的关键规则：

- 每一个结论必须引用报告中的数据证据 ID；
- 数据不足时必须返回 `insufficient_data`；
- 不允许 AI 修改原始 HealthKit 数值；
- AI 输出先经过 JSON Schema、范围和安全规则校验，再展示；
- 报告中显示“数据截止时间”和“数据来源”；
- 每日自动报告不需要每次 HealthKit 更新都调用 AI，建议每天最多生成一次，用户手动刷新才重新生成。

## 3. “问 AI 我身体目前的现状”应该如何实现

可以实现，但不要把它做成开放式的“AI 医生”。应做成“基于我的数据问答”：

### 推荐问答流程

```text
用户问题
   ↓
判断问题类型：趋势 / 活动 / 睡眠 / 训练 / 饮食 / 风险
   ↓
调用本地数据工具，取得相关时间窗口
   ↓
计算确定性的统计量和完整度
   ↓
AI 只解释这些结果
   ↓
安全规则检查后回复
```

AI 可调用的工具应该是受限的，例如：

```text
get_daily_record(day)
get_metric_trend(metric, days)
get_workout_history(days)
get_sleep_summary(days)
get_user_constraints()
draft_training_plan(input)
```

不要给 AI 一个可以任意查询全部 HealthKit 原始数据库的工具，也不要让模型直接执行“删除数据”“安排高强度训练”这类副作用操作。模型只能提出工具调用，真正执行由 App 的权限和业务代码决定。OpenAI 的 function calling 设计就是由应用提供工具、执行工具，再把结果交回模型；这适合把 HealthKit 和本地统计作为受控数据源。[Function Calling](https://developers.openai.com/api/docs/guides/function-calling)

### 可以回答的问题

- “我最近两周体重趋势怎样？”
- “我这周运动量和上周相比怎样？”
- “为什么今天不建议安排高强度训练？”——只能结合睡眠、近期训练量和用户主观疲劳解释为建议，不作医学判断。
- “我最近是否连续完成了力量训练？”
- “今天数据缺了什么？”
- “按照我有的器械和每周 4 天时间，给我一份训练草案。”

### 不应直接回答成确定结论的问题

- “我是不是心脏有问题？”
- “我的 HRV 低是不是生病了？”
- “我能不能停药/改药？”
- “我今天胸闷还可以继续训练吗？”
- “根据我的数据给我诊断。”

这类问题应停止推断，提示用户寻求专业医疗意见；出现胸痛、晕厥、严重呼吸困难等急性风险表述时，产品应进入明确的安全提示流程，而不是继续生成训练计划。

Apple 的 App Review Guidelines 对可能用于诊断或治疗的医疗类功能会重点审查，要求健康测量和准确性声明有可验证的方法，并建议用户在作出医疗决定前咨询医生。[App Review Guidelines 1.4.1](https://developer.apple.com/app-store/review/guidelines/)

OpenAI 的使用政策也限制在没有适当专业人员参与的情况下提供需要执照的个性化医疗建议；同时禁止促进自残或饮食失调行为。减脂产品尤其要避免极端节食、羞辱身体和危险运动提示。[OpenAI Usage Policies](https://openai.com/policies/usage-policies/)

OpenAI 服务条款也将服务定位为不用于诊断或治疗健康状况；如果产品进入诊断、治疗、康复或临床决策场景，就不能只靠提示词解决，需要专业人员、法规和产品责任评估。[OpenAI Service Terms](https://openai.com/policies/service-terms/)

## 4. AI 训练计划怎样设计才靠谱

### 4.1 AI 只负责“选择和解释”，不要负责所有安全判断

建议采用“训练库 + 规则引擎 + AI 编排”的组合：

```text
训练动作库
  - exercise_id
  - 目标肌群
  - 难度
  - 器械
  - 动作视频/说明
  - 禁忌和替代动作

规则引擎
  - 每周训练天数
  - 每次时长
  - 有氧/力量比例
  - 肌群恢复间隔
  - 初学者负荷上限
  - 连续缺席后的降级
  - 用户伤病/限制条件

AI
  - 从动作库选择
  - 排列顺序和表达方式
  - 解释为什么这样安排
  - 根据反馈提出下一周调整
```

AI 不应该自由发明动作、重量、训练量或恢复判断。它输出的应该是 `exercise_id`、组数、次数、时长、强度区间、休息时间和替代动作，由规则引擎校验后渲染。

### 4.2 训练基线可以来自公开指南

对一般成年、无特殊疾病的人群，可以把公开活动指南作为保守基线：每周 150—300 分钟中等强度有氧，或 75—150 分钟高强度有氧，并至少 2 天进行涉及主要肌群的力量训练。这个基线不能直接当作每个人的医疗处方，需要结合经验、目标、时间、器械、主观疲劳和限制条件逐步调整。[美国 Physical Activity Guidelines](https://odphp.health.gov/our-work/nutrition-physical-activity/physical-activity-guidelines/current-guidelines/top-10-things-know) [WHO physical activity guidance](https://www.who.int/europe/news-room/fact-sheets/item/physical-activity)

计划生成至少应先收集：

- 目标：减脂、体能、力量、跑步或保持；
- 年龄区间和训练经验；
- 每周可训练天数和单次时长；
- 场地和器械；
- 用户喜欢/不喜欢的运动；
- 近期训练历史；
- 主观疲劳、疼痛和睡眠情况；
- 伤病、慢性病、孕期/产后等需要转人工或医生确认的情况。

不建议只根据步数、体重和 HRV 自动决定训练强度。HealthKit 数据可以作为输入，但不能代替医学筛查或教练评估。

### 4.3 训练计划必须让用户确认

推荐的交互：

1. AI 生成“本周计划草案”；
2. 用户可以修改训练日、时长和动作；
3. App 显示每次训练的目标、强度、替代动作和注意事项；
4. 用户点击确认后，才保存计划；
5. 用户再次选择是否同步到 Apple Watch；
6. 训练完成后读取实际 Workout 和用户主观反馈；
7. 下一周只调整一个或少数几个变量，避免 AI 每次完全重写。

WorkoutKit 支持 `CustomWorkout`、单目标训练、配速训练和多项目训练，也支持创建日程并在用户授权后同步到 Apple Watch。[WorkoutKit](https://developer.apple.com/documentation/workoutkit) [WorkoutScheduler](https://developer.apple.com/documentation/workoutkit/workoutscheduler)

## 5. 远程 AI API 还是设备端 AI

### 方案 A：远程 AI API

优点：

- 复杂报告和多轮问答能力更强；
- 可以使用更长的历史趋势；
- 方便迭代提示词、模型和安全策略；
- 可以统一做结构化输出、审计和版本管理。

缺点：

- HealthKit 派生数据离开设备；
- 需要服务器中转；
- 需要明确第三方处理和保留政策；
- 需要承担 API 调用费用；
- 需要处理网络不可用和服务故障。

OpenAI 官方说明：API 数据默认不用于训练模型，但 API 默认会产生用于滥用监测的日志，通常保留最多 30 天；Responses API 的应用状态在默认或 `store=true` 情况下也可能保留至少 30 天。要尽量减少留存，应使用 `store: false`，不使用 Conversations、Files、Vector Stores 等会持久化数据的功能，并在产品隐私政策中如实说明。Zero Data Retention 需要符合资格并经过批准，不能假设普通 API 项目默认零留存。[OpenAI Data Controls](https://developers.openai.com/api/docs/guides/your-data)

如果使用远程 API：

- iOS App 不放 OpenAI API Key；
- 通过自己的轻量后端或 Cloudflare Worker 中转；
- API Key 放服务端 Secret；
- App 传递脱敏后的日摘要，不传原始样本；
- `store: false`；
- 不记录包含健康数据的请求/响应日志；
- 做请求频率和单用户用量限制；
- 提供“不要发送到 AI / 删除 AI 报告”入口；
- 报告保存优先留在设备端。

OpenAI 官方生产建议明确要求不要把 API Key 暴露在代码或公开仓库中。[Production best practices](https://developers.openai.com/api/docs/guides/production-best-practices)

### 方案 B：Apple Foundation Models 设备端模型

Apple 当前的 Foundation Models 框架提供设备端模型、结构化输出和工具调用；工具可以从 App 本地数据库或 HealthKit 取数据。它更适合每日摘要、简单趋势问答和本地化表达，不需要把原始健康摘要发给第三方 API。模型只在支持 Apple Intelligence 的设备上可用，而且官方文档说明单个会话有上下文大小限制。[Foundation Models](https://developer.apple.com/documentation/foundationmodels) [Tool Calling](https://developer.apple.com/documentation/foundationmodels/expanding-generation-with-tool-calling)

### 推荐方案 C：混合模式

```text
支持 Apple Intelligence 的设备
  → 默认本地生成每日摘要和简单问答

需要长历史、复杂计划或用户主动开启高级 AI
  → 用户单独同意后，发送最小化摘要到远程 AI API
```

这比“一上来把所有 HealthKit 数据上传给 AI”更符合 Apple 建议的设备端处理和端到端加密方向。[Apple Health and Fitness Apps](https://developer.apple.com/health-fitness/)

如果你想最快做出可用版本，可以先采用远程 API；如果你想把“隐私”做成产品卖点，后续加入设备端模型作为默认路径。

## 6. HealthKit 数据发送给第三方 AI 的审核重点

这部分不能简单理解为“OpenAI API 不训练，所以一定没问题”。Apple 的规则关注的是：健康数据是否被分享、分享给谁、用户是否明确同意、用途是否直接服务于用户，以及是否清晰披露。

Apple 官方说明要求：

- 用户逐类授权 HealthKit 读取/写入；
- 不得把健康数据用于广告、营销或基于使用的数据挖掘；
- 未经用户明确同意不得披露给第三方；
- 即使用户同意，分享对象也应为向用户提供健康或健身服务的第三方；
- 需要隐私政策；
- 只申请核心功能需要的数据；
- 能在设备端处理时尽量在设备端处理，并尽可能使用端到端加密。

[Protecting User Privacy](https://developer.apple.com/documentation/healthkit/protecting-user-privacy) [HealthKit HIG](https://developer.apple.com/design/human-interface-guidelines/healthkit) [Apple Health and Fitness Apps](https://developer.apple.com/health-fitness/)

因此产品里要有两个不同的同意动作：

1. **HealthKit 权限**：允许 App 读取步数、体重、睡眠等。
2. **AI 数据发送同意**：允许 App 把哪些已聚合数据发送给哪个 AI 服务，用来生成报告和计划。

第二个同意页不能只写“开启 AI 功能”，应该写清楚：

```text
将发送：近 14 天体重趋势、步数、睡眠时长、训练记录和你主动填写的目标/限制。
不会发送：HealthKit 原始心率序列、位置路线和未选择的健康类型。
用途：生成个人减脂报告、回答相关问题、生成训练计划草案。
第三方：AI 服务提供商。
保留：说明 API 日志/应用状态保留情况和本 App 的删除方式。
```

这仍然需要在实际提交前结合目标地区、隐私政策和 App Review Notes 做法律/审核复核。Apple 没有一个“AI API 自动获批”的单独例外。

## 7. 安全架构建议

```text
iOS App
├─ HealthKit Reader
├─ Local Aggregator
├─ Local DailyRecord Store
├─ Consent & Redaction Gate
├─ Safety Rules / Risk Screen
└─ AI Client（只访问自家后端，不带供应商密钥）

自家后端
├─ Authentication / anonymous device session
├─ Rate limit / quota
├─ Prompt and schema versioning
├─ AI provider adapter
├─ Structured output validator
├─ Safety and moderation checks
└─ No raw HealthKit logging

可选：WorkoutKit
└─ 用户确认后创建和同步训练日程
```

AI 输出建议经过四道检查：

1. JSON Schema 校验；
2. 数值和业务规则校验，例如训练日、总时长、组数、休息间隔；
3. 风险词和医疗结论拦截；
4. 高风险问题转人工/医生建议，不生成强行动指令。

OpenAI 官方安全建议包含 Moderation API、对抗测试和高风险输出的人在回路；可以用这些原则设计你的输入/输出安全层。Moderation API 支持检测文本和图像中的多类潜在有害内容。[Safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices) [Moderation](https://developers.openai.com/api/docs/guides/moderation)

## 8. 推荐的产品分阶段

### Phase 1：确定性每日记录，不接 AI

- HealthKit 读取体重、步数、睡眠、Workout、活动能量；
- 本地生成 `DailyBodyRecord`；
- 显示来源、时间、完整度和个人趋势；
- 用假数据和真机数据验证日界线、延迟、删除、多来源。

### Phase 2：AI 每日报告

- 用户主动点击“生成今日报告”；
- 只发送日聚合摘要；
- `store: false`；
- Structured Outputs；
- 输出事实、趋势、缺失、下一步行动；
- 支持用户删除 AI 报告；
- 不做健康评分和疾病判断。

### Phase 3：基于数据的 AI 问答

- function calling 访问本地统计工具；
- 每个问题只读取必要时间窗口；
- 显示“数据截止时间”和证据；
- 询问医疗问题时转安全提示；
- 记录匿名的质量指标，不记录原始健康数据。

### Phase 4：训练计划草案

- 动作库和规则引擎先建立；
- AI 只能选择受控动作 ID 和训练参数；
- 用户填写训练经验、器械、时长和限制；
- 用户确认后保存；
- 训练完成后读取 Workout 反馈；
- 只在用户再次确认后使用 WorkoutKit 同步 Apple Watch。

### Phase 5：设备端 AI / 混合模式

- 支持 Apple Intelligence 的设备优先本地处理；
- 远程 API 作为明确 opt-in 的增强能力；
- 让用户看到“本地生成”还是“云端 AI 生成”；
- 提供关闭云端 AI 后仍可用的基础记录功能。

## 9. 这个方向是否值得做

值得，但差异点不应该是“我也接了 GPT”。市场上任何 App 都可以接 AI，真正有价值的是这四件事：

1. HealthKit 数据自动进入，不要求用户每天手动填表；
2. AI 的每句话都能追溯到用户自己的数据；
3. 计划能落到动作、时间和 Apple Watch，而不是泛泛地说“多运动”；
4. 数据默认留在设备上，云端 AI 是可关闭、可解释、可删除的增强功能。

我的最终定位建议：

> 一个“数据有依据、计划能执行、隐私可控制”的 Apple Health 减脂教练，而不是 AI 医生。

对于不盈利的个人项目，最合理的开发顺序是：

```text
HealthKit 日记录
  → AI 日报
  → 基于数据的问答
  → 训练计划草案
  → WorkoutKit / Apple Watch 执行
```

不要第一天就做“AI 判断身体状况 + 自动安排高强度训练”。先把数据完整度和可解释性做好，AI 只做最后一层表达和个性化编排。

## 10. 验收标准

- [ ] App 没有把 OpenAI/API Key 放进 iOS 包。
- [ ] HealthKit 权限和“发送给 AI”同意是两套独立流程。
- [ ] AI 请求只包含允许发送的聚合字段。
- [ ] API 请求关闭不必要的持久化，并且没有健康数据日志。
- [ ] 报告中的事实都能定位到本地数据证据。
- [ ] 缺失数据不会被解释为 0。
- [ ] AI 无法修改原始 HealthKit 数据。
- [ ] AI 无法绕过用户确认直接同步或增加训练。
- [ ] 训练计划只使用动作库中的合法动作和参数范围。
- [ ] 伤病、慢性病、孕期/产后、高风险症状有降级或转专业建议。
- [ ] 用户可以关闭云端 AI，基础 HealthKit 日记仍可使用。
- [ ] 远程 API 不可用时，App 仍能查看本地日报和历史记录。
- [ ] 使用真机测试 HealthKit；使用合成数据测试 AI，不把真实健康数据写入测试日志。
- [ ] App Review Notes 中说明 HealthKit、AI 数据流、隐私政策和训练计划的安全边界。

## 官方资料

- [Apple Health and Fitness Apps](https://developer.apple.com/health-fitness/)
- [HealthKit privacy](https://developer.apple.com/documentation/healthkit/protecting-user-privacy)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [WorkoutKit](https://developer.apple.com/documentation/workoutkit)
- [Apple Foundation Models](https://developer.apple.com/documentation/foundationmodels)
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI Function Calling](https://developers.openai.com/api/docs/guides/function-calling)
- [OpenAI Data Controls](https://developers.openai.com/api/docs/guides/your-data)
- [OpenAI Safety Best Practices](https://developers.openai.com/api/docs/guides/safety-best-practices)
- [OpenAI Moderation](https://developers.openai.com/api/docs/guides/moderation)
- [OpenAI Usage Policies](https://openai.com/policies/usage-policies/)
- [OpenAI Service Terms](https://openai.com/policies/service-terms/)
- [Physical Activity Guidelines for Americans](https://odphp.health.gov/our-work/nutrition-physical-activity/physical-activity-guidelines/current-guidelines/top-10-things-know)
- [WHO physical activity recommendations](https://www.who.int/europe/news-room/fact-sheets/item/physical-activity)

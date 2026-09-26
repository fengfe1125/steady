# Steady 第一阶段架构与页面契约

状态：架构与演示实现已落地；验收结果单独记录在 implementation-status.md。最低 iOS 18，简体中文，iPhone 优先。

## 边界

第一阶段仅处理固定虚构数据。不链接 HealthKit、Supabase 或 AI SDK，不弹真实健康授权，不发送网络请求。所有报告、消息和训练草案标记「演示数据 · 非医疗建议」。原生 Sign in with Apple 仅展示后续接入说明，不模拟系统授权成功。

依赖方向：SwiftUI 页面 → 可观察的功能状态 → 服务协议 / 仓储 → Demo 或 SwiftData。Domain 不依赖 SwiftUI 或第三方 SDK。App 负责构造注入，页面不可自行实例化网络客户端。

## 模块

| 目录 | 内容 |
|---|---|
| Steady/SteadyApp.swift、AppModel.swift、RootView.swift | App 入口、构造注入、四 Tab、导航与请求状态 |
| Steady/DesignSystem.swift、Assets.xcassets | 语义颜色、Dynamic Type、卡片、演示标识 |
| Sources/SteadyCore/Domain.swift | Codable / Sendable 值类型、缺失数据、证据引用、草案状态 |
| Sources/SteadyCore/Services.swift | 健康、账户、同步、教练的异步协议与错误 |
| Sources/SteadyCore/LocalPlanRepository.swift、Journal.swift | 两个本地 SwiftData 仓储，CloudKit `.none` |
| Sources/SteadyCore/DemoServices.swift | 固定30天数据、延迟/失败/离线场景、可取消流 |
| Steady/Plans.swift、TrendsCoach.swift、SettingsOnboarding.swift | 按功能分组的原生页面 |

## 页面与状态矩阵

| 页面 | 数据来源 | 操作与下一站 | 关键状态 |
|---|---|---|---|
| 欢迎/目标 | UserPreferences | 保存目标、继续连接说明 | 首次使用、可跳过 |
| 健康连接说明 | Demo 能力说明 | 继续、稍后设置 | 未连接，不伪造授权 |
| 账户/云同步/AI | AuthService、独立偏好 | 浏览演示、查看数据用途 | 未接入、三个独立开关 |
| 今天 | HealthDataService、PlanRepository | 报告、补记、训练、设置 | 加载、缺失、离线缓存、失败重试 |
| 日报详情 | CoachService、DailySummary | 展开依据、追问教练 | 生成中、取消、失败、成功 |
| 趋势 | 30 天 DailySummary | 7/14/30 天切换、选择指标 | 无数据、部分缺失、正常 |
| 历史日报 | 本地报告索引 | 阅读选定日期报告 | 空列表、已生成 |
| 教练列表 | 本地 Conversation | 新会话、继续会话 | 空列表、离线可读 |
| 聊天详情 | CoachService、消息/证据 | 发送、停止、重试、生成计划 | 流式生成、取消、失败、缺失上下文 |
| 计划表单 | UserPreferences | 填目标/经验/器械/时间/限制 | 验证错误、生成中、取消 |
| 草案 | CoachService 返回值 | 改动作/日期、确认 | 未确认、编辑、保存失败 |
| 本周计划 | PlanRepository | 查看训练、创建草案 | 空计划、进行中、已完成 |
| 训练详情 | WorkoutSession | 替换动作、调整日期、反馈 | 待完成、已完成 |
| 训练反馈 | WorkoutSession | 保存强度、完成情况、备注 | 编辑、保存成功、保存失败 |
| 设置 | UserPreferences、模拟场景 | 三开关、场景选择、重置 | 确认重置、持久化失败 |

## 数据约束

- 记录包含稳定 UUID、createdAt、updatedAt、source、schemaVersion；日摘要另有 dayKey 和 timeZoneID。演示日期固定为 2026-08-23 至 2026-09-21，不随系统日期漂移。
- 指标以可选值表示缺失，绝不把无睡眠/体重样本当作 0。趋势只绘制有效值，使用点图避免跨缺失日期插值。
- HealthReport 包含数据观察、个人趋势、缺失信息、下一步建议。观察关联 EvidenceReference（摘要 ID、指标、日期、值、来源）。
- Conversation 保存 ChatMessage；消息区分用户/演示教练、生成中/完成/取消/失败。停止后保留已生成内容并标记未完成。
- TrainingPlan 区分 draft/confirmed；确认前不可进入正式计划。WorkoutSession 保存日期、动作、完成状态、主观强度和备注。
- UserPreferences 中健康读取、云同步、AI 处理互不自动开启；第一阶段设置只用于演示，不代表已授权或已上传。

## 服务接口语义

| 协议 | 操作 | 约束 |
|---|---|---|
| HealthDataService | 读取日期范围摘要/可用性/来源 | 不混淆无数据与授权状态 |
| AuthService | 读取状态、登录、退出、账户删除请求 | 演示返回 notConfigured，不伪造 Apple 凭证 |
| SyncService | 状态、同步、重试、恢复历史 | 第一阶段 no-op / notConfigured；不能宣称已同步 |
| CoachService | 生成报告、流式答复、生成草案 | async throws，响应取消；输出明确 demo 来源 |
| PlanRepository | 查询、保存、修改、删除计划/反馈 | 保存失败向 UI 传播；成功必须落盘 |

## 本地存储与任务生命周期

SwiftData 只保存演示可变状态；使用显式 ModelConfiguration(cloudKitDatabase: .none)。首次启动幂等播种，后续启动读取现有记录。重置需要确认，只清空本应用演示记录并重新播种。存储初始化失败展示恢复说明，不静默改用内存导致用户误以为已保存。

报告、聊天和草案任务由 AppModel 持有，一次只运行一个请求。取消和离开聊天/生成表单会停止对应生成；切换主 Tab 时仍可在状态区域取消报告。新请求使用独立 requestID，结果落盘前检查 Task 取消状态。重新发送问题是一条新的用户消息，不伪装为原请求幂等重试；未来网络幂等由后端契约实现。离线时本地历史与计划编辑可用，模拟生成返回可理解错误。

## 验收门槛

1. Figma 主流程连通，并截图检查主屏、长文、状态、深色、小屏和大字号。
2. 无配置启动原生 App；执行日报 → 问答 → 草案修改确认 → 反馈。
3. 终止重启后计划、反馈和备注仍存在；重置后恢复固定样例。
4. 单测验证缺失值、取消/失败、保存/重读；UI 测试验证主流程、离线。
5. 构建、单测、UI 测试、模拟器视觉验收和真机结果分别记录，不以构建成功代替验收。

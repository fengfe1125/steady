# 下肢基础训练：生产与手机交付

更新日期：2026-10-12（Asia/Shanghai），本轮部署从 2026-10-11 开始。生产后端兼容迁移及函数已部署，新版 App 已安装到 iPhone 17。用户已确认信任开发者并能打开 Steady，设备进程也已核实。普通 v1、自重、哑铃和健身房四个场景均已有真实 AI 成功样例，通过目录、模板、条件、日期与预算校验。各次失败和重测结果均保留，不把成功样例等同于模型每次都能成功。

## 你现在怎样查看

1. 打开手机上的 Steady，进入 **计划 → 安排下肢基础训练**。
2. 选择自重、哑铃或健身房，勾选实际可用的器材。椅子、固定支撑需要明确选择。
3. 按自身情况填写“能完成／不确定／不能完成”。不确定可先看教学，再自行决定；看完动画不会自动确认能力。
4. 点击 **生成训练草案**，查看每个动作的示范与安排理由；可以替换动作、调整日期，再确认计划。
5. 重新打开已确认计划及动作教学；关闭并重开 App，核对计划和教学关联仍在。

真实 AI 生成需要登录并开启“AI 处理”；云端同步由“云端同步”单独控制。若按钮显示“生成草案（演示）”，当前处于演示模式。

## 当前交付状态

| 项目 | 结果 | 证据 |
|---|---|---|
| 生产数据库备份 | 已加密，权限 0600；解密检查与隔离恢复通过 | [backup.json](verification/lower-body-production-20261011/backup.json) |
| 兼容迁移 | 两条新迁移已应用 | [migrations.log](verification/lower-body-production-20261011/migrations.log) |
| Edge Functions | 最终修复已部署：`plan-draft` v7、`report` v6；`consents`、`sync-push`、`sync-pull`、`chat` v5 | [最终版本与源码校验](verification/lower-body-production-20261011/production-final-state.json)；全部函数 ACTIVE，JWT 校验开启 |
| 关闭开关的验证 | 4 项检查通过；v2 返回 `lower_body_disabled`，真实 AI 请求数 0 | [gate.json](verification/lower-body-production-20261011/gate.json) |
| 生产同步兼容 | 45 项检查全部通过，真实 AI 请求数 0 | [sync.json](verification/lower-body-production-20261011/sync.json) |
| 生成开关 | v1 和下肢 v2 均已设为 true | [feature-flags.json](verification/lower-body-production-20261011/feature-flags.json) |
| 真实 AI：v1 | 已返回 HTTP 200，通过目录、模板、预算、角色和日期校验 | [live-initial-failure.json](verification/lower-body-production-20261011/live-initial-failure.json) 中 v1 通过项；该整轮随后因自重失败而失败 |
| 真实 AI：三个下肢场景 | 自重、哑铃均成功；健身房一次输出被拒后，单独重复一次成功；成功结果全部通过规则校验 | [成功样例汇总](verification/lower-body-production-20261011/acceptance-summary.json)、[三场景轮次](verification/lower-body-production-20261011/live-final-gym-rejected.json)、[健身房确认](verification/lower-body-production-20261011/live-gym-confirmation.json) |
| 修复后 Deno 回归 | 29 项全部通过，含完整 HTTP 处理边界的输出错误分类 | [deno-final.log](verification/lower-body-production-20261011/deno-final.log)、[output-classification.log](verification/lower-body-production-20261011/output-classification.log) |
| iPhone 构建及安装 | Debug 构建成功，`com.jiwo.steady` 安装成功 | [device-build-summary.log](verification/lower-body-production-20261011/device-build-summary.log)、[device-install.json](verification/lower-body-production-20261011/device-install.json) |
| 签名、信任与启动 | 签名及设备授权通过；用户确认能打开；运行进程 30283 已核实 | [device-acceptance.json](verification/lower-body-production-20261011/device-acceptance.json)、[device-processes.json](verification/lower-body-production-20261011/device-processes.json) |
| 安装包资源 | v1/v2 目录、七个新增教学页面及共享动画渲染器与源码哈希一致 | [device-resources.json](verification/lower-body-production-20261011/device-resources.json) |
| 手机完整逐页操作验收 | 用户可按上述流程继续验收，尚未记录完整真机操作录像 | [device-acceptance.json](verification/lower-body-production-20261011/device-acceptance.json) |

两条迁移分别为 `20261010064146_plan_catalog_compatibility` 和 `20261010081625_movement_conditions_compatibility`。`cloud-clear`、`account-delete` 源码未改变；开启 secrets 时服务自动滚动为版本 4，初次查询记录的是此前版本 3。本轮没有恢复生产数据库或重写历史计划。

## 手机安装配置

本次安装使用 **Debug 开发签名**。配置文件有效期至 **2026-10-18 23:19:49（北京时间）**，对应设备回执中的 `2026-10-18T15:19:49Z`。届时需要重新签名安装，或另行通过长期分发渠道交付。

首次自动启动因设备尚未信任开发者而被拒绝；签名和设备授权已验证有效。用户完成信任后确认可以打开，随后读取设备进程列表确认 Steady 正在运行。原始启动失败回执保留，不把它改写成自动启动成功。当前回执未提供独立版本号和构建号，因此本报告以安装时间、Bundle ID、资源哈希和设备安装回执定位本次构建。

## 数据保护与兼容验证

部署前的加密备份已保存于 `/Users/sakura/Documents/SteadyBackups/lower-body-20261011/steady-hosted-20261011T152206Z.tar.gpg`。隔离恢复确认包含 1 个 Auth 用户、46 条业务记录、6 条同意事件以及 3 个同步相关函数；未轮换或删除既有备份。

生产同步验收使用临时合成账号，仅操作其自身记录，覆盖：

- 旧版修改日期、反馈，保留教学和模板引用。
- 修改处方，保留教学并清除当前模板；修改动作名称，清除原教学关联。
- 明确 `null` 清除动作或条件字段；缺省字段保留旧端不认识的扩展内容。
- 同一场景保存偏好时保留器材；场景变化时清除旧器材选择，同时保留条件记录。
- 重新拉取变更后，恢复目标 session 的最终版本 6 及动作关联。

首次同步验收曾误要求每个 UUID 只在拉取结果中出现一次。现有 RPC 按变更流返回，重复变更可关联同一条当前记录。该问题已修正于验收脚本，随后 45 项检查通过；后端协议没有因此修改。说明与本地反例见 [acceptance-method.md](verification/lower-body-production-20261011/acceptance-method.md)。

全部轮次共创建九个合成账号，均已注销、删除，并确认各账号不存在且其业务记录为空。[最终数据库查询](verification/lower-body-production-20261011/final-cleanup-query.json)确认 Auth 用户 1、剩余合成账号 0、业务记录 50。部署期间用户手机已打开并同步，不能将备份时的 46 条与当前 50 条表述为数量完全未变。验收临时服务端凭据文件已删除，浏览器工作区已关闭；原项目密钥未修改。

## 真实 AI 联调发现与修复

首次生产真实调用中，v1 返回成功，自重下肢请求返回 HTTP 400，该轮停止后续场景。原始生产失败当时只保存了状态码，没有捕获远端模型正文。随后单场景复验记录到 HTTP 400 / `invalid_input`，证据分别保留在 [live-initial-failure.json](verification/lower-body-production-20261011/live-initial-failure.json) 和 [live-prompt-only-failure.json](verification/lower-body-production-20261011/live-prompt-only-failure.json)。

诊断先确认请求边界：无 AI 同意的自重、哑铃和 v1 合成请求均通过输入与候选校验，再返回 HTTP 409 / `consent_required`，没有调用模型。同期获取的生产计划函数源码与本地文件一致。见 [request-stage-probe.json](verification/lower-body-production-20261011/request-stage-probe.json) 和 [remote-plan-source-check.json](verification/lower-body-production-20261011/remote-plan-source-check.json)；后者记录中间版本 v6 的一致性检查。

使用相同合成资料与当时提示配置，在本地直接调用真实模型复现了两类输出错误：

- 一次输出超过初学者 8 个工作组，另一场把 `walk` 同时用于热身和整理。现有规则正确拒绝，返回 `invalid_output`。见 [model-reproduction.json](verification/lower-body-production-20261011/model-reproduction.json)。
- 一次把髋铰链的动作功能 `preparation` 填进 `role`，触发输出形状校验；`role` 实际仅允许 `warmup`、`main`、`cooldown`。见 [model-reproduction-after-prompt.json](verification/lower-body-production-20261011/model-reproduction-after-prompt.json)。该 Zod 错误此前会被通用处理误报为输入错误 400，能够解释同类现象，但不能等同于已捕获原生产请求的精确远端轨迹。

最终修复保持目录、用量和严格编排边界：

1. 提示附带程序已验证的完整基础组合，明确工作组相加、跨角色同 ID 重复，以及已筛选候选的含义。
2. 仅发送给模型的主练分类字段改名为 `mainPattern`；非主练不附该分类，明确髋铰链教学应使用 `role: warmup`。内部目录和 `trainingSlot` 校验不变。
3. 只在模型与输出处理范围内，把 JSON 解析和输出形状的 `SyntaxError`、`ZodError` 转为 `invalid_output` / HTTP 502。用户输入错误仍为 400；模型明确返回 `unavailable` 时仍保留 `plan_conditions_insufficient` / 400。
4. 完整处理边界的测试覆盖上述角色混淆、模型 JSON／plan／report 形状、用户坏 JSON／字段、`unavailable` 及失败记账。29 项 Deno 测试全部通过后再部署。

验收脚本另增安全错误码记录和指定场景选项，记录 `selectedScenes`、`syncSkipped` 和每次请求状态。最终下肢重测使用 `--scenes bodyweight dumbbells gym --skip-sync`：自重、哑铃成功，健身房返回 `invalid_output` / 502。相同配置的本地健身房诊断返回合规结果，随后只重复一次生产健身房请求，成功并通过完整校验；没有自动重试或更改严格规则。这些轮次引用已经通过的同步回执，不把跳过同步算作重新验证。

## 最终真实样例及剩余边界

| 场景 | 成功计划中的基础动作 | 每场预计时间 |
|---|---|---|
| 自重 | 椅子坐站＋基础双腿地面臀桥 | 15 分钟 |
| 哑铃 | 高脚杯深蹲＋双哑铃罗马尼亚硬拉，含髋铰链热身 | 19 分钟 |
| 健身房 | 坐姿腿举＋基础双腿地面臀桥，含髋铰链热身 | 18 分钟 |

三个下肢成功样例均含热身和整理，每周两次、间隔三个当地日历日；时间来自程序模板而非动画循环。健身房最后还验证未回答、旧版本和“不确定”条件被拒绝，均发生在模型调用之前。

合计七次托管真实生成请求，四次成功、三次被拒；另有三次直接模型诊断调用。这是有限联调记录，不能据此声称稳定性已经达到某个成功率。最终版本仍观察到一次健身房不合规输出被拒，用户可能遇到生成失败后需要重试；没有用固定演示计划冒充真实 AI，也没有放宽处方和编排限制。

真机已安装、完成信任并运行；完整真机逐页操作、手机网络离线恢复及长期稳定性尚未记录验收。模拟器的完整教学与替换验收仍以原本地报告为准。

生产安全检查保留六条 private 表未配置 RLS policy 的 INFO（这些表不授予客户端访问），以及既有的泄漏密码保护未开启 WARN。后者的[官方说明](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)供后续账户配置参考；本次没有修改 Auth 设置或套餐，未发现本次迁移新增的安全检查项。

## 关闭新版生成时

优先把 `STEADY_LOWER_BODY_ENABLED` 改为 `false`，停止新建下肢 v2 草案。继续保留已部署的兼容迁移、版本解析、教学资源以及读取和同步能力，避免已生成计划丢失关联。若仅下肢 v2 出现问题，不需要同时关闭既有 v1 生成。

生产备份用于经确认的数据恢复情形，日常回退不执行数据库回滚或旧计划批量改写。

开发阶段的动作证据、动画、自动测试和模拟器记录仍见 [本地交付报告](lower-body-delivery.md) 与 [动作来源及采纳理由](lower-body-evidence.md)。本报告只补充本轮生产与手机的实际结果。

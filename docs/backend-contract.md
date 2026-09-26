# Steady 实际后端契约

版本1，2026-09-23；本地已验证，托管尚未部署。运行说明与验收边界见 [live-development.md](live-development.md)。

## 身份、编码和授权

所有 `/functions/v1/*` 路由使用 POST JSON、Bearer Supabase 用户 JWT 和公开 apikey。客户端仅通过 Edge 写业务数据，不能直接修改版本、请求状态、配额或授权记录。Edge 验证用户后从 JWT 取得 session_id；数据库进一步要求会话属于该用户且尚未撤销。账户删除处理中拒绝新业务操作。

JSON 为 camelCase，UUID 字符串、日期为 Unix **毫秒**。Swift 编解码集中在 WireCodec。正文限制512KiB，未知字段或不合规来源拒绝。客户端旧 DemoScenario 不出现在生产协议中。

DeviceConsent：`{deviceID, revision, healthRead, cloudSync, aiProcessing, policyVersion:"2026-09-23"}`。revision 单调增加，同一版本不能更改布尔值。服务端拒绝旧授权恢复新操作；本地断网关闭立即停止任务，联网后传递撤回。

当前账户提供邮箱 OTP；Supabase Auth 的 `/otp` 和 `/verify` 由固定 Swift SDK 调用。Apple 登录适配器暂不启用。

## 数据与同步

公开表 `records`：`user_id, id, kind, logical_id, parent_id, payload, version, deleted, created_at, updated_at`。kind 为 profiles / summaries / reports / conversations / messages / plans / sessions / notes，保留原契约各业务实体语义；`consent_events` 保存授权审计。两表启用 RLS，仅账户本人读取，客户端无直接写权限。

私有表保存账户锁和游标、变更、修改去重、每设备授权、AI请求元数据、删除任务。所有公开 RPC 只向 service_role 授权，传入的 uid/sid 来自已验证身份；私有函数固定 search_path。复合外键 `(user_id,parent_id)` 及父 kind 检查防止跨账户引用。

CloudRecord：`{id, kind, logicalID, parentID?, payload, version, deleted}`，payload 是领域JSON字符串。记录 ID 稳定；同账户、kind、logicalID 仅允许一条未删除记录。摘要 logicalID 是日期与时区组合，补记按日期，其他实体按稳定ID。

PendingMutation：`{id, record, attempt, retryAt}`；record.version 为基础版本。客户端保存与入队同一个 SwiftData 事务；云端确认当前修改ID后才出队。较新的本地修改保留。冲突停止该记录重试，由用户选择；删除标记永不被旧ID复活，恢复副本创建新ID。账户删除前保留所有 tombstone。

| 路由 | 输入 | 输出 |
|---|---|---|
| consents | DeviceConsent | `{accepted:true}` |
| sync-push | `{mutation,consent}` | `{record,conflict}`，含服务端版本 |
| sync-pull | `{cursor,consent}` | `{records,cursor,hasMore}`，每页最多100条 |
| cloud-clear | `{confirmation:"delete-cloud-records"}` | `{deleted:true}`，全部记录改为删除标记、缓存正文清除 |

游标是服务端单账户递增序列，不使用设备时钟。两设备同基础版本只能一个成功。父记录删除级联子 tombstone。清除本机与删除云端独立，退出保留原账户分区；游客归入账户须在 App 明确确认。

## AI

共同输入：`{requestID,schemaVersion:1,consent,summary?,history:[],question?,messages:[],preferences?,today,timeZoneID}`。history最多30条、messages最多12条；完整 schema 以 `_shared/schema.ts` 为准。输入摘要直接随请求提供，因此允许关闭同步单独使用AI；证据校验针对该次输入快照，不能声称已由苹果服务端证明。

| 路由 | 结果 |
|---|---|
| report | HealthReport，四节固定为数据观察/个人趋势/缺失信息/下一步建议，包含摘要ID及版本、指标值来源 |
| chat | `text/event-stream`：`delta` data为`{text}`，`evidence` data为引用数组，`complete` data为`{}`，`error` data为错误对象 |
| plan-draft | TrainingPlan，status始终draft；7天内、内置目录、器械与时间校验，有限制拒绝自动编排 |

模型由服务端 DEEPSEEK_MODEL 配置，默认 deepseek-flash、非思考；日报/草案 JSON 模式。统计由程序计算，模型仅解释；定量观察和趋势正文由程序生成。客户端验证引用与摘要版本/数值一致。SSE中断保留已收内容为未完成，用户显式重试才建立新请求。

每账户上海日界：report3、chat30、plan-draft3；单并发生成，120秒占用租约，模型请求90秒超时。requestID永久去重，不再次调用供应商；响应丢失需用户主动新请求。服务端不缓存AI正文，客户端持久化后仅在同步开启时上传。日志只保存模型/用量/状态等元数据，无健康或聊天正文。

## 删除账户

邮箱账户输入 `{emailCode}`。服务端针对已认证账户的邮箱验证一次性验证码，匹配相同userID，标记删除中后删除 auth.users，级联清除会话及业务数据。错误返回待处理状态，不提前显示完成。Apple关联账户不能用邮箱路径绕过授权撤销；保留 Apple idToken/authorizationCode/nonce 路径但当前 App 不启用。

错误：401 unauthenticated；409 consent_required/account_deleting/request_in_progress/duplicate_request；429 rate_limited；400 invalid_input/insufficient_data；502 invalid_output；503 provider_unavailable/deletion_pending。客户端显示本机记录仍保留，不输出服务商原始错误或敏感正文。

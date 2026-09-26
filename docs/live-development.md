# 真实功能开发与验收（2026-09-24）

本地功能和可选 Supabase 后端已实现。云端接口与签名模拟器主流程验收已完成；真机 HealthKit 和跨设备恢复仍待验证。

## 已实现

- 默认真实模式，`--demo` 才进入旧演示；两套 SwiftData 存储独立。游客及账户分区，游客归入账户需明确确认。
- HealthKit 只读体重、睡眠、步数、Apple 运动分钟。首次30天，刷新近7天并利用锚点处理旧样本修改/删除；空值保留、睡眠区间去重并按醒来日期归档。来源、时区、计算版本保留。
- 摘要、日报、会话、补记、训练与反馈逐条保存；本机修改与 outbox 同事务。服务端版本、去重、增量游标、冲突选择、删除优先及恢复新记录。
- 三个独立开关默认关闭；真实模式不继承演示偏好。前台/联网同步、退避、退出取消任务，账户分区不串用。
- 邮箱 OTP 登录、Keychain 会话、退出、邮箱二次验证删除账户；保留 Apple 适配器代码但不装配、不要求 Apple 登录签名能力。
- 8个 Edge Functions：consents、sync-push、sync-pull、report、chat、plan-draft、account-delete、cloud-clear。
- DeepSeek 官方适配器、JSON校验、版本化证据、SSE 流式/取消/未完成保存、固定目录草案、人工确认；服务端每日限额3/30/3，同账户单生成任务。
- 配额/去重日志不保存正文。AI 结果在响应后由客户端保存；仅开启云同步时再上传。响应丢失须用户主动重新生成，不重放供应商请求。

## 本机配置与线上阶段

1. 私密值在根目录 `.env.local`（权限 0600，Git 忽略），通过 `python3 scripts/enter_hosted_secrets.py` 在终端录入；不要发送到聊天。
2. 部署脚本用 `status`、`db-password`、`database`、`secrets`、`auth`、`functions` 分阶段执行；迁移使用 Supabase Session Pooler。凭据从 `.env.local` 读取，不要提交到版本库。
3. 已运行 `python3 scripts/configure_client.py` 生成 `Steady/CloudConfig.plist`，文件只含公开 URL 与 publishable key；签名模拟器 App 登录与上传验收通过后，本机 Steady 后端已停用；PhotoArchive 未触碰。
4. 不配置云服务也能进入真实游客模式并补记、读取已授权的苹果健康；AI 和同步会明确显示尚未配置。

苹果签名：当前免费 Personal Team 已成功构建包含 HealthKit 的真机 Debug App。没有成功安装到设备；随后用户明确暂停装机测试。不要再以 Apple 登录要求付费团队作为当前版本的阻塞。

## 本地后端和测试

固定版本：Supabase Swift 2.55.2、CLI 2.117.0；Swift Package 与 Deno 锁文件已保存。Docker 使用本项目独立553xx端口，避免影响其他项目543xx实例。

```sh
npx --yes supabase@2.117.0 start
npx --yes supabase@2.117.0 db reset --local
npx --yes supabase@2.117.0 functions serve
swift test
deno check --config supabase/functions/deno.json supabase/functions/*/index.ts
deno test --allow-env --config supabase/functions/deno.json supabase/functions/_shared/coach_test.ts
# 安装 CLI 后，或用 STEADY_SUPABASE_CLI 指向该固定版本的可执行文件
python3 scripts/test_local_backend.py
# 本地 pgTAP；会事务回滚，只使用合成账户
docker exec -i supabase_db_steady psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/database/controls.test.sql
```

`db reset --local` 会清空本项目本地测试库，不可用于含有需要保留数据的库。HTTP 测试只接受本地55321地址，创建临时合成账户，测试后删除；不调用 DeepSeek。

## 已取得证据

| 层级 | 结果 |
|---|---|
| Swift 单测 | 28项：核心20、AppModel3、真实服务4；全部通过 |
| Edge 类型检查 | 8个入口通过 |
| AI 结构/数据测试 | 6项通过（新增供应商失败与超时中止）：缺失、非法结构、虚构引用、限制/器械/时间、跨夏令时 |
| 从零数据库迁移 | 专用本地库 reset 成功 |
| 数据库隔离/同步 | 20项 pgTAP 通过，包括每日配额、跨账户父子引用、撤销会话、RLS、客户端越权、去重、删除、恢复新记录 |
| 本地 HTTP | 16项通过，包括两个账户、无效输入、撤回同意、验证码删除、旧令牌失效与级联清理 |
| 模拟器构建 | 最新 build-for-testing 成功，iOS27 SDK / iOS26.5运行时 |
| 原生演示主流程 | 报告→聊天→草案修改→确认→反馈→重启恢复，单用例通过 |
| 原生离线补记 | 本轮早期用例通过，包含离线历史及补记重启恢复 |
| 真实游客 UI | 通过：三个开关默认关闭、补记持久化、在模拟器系统深色外观下重启恢复 |
| 真机 | 签名构建成功；安装未成功；按用户要求停止装机测试 |
| 云端与大陆网络 | SMTP 数字验证码真实投递与 API 验证、真实 DeepSeek、线上双账户 16 项通过；签名模拟器 App 登录、同步授权及 1 条补记上传并在线上核对通过。大陆网络未验收 |


## 尚需完成的验收

- 真实供应商响应、App 内验证码登录与补记上传已通过；仍需模拟器断网重连的完整 UI 链路及跨设备实际恢复。
- HealthKit 真机跨午夜、多来源、样本删除/延迟同步与时区切换；目前聚合测试不能代替设备源数据验收。
- 原生小屏、大字号、深色完整流程，以及大陆 Wi-Fi/蜂窝网络。真机测试待用户重新授权。
- 当前数据库使用按 kind 区分的统一 records 表，不为每类业务额外建立实体表；所有字段通过 Edge 类型校验，父子归属由数据库复合外键和函数验证。

官方参考：[邮箱 OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless)、[SMTP 限制](https://supabase.com/docs/guides/auth/auth-smtp)。

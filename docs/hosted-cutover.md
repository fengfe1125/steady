# Steady 线上后端切换记录（2026-09-25）

## 已完成的线上准备

- 免费组织 `lxuktcielwzkbtznjkfm`：确认加拿大项目 `kmlghfnuprsnhiplnuoo` 为空后暂停，未删除；`photoarchive` 保留。独立新加坡项目 `steady-internal` ref `wzzyggznxawlbdmbljem`，区域 `ap-southeast-1`，状态健康。
- 已应用迁移 `20260924133921_live_records_and_controls`，8 个 Edge Functions 为 ACTIVE。数据库迁移脚本通过 IPv4 Session Pooler 重跑为 up to date，口令不放在命令行。匿名函数请求被拒绝；线上合成账户的隔离、写入去重、冲突、删除标记传播、撤回授权及账户删除共 16 项通过，测试账户已清空。
- 域名 `mail.sakuramu.edu.kg` 原已在 Resend 验证，沿用该域名并创建仅限它发送的 Steady 专用密钥。Supabase 自定义 SMTP 已启用；公开注册关闭，组织唯一成员已预建账户。验证码模板使用数字 `{{ .Token }}`，有效期 600 秒。真实邮件在 Resend 显示 Delivered，8 位验证码已完成线上 Auth 验证。App 请求验证码时设置 `shouldCreateUser: false`。
- DeepSeek 官方 key 只在忽略版本控制的 `.env.local` 和线上 Edge Function Secrets 中。真实 `chat` 流式请求返回完整中文回答；未获 AI 授权的请求被拒绝，受控 Deno 测试覆盖供应商失败与超时中止。
- 本机旧 Steady 库经复核：Auth 用户、业务记录、同意事件均为 0。已加密导出，并在无网络、无持久卷的 PostgreSQL 17 容器中恢复。没有可迁移的本机真实服务端记录；iPhone SwiftData 数据仍留在设备，只有登录并单独同意云同步后才上传。
- 最终线上加密数据库备份：`/Users/sakura/Documents/SteadyBackups/steady-hosted-20260924T172244Z.tar.gpg`，切换前隔离恢复演练得到 Auth 用户 1、业务记录 0、同意事件 0、核心同步函数 3；先前备份仍保留。备份脚本使用固定项目的 Session Pooler，不依赖即将到期的管理 token。每周一 09:00 的备份自动任务 `steady` 已启用，自动只保留四份；每月第一个周一 10:00 的隔离恢复演练 `steady-2` 已启用。均按北京时间运行，异常时在本任务报告。
- App 已生成仅含线上 URL 与 publishable key 的 `Steady/CloudConfig.plist`，完成 iOS 签名模拟器构建和安装。真实游客 UI 测试通过：三项授权默认关闭、本机补记重启仍在。签名模拟器用合成账户完成邮箱验证码登录、单独开启云同步和补记上传；线上查询到 1 条非删除补记，随后删除合成账户，最终备份确认业务记录归零。Swift 28 项、Deno 6 项、8 个函数类型检查、数据库 pgTAP 20 项通过。

## 切换结果与仍需验收

- Steady 本机 Supabase 已执行 `npx --yes supabase@2.117.0 stop --project-id steady --no-backup`；`_steady` 容器及 `supabase_db_steady`、`supabase_edge_runtime_steady` 卷均已消失。PhotoArchive 容器与卷仍在；其 Edge Runtime 在操作前数小时已退出，本轮未触碰。
- 受控测试已验证离线修改保存在本机并自动重试，但模拟器断网后重连的完整 UI 链路尚未实测。真实 iPhone SwiftData 记录继续只在设备上；真机安装、健康读取实测和大陆网络验收按此前决定单列，不在本轮擅自执行。
- Supabase 安全顾问只有 6 个私有表 RLS 开启但无客户端策略的 INFO（这些表不开放客户端表权限）以及泄露密码保护未启用的 WARN。后者在免费计划配置时返回 HTTP 402；当前内测只允许预建账户的邮箱 OTP。可参考 [RLS 提示](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) 与 [泄露密码保护](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)。

## 运行、停用与回退

- 私密值位于 Git 忽略的 `.env.local`（0600），不要传到聊天、写入 App 或提交。用于部署的项目限定管理 token 将于 2026-10-01 到期；每周备份不使用它。`STEADY_BACKUP_PASSPHRASE` 必须另存到安全位置；加密备份和口令同时丢失则无法恢复。
- 线上变更分阶段执行 `python3 scripts/deploy_backend.py status|database|secrets|auth|functions`。组织成员账户因项目限定 token 没有读取组织名单的权限，已通过控制台核对唯一成员并预建。`python3 scripts/backup_backend.py hosted` 生成加密备份；`python3 scripts/verify_backend_backup.py hosted` 在隔离容器恢复校验。
- 切换前已重新备份并隔离恢复线上库，随后仅停用 `_steady` 本机堆栈；日后若需重新运行本地开发服务，须明确使用 Steady 专用项目与端口，且不要将恢复的旧库当作线上真实数据。
- 如需回退，重新启动 Steady 本地 Supabase，在新建的专用本地数据库恢复已验证的本机加密备份；移除 `CloudConfig.plist` 并重新构建 App。线上期间产生的数据必须先按账户导出、核对，再决定回灌，不能用旧库覆盖线上数据。

官方资料：[邮箱 OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless) · [免费模板限制](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier) · [备份](https://supabase.com/docs/guides/platform/backups)。

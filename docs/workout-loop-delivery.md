# Steady 原生训练闭环交付记录

日期：2026-10-16。功能分支：`codex/workout-loop`。

## 实现与使用

“计划 → 开始训练 / 我的训练模板”进入原生训练模块。支持手动建立、排序、保存模板；从已确认计划启动训练；重量次数、仅次数、计时三种记录；左右侧、总重量/单侧重量、热身组；逐组确认/修改/删除立即写本地事务；暂停/恢复、提前结束、明确放弃；日历、动作历史与可修改反馈。

目录有 92 个条目，其中 39 个 approved 可手动添加，53 个 learningOnly 仅提供教学入口。额外 learningOnly 教学资源未自动纳入训练。墙面等支撑物默认仅次数，不要求填写重量。自定义动作拥有稳定身份，复用模板后可对比历史；新建同名自定义动作不会自动合并。计时动作支持秒表，也可手填实际秒数。

所有目标与名称都复制进实际日志；编辑模板不修改历史。旧计划的整次反馈不补造逐组数据。训练完成不会自动标记计划反馈完成。

休息用截止日期计算，延长、跳过、暂停、结束会更新或取消待发通知。只有显式打开“休息结束通知”才请求权限；权限拒绝不影响记录。通知属于尽力提醒，未宣称通过锁屏真机验收。

双进阶只参考最近完整完成、身份/记录方式/左右侧/重量含义相同的训练；所有正式组达到当前次数上限且重量相同、配置有效步长，才给出一个步长的建议。热身组不参与，部分完成不给建议。确认建议只修改本次训练目标，未自动改写模板或历史，未确认则保留目标。

正常路径禁止创建第二场未结束训练；若多台设备离线各自创建训练，拉取后全部保留并显示，要求用户结束/放弃多余记录，不静默合并或删除。

## 源码和数据边界

独立实现，未复制 openGym 源码、动作文本或媒体。完整参考仓库位于 `/Volumes/Developer/Projects/openGym-reference`，固定 `e348fc17c42c7e9a211c5972e573ad3698190ee2`，原许可证保留。

实施前源码与未跟踪资源（排除本地密钥和构建缓存）已保存于 `/Volumes/Developer/Projects/steady-backups/20261016-150026/`，包含压缩包、11,029 项 SHA-256 清单及 Git 状态。原有 WIP 未回退，未将此前改动误记为本次实现。

核心新增 `WorkoutTemplate`、`WorkoutLog`、`ExerciseLog`、`SetLog`、`WorkoutRepository` 和纯函数进阶服务；正常模式复用 `DeviceRepository` 的账户分区、事务、outbox、冲突和 tombstone。演示模式使用独立训练存储。功能开关 `disableWorkoutLoop` 为 UserDefaults Bool，默认 false；关闭仅隐藏主入口，不清除数据。

## Supabase 同步与发布顺序

新增顶层 kind：`workoutTemplates` / `workoutLogs`。每次训练为独立记录，不依赖模板/计划外键；模板删除不删除实际历史。新增严格 Zod 校验、数据库类型/身份约束，沿用现有 RLS 和用户事务锁。

`sync-pull` 通过 `X-Steady-Record-Kinds` 协商；旧客户端不发该头，服务端只返回旧类型但仍推进游标。新客户端跳过未知类型，对已知类型的损坏载荷仍报错。返回的 `supportedKinds` 缺失意味着旧服务端；客户端将新训练留在 outbox，仅同步旧类型，因此不会把未经部署的新记录推到旧服务端。

发布：先备份并验证现有 Steady 托管项目 → 应用 `20261016073215_workout_records.sql` → 部署 `sync-push` 与 `sync-pull` → 验证新增载荷及旧客户端过滤 → 发布客户端。不要顺带部署 AI/认证函数或修改其他项目。

用户安装并授权 Supabase 连接后，已在现有 steady-internal 项目应用 workout_records 迁移（云端版本 20261016073215，本地文件已对齐），sync-push / sync-pull 均升级为 v6、ACTIVE、verify_jwt=true。其他函数未部署。云端 14 项训练 RPC/RLS 与 27 项旧计划兼容检查均通过，合成数据事务已回滚；真实 records 数量发布前后都是 55，未遗留合成训练记录。旧 CLI 管理 token 仍失效，不影响当前已授权的连接。

## 验收与限制

测试和构建证据见 `docs/verification/workout-loop/`。通过情况以 acceptance.json 为准。

临时 PostgreSQL 容器应用全部四条项目迁移；使用最小 Auth 桩验证 RPC/RLS。随后已在真实托管数据库中再次通过同样的 14 项训练同步 SQL 与 27 项旧目录兼容 SQL（事务回滚）。这仍不等同于手机 App 经真实网络登录后完成两设备同步。

iOS Simulator 版本和 UI Test Target 均可编译。正常设备集合缺失且目录只读；开发盘新集合创建遭 CoreSimulator 权限拒绝。使用 `/private/tmp/SteadyWorkoutSimulators` 成功创建并启动独立 iPhone 17、安装并启动 App，取得实际训练首页截图。

完整 XCUI 测试已写入 `WorkoutLoopUITests.swift`，但 Xcode 目的地发现不识别临时集合，测试执行未进入用例；不能把编译或首页截图当成完整点击验收。配对 iPhone 当前 unavailable，因此真机安装、完整训练、锁屏通知、飞行模式、拒绝通知、小屏、大字号与两设备云同步仍待验收。没有操作用户真实训练数据。

临时集合位于系统临时目录，不用于保存用户数据；后续环境清理可能删除。恢复环境后应在稳定的开发盘模拟器/真机运行完整用例。

云端发布前已创建并恢复验证加密备份：`/Users/sakura/Documents/SteadyBackups/steady-hosted-20261016T072711Z.tar.gpg`。同步旧版本源码保存在源码基线旁的 `cloud-functions-before.json`；未变更的 generated 目录与云端逐文件比较一致。

## 最终证据补充

Swift 测试 112 项（Core 87 / Live 5 / AppState 20）、Edge 测试 32 项均通过；sync-push / sync-pull Deno 类型检查通过。模拟器 App 和 UI Test Target 编译通过；真机平台无签名编译也通过（不等同于签名安装）。

独立 iPhone 17 模拟器中的三次跨进程运行通过 17 项检查：首次创建/防重复/记组/暂停恢复 7 项 → 终止后重读并结束 5 项 → 再终止重读历史并开始下一次 5 项。仅 DEBUG 模拟器的 `--ui-preview workout --workout-smoke begin|finish|repeat` 驱动实际 AppModel / SwiftData，验收数据在独立 SteadyWorkoutQA.store；这是原生运行时持久化验收，不是点击用例。`ios-repeat.png` 显示上次两组 10 kg × 12 次及待确认的 12.5 kg 建议；另有深色和大字号请求状态截图，完整字号交互仍未验收。

完整 XCUI 用例尚未执行成功，不能标记完整首版已验收。物理 iPhone 最后检查仍为 unavailable。

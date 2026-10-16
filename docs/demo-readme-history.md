# Steady

一个安静的 iOS 健康日记演示。iOS 18+，SwiftUI / Observation / Swift Concurrency / SwiftData / Swift Charts；简体中文、iPhone 优先。

## 设计

- [可编辑 Figma 文件](https://www.figma.com/design/APLEefE2UxG4Vhd6W25zTl)
- [可点击主流程](https://www.figma.com/proto/APLEefE2UxG4Vhd6W25zTl/Steady?node-id=5-2&starting-point-node-id=5%3A2)
- 原型支持：今天 → 报告 → 追问 → 生成草案 → 修改与确认 → 训练反馈 → 已完成。
- 使用本地组件和 Noto Sans SC 解决 Figma 库权限与字体问题，已取得用户同意；App 使用系统字体和真正的原生控件，不嵌入网页。

## 运行

1. 用 Xcode 打开 `Steady.xcodeproj`。
2. 选择 `Steady` Scheme 和可用的 iPhone 模拟器，Run。
3. 完成欢迎流程，无需 Apple 账户、Supabase 配置或 AI 密钥。

本机测试设备为 **Steady QA**（iPhone 17 Pro / iOS 26.5），UDID `0BBC87BE-3CBF-4825-A982-9843A7614E2F`。旧设备曾因挂载目录不可用而启动失败，设备当前状态请以 Xcode / simctl 为准。真机运行需选开发团队，当前没有配置或验证签名。

```sh
swift test
xcodebuild -project Steady.xcodeproj -scheme Steady \
  -destination 'platform=iOS Simulator,id=0BBC87BE-3CBF-4825-A982-9843A7614E2F' \
  -derivedDataPath DerivedData CODE_SIGNING_ALLOWED=NO build
```

UI 测试会清空 **所选模拟器内本 App** 的演示记录，仅在测试设备运行。先 `build-for-testing`，也可用生成的 `.xctestrun` 执行 `test-without-building`。验收结果见 `docs/implementation-status.md`，编译成功不等于 UI 用例通过。

本次因系统盘空间不足，最终构建缓存使用 `/Volumes/Developer/Xcode/steady-build.upy0KZ`；将命令里的 `-derivedDataPath` 指向它即可复用。不修改全局 Xcode 设置。

## 演示能力与边界

- 固定30天虚构数据（2026-08-23–09-21）；设置里切换正常、缺失、离线、请求失败。
- 四段日报、可展开数据依据、模拟流式聊天、可取消生成。
- 目标/经验/器械/时间/限制表单 → 草案 → 修改 → 确认；演示模板不是真实个性化处方，有运动限制时拒绝自动生成。
- 本机保存报告、会话、偏好、补记、草案、计划和训练反馈；SwiftData 明确关闭 CloudKit。设置内重置需确认，删除后不能撤销。
- 健康读取、云同步、AI处理是独立的**演示偏好**，开启不会请求真实权限、读取或上传健康数据。正式接入时需要重新授权。

本阶段**未接入** HealthKit、Supabase、Apple 登录或 AI；不创建云项目、不部署数据库、不包含密钥。

## 工程组织

- `Steady/`：App 装配、可观察状态、设计系统、按功能划分的 SwiftUI 页面和深浅色资产。
- `Sources/SteadyCore/`：领域类型、服务协议、模拟实现和本地仓储。
- `Tests/SteadyCoreTests/`：服务、取消/失败、计划修改与落盘重读测试。
- `SteadyUITests/`：原生主流程、离线与重启持久化用例。
- `docs/architecture.md`：模块和页面契约。
- `docs/backend-contract.md`：后续 Supabase、RLS、Edge Functions 与离线同步约定，尚未部署。

Project repository initialized on the `main` branch.

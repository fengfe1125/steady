# Steady

[English](#english) · [简体中文](#简体中文)

## English

A local-first iPhone health journal for daily notes, Apple Health trends, and optional AI coaching. Built with SwiftUI, SwiftData, HealthKit, and Supabase. Requires iOS 18 or later.

- Keep daily notes, review health trends and reports, and manage training plans.
- Read weight, sleep, steps, and exercise minutes from Apple Health after permission is granted.
- HealthKit access, cloud sync, and AI processing are separate opt-ins, all off by default.
- AI training plans stay as drafts until you review and confirm them.

### Get started

Open `Steady.xcodeproj` in Xcode, select the `Steady` scheme, and run it on an iOS 18+ simulator. Local features work without cloud configuration. For optional Supabase and AI setup, see the [development guide](docs/live-development.md) (Chinese) and [architecture](docs/architecture.md) (Chinese).

Steady is in active development. Real-device HealthKit and cross-device recovery validation are still in progress.

## 简体中文

Steady 是一款本地优先的 iPhone 健康日记，记录日常感受与 Apple 健康趋势，并提供可选的 AI 训练建议。使用 SwiftUI、SwiftData、HealthKit 和 Supabase 构建，支持 iOS 18 及以上版本。

- 记录日常笔记，查看健康趋势与报告，管理训练计划。
- 获得授权后读取 Apple 健康中的体重、睡眠、步数和运动分钟。
- HealthKit 读取、云同步和 AI 处理分别授权，默认全部关闭。
- AI 训练计划先保存为草案，经你确认后才加入计划。

### 开始使用

用 Xcode 打开 `Steady.xcodeproj`，选择 `Steady` Scheme，并在 iOS 18+ 模拟器运行。本地功能无需云端配置。Supabase 和 AI 的可选配置见[开发说明](docs/live-development.md)和[架构说明](docs/architecture.md)。

项目仍在开发中；真机 HealthKit 和跨设备恢复验收尚未完成。

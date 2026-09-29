<img src="Steady/Assets.xcassets/AppIcon.appiconset/AppIcon-Light.png" width="88" alt="Steady app icon: a small green sprout">

# Steady

**A health journal for the small changes in your day.**

English · [简体中文](README.zh-CN.md)

Steady brings your daily notes, Apple Health trends, and training plans together on iPhone. Record how you feel, look back at your sleep and activity, and choose what to do next. Optional AI coaching helps explain health summaries and draft plans you can review and adjust.

Built with SwiftUI for iOS 18 and later. The app interface is currently in Simplified Chinese.

<p>
  <img src="docs/images/today.png" width="250" alt="Today screen with fictional sleep, step, exercise, and weight summaries">
  <img src="docs/images/trends.png" width="250" alt="Seven-day step trend with links to daily health records">
  <img src="docs/images/plans.png" width="250" alt="Training plan screen with an invitation to create a draft">
</p>

*Screenshots show fictional demo data.*

## What you can do

- **Keep a daily journal.** Write a note about how you feel and revisit saved health reports.
- **See your health trends.** Read weight, sleep, steps, and Apple exercise minutes from Apple Health. Explore 7-, 14-, or 30-day windows and individual daily records. Missing values stay missing, rather than becoming zero.
- **Ask for context.** With AI enabled, generate a daily report or discuss a health summary with the coach.
- **Make a plan your own.** Review and edit training drafts before confirming them. Adjust sessions and record completion, effort, and feedback.

The native interface includes light and dark appearances, handwriting accents, and a sprout that changes expression when tapped.

## Your data, your choices

You can keep notes and use local records without an account. These three features have separate switches, all **off by default**:

| Feature | What enabling it allows |
| --- | --- |
| Apple Health | Read supported health metrics and build daily summaries on your device. |
| Cloud sync | Sync summaries and journal records through the configured Supabase backend. |
| AI coaching | Send the context needed for a report, conversation, or plan to the AI provider through the backend. |

Signing in does not enable any of these features. Raw HealthKit samples stay on the device; cloud sync uses derived summaries. AI can be enabled without turning on cloud sync. Disabling sync stops future syncing but does not delete existing cloud records.

Reports and coaching are informational and do not provide medical diagnoses.

## Try it locally

You need macOS, Xcode with Swift 6 support, and an iOS 18+ simulator or iPhone. Swift package tests require macOS 15 or later.

```sh
git clone https://github.com/fengfe1125/steady.git
cd steady
open Steady.xcodeproj
```

1. Select the **Steady** scheme and an iPhone simulator, then run the app.
2. To explore fictional sample data, add `--demo` under **Edit Scheme → Run → Arguments Passed On Launch**. Demo mode does not read Apple Health, sync records, or call AI services.
3. Remove `--demo` to use the local journal. Use an iPhone with Apple Health records to verify real health imports; device builds require your own signing setup.

Local features work without cloud configuration. Email login, cloud sync, and live AI require a configured backend. See the [development notes](docs/live-development.md) and [backend contract](docs/backend-contract.md), both in Chinese. The [client configuration script](scripts/configure_client.py) generates the ignored `Steady/CloudConfig.plist` from your local environment file.

Run the Swift tests from the repository root:

```sh
swift test
```

## Project status

Steady is in active development. [v0.1.0-alpha.1](https://github.com/fengfe1125/steady/releases/tag/v0.1.0-alpha.1) is a **source preview**, with no signed install package or TestFlight build included. Its Swift tests and iOS Simulator build passed; final device validation, cross-device recovery, and full UI acceptance remain in progress.

## Inside the project

| Path | Contents |
| --- | --- |
| `Steady/` | SwiftUI screens, app state, themes, and bundled fonts. |
| `Sources/SteadyCore/` | Domain models, local persistence, service protocols, and demo data. |
| `Sources/SteadyLive/` | HealthKit, account, sync, and AI service implementations. |
| `supabase/` | Backend functions, migrations, and database tests. |
| `Tests/` · `SteadyUITests/` | Swift unit tests and iOS UI tests. |

The bundled [Caveat](Steady/Fonts/Caveat-OFL.txt) and [Long Cang](Steady/Fonts/LongCang-OFL.txt) fonts are distributed under the SIL Open Font License 1.1.

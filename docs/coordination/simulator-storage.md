# Training QA simulator storage — 2026-10-04

The earlier conclusion that the default CoreSimulator path was on the internal disk was incorrect: checking for a symlink was insufficient. Live `df` and `hdiutil info` confirm:

- Mount: `/Users/sakura/Library/Developer/CoreSimulator`, `/dev/disk9s1`.
- Backing image: `/Volumes/Developer/Applications/CoreSimulatorData/CoreSimulatorStore-20260921.sparseimage`.
- Existing mount retained; no global migration, remount, service termination or permission change.
- New dedicated device: `9126FF47-F174-47B2-BC46-4AB43F71EECD`, Steady Training QA, iPhone 17 Pro / iOS 26.5.
- Created, booted, installed and launched the candidate Steady app on this simulator. No physical device installation.
- `simctl io screenshot` cannot write directly to the project path (Cocoa 513 / POSIX 1). It succeeds under the externally backed mount at `CoreSimulator/SteadyTrainingQA-evidence`; evidence is copied into the project cache. This directory is on the external image despite its `/Users` path.
- Xcode build, test results, Swift module caches and task temporary directories remain under the project coordination cache on Developer.
- System-managed tool logs may still use internal storage; zero internal writes is not claimed.

The prior failing `simctl --set` pointed directly at the project directory, outside the supported mounted location. Failure there does not prevent testing through the existing external APFS image.

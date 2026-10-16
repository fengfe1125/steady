# Back native screenshot review — 2026-10-04 05:07

Coordinator visually inspected all nine per-lesson contact sheets (27 native screenshots: motion, detail, mistakes) in `.cache/build/native-contact-sheets/back-*.jpg`, derived without altering content from the all-native XCUITest attachments. Exact source PNG paths are in native-screenshot-index.json. Scope: iPhone17Pro/iOS26.5, light/default text, second-step static pose, default view/side. Not a complete cycle or all-view visual pass.

No blank panels or clipped full figures observed in these views. Navigation and mode selected labels match their panels.

## Must fix before acceptance

1. Detail markers 1/2/3 (walking 1/2) have no visible legend beside the artwork. The self-contained source includes `window.BackLesson.detail` with the exact numbered explanations, but native CSS hides `.caption`; the native wrapper does not expose those numbered explanations. General preparation text below does not clearly map all marker numbers. All nine detail panels affected. Coordinator should restore the existing exact legend through the native presentation layer, without inventing anatomy or changing pose geometry.
2. Eight non-walking mistakes panels place small brown warning text over/near head/torso/bench; roller and bench examples visibly overlap figure, shoulder/scapula also weak contrast. Walking already has a clear top banner. Keep the ghost/arrow comparison but move readable warning text outside the pose (or show its existing `BackLesson.mistake` in the native wrapper and suppress only redundant overlapping SVG text). Source annotation text is unchanged; this is a presentation defect, not a new source claim.

Source `back-playback.js` builds phase-note from BackLesson.detail/mistake; native CSS in each generated HTML contains `.native .caption{display:none}`. This explains the missing legend. Public wrapper adaptation belongs to coordinator; no worker/public concurrent edits authorized.

## 05:17 follow-up, completed 05:24

Coordinator added optional detailExplanation/mistakeExplanation metadata copied exactly from the nine existing BackLesson objects, rendered as native text in the corresponding mode. Only redundant wrongTorso/wrongSupportNote SVG text is hidden; ghost geometry remains. Candidate copy/normalization is recorded in back-integration-candidate.json; worker files were not changed.

Nine back native tests passed (232.699 seconds) in `.cache/build/back-native-legends.xcresult`. The strengthened test asserts the exact second-step preview time before and after scrolling, and checks native detail/mistake explanation elements. 27 PNGs exported with manifest to `.cache/build/back-native-legends-attachments/`. Coordinator opened roller detail and mistakes originals: numbered legend is readable below the artwork; warning text no longer overlaps the figure and is readable below it. Other eight lessons have automated text-presence verification, not a fresh per-image visual pass.

Correction to earlier scope: the old 83-test run did not assert the specific seek time and several topic screenshots remained at 0 seconds. Its passing result proves navigation/loading/mode coverage but not all 83 second-step poses. Do not call the earlier screenshots uniformly second-step images.

#if DEBUG && targetEnvironment(simulator)
import SwiftUI
import SteadyCore

/// Deterministic visual inspection using in-memory demo or guest fixtures; never enabled in device/release builds.
struct UIReviewView: View {
    @Bindable var model: AppModel
    let screen: String
    var body: some View {
        Group {
            switch screen {
            case "settings": NavigationStack { SettingsView(model: model) }
            case "account": NavigationStack { AccountConnectionsView(model: model) }
            case "login": NavigationStack { EmailLoginView(model: model) }
            case "note": NoteView(model: model)
            case "training-collections": NavigationStack { TrainingCollectionsView() }
            case "training-animation-collections": NavigationStack { AnimatedTrainingCollectionsView() }
            case "back-animation-collection":
                if let bundle = try? AnimatedTrainingCatalog.backCandidate() {
                    NavigationStack { AnimatedTrainingCollectionView(bundle: bundle) }
                }
            case "legs-animation-collection":
                if let bundle = try? AnimatedTrainingCatalog.legsCandidate() {
                    NavigationStack { AnimatedTrainingCollectionView(bundle: bundle) }
                }
            case "functional-animation-collection":
                if let bundle = try? AnimatedTrainingCatalog.functionalCandidate() {
                    NavigationStack { AnimatedTrainingCollectionView(bundle: bundle) }
                }
            case "arms-extra-animation-collection":
                if let bundle = try? AnimatedTrainingCatalog.armsExtraCandidate() {
                    NavigationStack { AnimatedTrainingCollectionView(bundle: bundle) }
                }
            case "shoulders-animation-collection":
                if let bundle = try? AnimatedTrainingCatalog.shouldersCandidate() {
                    NavigationStack { AnimatedTrainingCollectionView(bundle: bundle) }
                }
            case "arms-animation-collection":
                if let bundle = try? AnimatedTrainingCatalog.armsCandidate() {
                    NavigationStack { AnimatedTrainingCollectionView(bundle: bundle) }
                }
            case "chest-animation-collection":
                if let bundle = try? AnimatedTrainingCatalog.chestCandidate() {
                    NavigationStack { AnimatedTrainingCollectionView(bundle: bundle) }
                }
            case "abs-collection":
                if let bundle = try? AnimatedTrainingCatalog.abdominalCandidate() {
                    NavigationStack { AnimatedTrainingCollectionView(bundle: bundle) }
                }
            case "equipment": NavigationStack { EquipmentLibraryView() }
            case "coach": NavigationStack { CoachView(model: model) }
            case "action-library-chest": NavigationStack { ActionLibraryView(part: "chest") }
            case "equipment-motion": NavigationStack { EquipmentLessonView(lesson: .seatedChestPress) }
            case "equipment-grip": NavigationStack { EquipmentLessonView(lesson: .seatedChestPress, initialMode: .detail) }
            case "equipment-mistakes": NavigationStack { EquipmentLessonView(lesson: .seatedChestPress, initialMode: .mistakes) }
            default:
                // animated-lesson-<topic>:<lessonID>, e.g. animated-lesson-shoulders:shoulders-lateral-raise
                // action-library-<part>:<sourceID>, e.g. action-library-chest:586cfdab124816784056bfa7
                if screen.hasPrefix("action-library-"),
                   case let parts = screen.dropFirst("action-library-".count).split(separator: ":", maxSplits: 1), parts.count == 2,
                   let entry = try? ActionLibrary.entries(part: String(parts[0])).first(where: { $0.id == String(parts[1]) }),
                   let url = entry.artworkURL {
                    NavigationStack { AnimatedTrainingLessonView(lesson: entry.lesson, animation: entry.animation, resourceURL: url, runtime: .bundled, initialMode: ProcessInfo.processInfo.arguments.contains("--reference-detail") ? .detail : (ProcessInfo.processInfo.arguments.contains("--reference-mistakes") ? .mistakes : .motion)) }
                } else if screen.hasPrefix("animated-lesson-"),
                   case let parts = screen.dropFirst("animated-lesson-".count).split(separator: ":", maxSplits: 1), parts.count == 2,
                   let topic = AnimatedTrainingTopic(rawValue: String(parts[0])), let bundle = try? topic.load(),
                   let lesson = bundle.collection.lesson(id: String(parts[1])),
                   let animation = bundle.animations[lesson.id], let url = bundle.artworkURL(for: lesson.id) {
                    NavigationStack { AnimatedTrainingLessonView(lesson: lesson, animation: animation, resourceURL: url, runtime: bundle.runtime) }
                } else if screen.hasPrefix("abs-lesson-"), let bundle = try? AnimatedTrainingCatalog.abdominalCandidate(),
                   let lesson = bundle.collection.lesson(id: String(screen.dropFirst("abs-lesson-".count))),
                   let animation = bundle.animations[lesson.id], let url = bundle.artworkURL(for: lesson.id) {
                    NavigationStack { AnimatedTrainingLessonView(lesson: lesson, animation: animation, resourceURL: url, runtime: bundle.runtime) }
                } else if let lesson = EquipmentLessonID.allCases.first(where: { screen.hasPrefix("equipment-" + $0.rawValue + "-") }),
                   let mode = EquipmentViewMode.allCases.first(where: { screen.hasSuffix("-" + $0.rawValue) }) {
                    NavigationStack { EquipmentLessonView(lesson: lesson, initialMode: mode) }
                } else { RootView(model: model) }
            }
        }
        .dynamicTypeSize(ProcessInfo.processInfo.arguments.contains("--equipment-large-text") ? .accessibility3 : .large)
        .preferredColorScheme(ProcessInfo.processInfo.arguments.contains("--equipment-dark") ? .dark : nil)
        .task {
            await model.load()
        }
    }
}
#endif

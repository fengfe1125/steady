import Foundation

public struct TrainingAnimationStep: Codable, Sendable {
    public let title: String
    public let startSeconds: Double
    public let endSeconds: Double
    public let instruction: String
    public let previewTimeSeconds: Double?
    public var previewSeconds: Double { previewTimeSeconds ?? (startSeconds + endSeconds) / 2 }
}

public enum TrainingAnimationView: String, Codable, Sendable, CaseIterable {
    case oblique, side, rear
    public var title: String {
        switch self { case .oblique: "斜侧"; case .side: "侧面"; case .rear: "背面" }
    }
}

public struct TrainingAnimation: Codable, Sendable {
    public let lessonID: String
    public let resource: String
    public let durationSeconds: Double
    public let steps: [TrainingAnimationStep]
    public let timingMilliseconds: EquipmentTiming?
    public let injectedRuntimeResource: String?
    public let documentLayout: Bool?
    public let detailExplanation: String?
    public let mistakeExplanation: String?
    public let availableViews: [TrainingAnimationView]?
    public let defaultView: TrainingAnimationView?
    public let supportsSideSelection: Bool?
    /// Muscle names drawn in red (primary), light red (secondary) or hatched (stretched) by the anatomy artwork.
    public let primaryMuscles: [String]?
    public let secondaryMuscles: [String]?
    public let stretchMuscles: [String]?
    public var playbackTiming: EquipmentTiming { timingMilliseconds ?? EquipmentTiming() }

    public func stepIndex(at seconds: Double) -> Int? {
        guard seconds.isFinite, seconds >= 0, seconds <= durationSeconds else { return nil }
        if seconds == durationSeconds { return steps.indices.last }
        return steps.firstIndex { seconds >= $0.startSeconds && seconds < $0.endSeconds }
    }
}

public enum TrainingAnimationRuntime: Sendable { case hostInjected, bundled }

/// A reviewed course and its original artwork travel together. Source photographs
/// remain evidence metadata and are not required to display an animated lesson.
public struct AnimatedTrainingCollection: Sendable {
    public let collection: TrainingCollection
    public let animations: [String: TrainingAnimation]
    public let runtime: TrainingAnimationRuntime
    public let resourceDirectory: URL

    public func artworkURL(for lessonID: String) -> URL? {
        guard let animation = animations[lessonID] else { return nil }
        return resourceDirectory.appendingPathComponent(animation.resource)
    }

    public static func load(directory: URL, courseName: String, manifestName: String,
                            requiredResources: [String] = [], runtime: TrainingAnimationRuntime = .hostInjected) throws -> Self {
        for name in requiredResources {
            guard !name.contains("/"), !name.contains("\\"),
                  FileManager.default.isReadableFile(atPath: directory.appendingPathComponent(name).path) else {
                throw TrainingCollectionLoadError.missingResource
            }
        }
        let decoder = JSONDecoder()
        let collection = try decoder.decode(TrainingCollection.self,
            from: Data(contentsOf: directory.appendingPathComponent(courseName)))
        let manifest = try decoder.decode(Manifest.self,
            from: Data(contentsOf: directory.appendingPathComponent(manifestName)))
        let lessons = collection.lessons
        guard manifest.collectionID == collection.id, manifest.timeUnit == "seconds",
              collection.durationSeconds.isFinite, collection.durationSeconds > 0,
              !lessons.isEmpty, Set(lessons.map(\.id)).count == lessons.count,
              Set(manifest.animations.map(\.lessonID)).count == manifest.animations.count,
              Set(lessons.map(\.id)) == Set(manifest.animations.map(\.lessonID)) else {
            throw TrainingCollectionLoadError.invalidResource
        }
        for lesson in lessons {
            if lesson.origin == .video {
                guard let range = lesson.videoRange, range.start.isFinite, range.end.isFinite,
                      range.start >= 0, range.end > range.start, range.end <= collection.durationSeconds else {
                    throw TrainingCollectionLoadError.invalidResource
                }
            } else if lesson.videoRange != nil {
                throw TrainingCollectionLoadError.invalidResource
            }
        }
        for animation in manifest.animations {
            if let views = animation.availableViews {
                guard !views.isEmpty, Set(views).count == views.count,
                      let selected = animation.defaultView, views.contains(selected) else {
                    throw TrainingCollectionLoadError.invalidResource
                }
            } else if animation.defaultView != nil {
                throw TrainingCollectionLoadError.invalidResource
            }
            if let script = animation.injectedRuntimeResource {
                guard runtime == .hostInjected, script.hasSuffix(".js"),
                      !script.contains("/"), !script.contains("\\"),
                      FileManager.default.isReadableFile(atPath: directory.appendingPathComponent(script).path) else {
                    throw TrainingCollectionLoadError.invalidResource
                }
            }
            guard animation.durationSeconds.isFinite, animation.durationSeconds > 0,
                  !animation.steps.isEmpty,
                  animation.resource.hasSuffix(".html"),
                  !animation.resource.contains("/"), !animation.resource.contains("\\"),
                  FileManager.default.isReadableFile(atPath: directory.appendingPathComponent(animation.resource).path) else {
                throw TrainingCollectionLoadError.invalidResource
            }
            let timing = animation.playbackTiming
            let values = [timing.effortStart, timing.effortEnd, timing.returnStart, timing.returnEnd, timing.duration]
            guard values.allSatisfy({ $0.isFinite }), timing.effortStart >= 0,
                  timing.effortStart < timing.effortEnd, timing.effortEnd <= timing.returnStart,
                  timing.returnStart < timing.returnEnd, timing.returnEnd <= timing.duration,
                  abs(timing.duration - animation.durationSeconds * 1000) < 0.001 else {
                throw TrainingCollectionLoadError.invalidResource
            }
            var end = 0.0
            for step in animation.steps {
                guard step.startSeconds.isFinite, step.endSeconds.isFinite, step.startSeconds >= 0,
                      abs(step.startSeconds - end) < 0.000001,
                      step.endSeconds > step.startSeconds,
                      step.previewSeconds.isFinite, step.previewSeconds >= step.startSeconds,
                      step.previewSeconds < step.endSeconds,
                      !step.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                      !step.instruction.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                    throw TrainingCollectionLoadError.invalidResource
                }
                end = step.endSeconds
            }
            guard abs(end - animation.durationSeconds) < 0.000001 else {
                throw TrainingCollectionLoadError.invalidResource
            }
        }
        return Self(collection: collection,
                    animations: Dictionary(uniqueKeysWithValues: manifest.animations.map { ($0.lessonID, $0) }),
                    runtime: runtime, resourceDirectory: directory)
    }

    private struct Manifest: Decodable {
        let collectionID: String
        let timeUnit: String
        let animations: [TrainingAnimation]
    }
}

/// Integration candidates are opt-in; unfinished topics are not exposed here.
public enum AnimatedTrainingCatalog {
    /// Shared anatomy renderer copied next to every redrawn topic's pages (tools/anatomy/build.mjs).
    public static let anatomyEngine = TrainingArtworkDocument.anatomyEngine
    public static func backCandidate() throws -> AnimatedTrainingCollection {
        guard let url = Bundle.module.url(forResource: "tanchengyi-back", withExtension: "json",
                                         subdirectory: "TrainingCollections/Reviewed/back") else {
            throw TrainingCollectionLoadError.missingResource
        }
        return try AnimatedTrainingCollection.load(directory: url.deletingLastPathComponent(),
            courseName: "tanchengyi-back.json", manifestName: "back-animations.json", requiredResources: [anatomyEngine], runtime: .bundled)
    }

    public static func legsCandidate() throws -> AnimatedTrainingCollection {
        guard let url = Bundle.module.url(forResource: "tanchengyi-legs", withExtension: "json",
                                         subdirectory: "TrainingCollections/Reviewed/legs") else {
            throw TrainingCollectionLoadError.missingResource
        }
        return try AnimatedTrainingCollection.load(directory: url.deletingLastPathComponent(),
            courseName: "tanchengyi-legs.json", manifestName: "legs-animations.json",
            requiredResources: [anatomyEngine], runtime: .bundled)
    }

    public static func functionalCandidate() throws -> AnimatedTrainingCollection {
        guard let url = Bundle.module.url(forResource: "tanchengyi-functional-lower-limb", withExtension: "json",
                                         subdirectory: "TrainingCollections/Reviewed/functional") else {
            throw TrainingCollectionLoadError.missingResource
        }
        return try AnimatedTrainingCollection.load(directory: url.deletingLastPathComponent(),
            courseName: "tanchengyi-functional-lower-limb.json", manifestName: "functional-animations.json",
            requiredResources: [anatomyEngine], runtime: .bundled)
    }

    public static func armsExtraCandidate() throws -> AnimatedTrainingCollection {
        guard let url = Bundle.module.url(forResource: "tanchengyi-arms-extra", withExtension: "json",
                                         subdirectory: "TrainingCollections/Reviewed/arms-extra") else {
            throw TrainingCollectionLoadError.missingResource
        }
        return try AnimatedTrainingCollection.load(directory: url.deletingLastPathComponent(),
            courseName: "tanchengyi-arms-extra.json", manifestName: "arms-extra-complete-animations.json",
            requiredResources: [anatomyEngine], runtime: .bundled)
    }

    public static func shouldersCandidate() throws -> AnimatedTrainingCollection {
        guard let url = Bundle.module.url(forResource: "tanchengyi-shoulders", withExtension: "json",
                                         subdirectory: "TrainingCollections/Reviewed/shoulders") else {
            throw TrainingCollectionLoadError.missingResource
        }
        return try AnimatedTrainingCollection.load(directory: url.deletingLastPathComponent(),
            courseName: "tanchengyi-shoulders.json", manifestName: "shoulders-animations.json",
            requiredResources: [anatomyEngine], runtime: .bundled)
    }

    public static func armsCandidate() throws -> AnimatedTrainingCollection {
        guard let url = Bundle.module.url(forResource: "tanchengyi-arms", withExtension: "json",
                                         subdirectory: "TrainingCollections/Reviewed/arms") else {
            throw TrainingCollectionLoadError.missingResource
        }
        return try AnimatedTrainingCollection.load(directory: url.deletingLastPathComponent(),
            courseName: "tanchengyi-arms.json", manifestName: "arms-animations.json", requiredResources: [anatomyEngine], runtime: .bundled)
    }

    public static func chestCandidate() throws -> AnimatedTrainingCollection {
        guard let url = Bundle.module.url(forResource: "tanchengyi-chest", withExtension: "json",
                                         subdirectory: "TrainingCollections/Reviewed/chest") else {
            throw TrainingCollectionLoadError.missingResource
        }
        return try AnimatedTrainingCollection.load(directory: url.deletingLastPathComponent(),
            courseName: "tanchengyi-chest.json", manifestName: "chest-animations.json",
            requiredResources: [anatomyEngine], runtime: .bundled)
    }

    public static func abdominalCandidate() throws -> AnimatedTrainingCollection {
        guard let url = Bundle.module.url(forResource: "tanchengyi-abs", withExtension: "json",
                                         subdirectory: "TrainingCollections/Reviewed/abs") else {
            throw TrainingCollectionLoadError.missingResource
        }
        return try AnimatedTrainingCollection.load(directory: url.deletingLastPathComponent(),
            courseName: "tanchengyi-abs.json", manifestName: "abs-animations.json",
            requiredResources: [anatomyEngine], runtime: .bundled)
    }
}

import Testing
import Foundation
@testable import SteadyCore

struct AnimatedTrainingCollectionTests {
    @Test func allEightCollectionsUseTheSameOfflineAnatomyContract() throws {
        let collections = try [AnimatedTrainingCatalog.shouldersCandidate(), AnimatedTrainingCatalog.armsCandidate(),
            AnimatedTrainingCatalog.armsExtraCandidate(), AnimatedTrainingCatalog.chestCandidate(),
            AnimatedTrainingCatalog.backCandidate(), AnimatedTrainingCatalog.abdominalCandidate(),
            AnimatedTrainingCatalog.legsCandidate(), AnimatedTrainingCatalog.functionalCandidate()]
        #expect(collections.map { $0.collection.lessons.count }.reduce(0, +) == 90)
        let canonical = try Data(contentsOf: collections[0].resourceDirectory.appendingPathComponent(AnimatedTrainingCatalog.anatomyEngine))
        let engine = try #require(String(data: canonical, encoding: .utf8))
        #expect(engine.contains("SteadyLessonRenderedSamples"))
        for collection in collections {
            #expect(collection.runtime == .bundled)
            #expect(try Data(contentsOf: collection.resourceDirectory.appendingPathComponent(AnimatedTrainingCatalog.anatomyEngine)) == canonical)
            for animation in collection.animations.values {
                #expect(animation.injectedRuntimeResource == nil)
                #expect(animation.documentLayout == nil)
                #expect(!(animation.primaryMuscles ?? []).isEmpty || !(animation.secondaryMuscles ?? []).isEmpty || !(animation.stretchMuscles ?? []).isEmpty)
                let url = try #require(collection.artworkURL(for: animation.lessonID))
                #expect(try TrainingArtworkDocument.usesBundledAnatomy(at: url))
            }
        }
    }

    @Test func rejectsUnavailableDefaultView() throws {
        let candidate = try AnimatedTrainingCatalog.shouldersCandidate()
        let temporary = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.copyItem(at: candidate.resourceDirectory, to: temporary)
        defer { try? FileManager.default.removeItem(at: temporary) }
        let url = temporary.appendingPathComponent("shoulders-animations.json")
        var manifest = try #require(JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
        var animations = try #require(manifest["animations"] as? [[String: Any]])
        animations[0]["availableViews"] = ["side"]
        animations[0]["defaultView"] = "rear"
        manifest["animations"] = animations
        try JSONSerialization.data(withJSONObject: manifest).write(to: url)
        #expect(throws: (any Error).self) {
            try AnimatedTrainingCollection.load(directory: temporary, courseName: "tanchengyi-shoulders.json",
                manifestName: "shoulders-animations.json", runtime: .bundled)
        }
    }
    @Test func backKeepsWalkingCycleWithBundledAnatomy() throws {
        let candidate = try AnimatedTrainingCatalog.backCandidate()
        #expect(candidate.collection.lessons.count == 9)
        #expect(candidate.runtime == .bundled)
        #expect(candidate.animations.values.allSatisfy { $0.availableViews == nil && $0.defaultView == nil && $0.supportsSideSelection == nil })
        let walking = try #require(candidate.animations["back-walking"])
        #expect(walking.steps.map(\.startSeconds) == [0, 2.5, 5, 7.5])
        #expect(walking.playbackTiming.duration == 10000)
        #expect(try TrainingArtworkDocument.usesBundledAnatomy(at: #require(candidate.artworkURL(for: walking.lessonID))))
    }

    @Test func legsPreviewCrossingAndRejectOutOfStepPreview() throws {
        let candidate = try AnimatedTrainingCatalog.legsCandidate()
        #expect(candidate.collection.lessons.count == 20)
        #expect(candidate.runtime == .bundled)
        let cross = try #require(candidate.animations["legs-90-90-leg-extension"])
        #expect(abs(cross.steps[1].previewSeconds - 7.0 / 3) < 0.000001)
        #expect(cross.playbackTiming.effortStart == 1000)
        #expect(cross.playbackTiming.returnEnd == 6000)
        let temporary = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.copyItem(at: candidate.resourceDirectory, to: temporary)
        defer { try? FileManager.default.removeItem(at: temporary) }
        let manifestURL = temporary.appendingPathComponent("legs-animations.json")
        var manifest = try #require(JSONSerialization.jsonObject(with: Data(contentsOf: manifestURL)) as? [String: Any])
        var animations = try #require(manifest["animations"] as? [[String: Any]])
        var steps = try #require(animations[0]["steps"] as? [[String: Any]])
        steps[0]["previewTimeSeconds"] = 6.0
        animations[0]["steps"] = steps; manifest["animations"] = animations
        try JSONSerialization.data(withJSONObject: manifest).write(to: manifestURL)
        #expect(throws: (any Error).self) {
            try AnimatedTrainingCollection.load(directory: temporary, courseName: "tanchengyi-legs.json",
                manifestName: "legs-animations.json", runtime: .bundled)
        }
    }

    @Test func functionalKeepsSevenHipThrustStagesOnAnatomyCanvas() throws {
        let candidate = try AnimatedTrainingCatalog.functionalCandidate()
        #expect(candidate.runtime == .bundled)
        #expect(candidate.collection.lessons.count == 12)
        for animation in candidate.animations.values {
            #expect(animation.documentLayout == nil)
            #expect(animation.playbackTiming.returnEnd == 6000)
        }
        let hip = try #require(candidate.animations["functional-single-leg-hip-thrust"])
        #expect(hip.steps.count == 7)
        for (index, step) in hip.steps.enumerated() {
            #expect(hip.stepIndex(at: step.previewSeconds) == index)
        }
    }

    @Test func armsExtraUsesBundledAnatomyWithoutChangingStepCounts() throws {
        let candidate = try AnimatedTrainingCatalog.armsExtraCandidate()
        #expect(candidate.collection.lessons.count == 7)
        #expect(candidate.runtime == .bundled)
        let aerobic = try #require(candidate.animations["arms-extra-warmup-aerobic"])
        #expect(aerobic.steps.count == 11)
        #expect(aerobic.injectedRuntimeResource == nil)
        let curl = try #require(candidate.animations["arms-extra-standing-barbell-curl"])
        #expect(curl.injectedRuntimeResource == nil)
        let temporary = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.copyItem(at: candidate.resourceDirectory, to: temporary)
        defer { try? FileManager.default.removeItem(at: temporary) }
        try FileManager.default.removeItem(at: temporary.appendingPathComponent(AnimatedTrainingCatalog.anatomyEngine))
        #expect(throws: (any Error).self) {
            try AnimatedTrainingCollection.load(directory: temporary, courseName: "tanchengyi-arms-extra.json",
                manifestName: "arms-extra-complete-animations.json", requiredResources: [AnimatedTrainingCatalog.anatomyEngine], runtime: .bundled)
        }
    }
    @Test func shouldersCandidatePreservesMixedCycleLengths() throws {
        let candidate = try AnimatedTrainingCatalog.shouldersCandidate()
        #expect(candidate.runtime == .bundled)
        #expect(candidate.collection.lessons.count == 11)
        let lateral = try #require(candidate.animations["shoulders-lateral-raise"])
        #expect(lateral.primaryMuscles == ["三角肌中束"])
        #expect(lateral.secondaryMuscles == ["三角肌前束"])
        #expect(lateral.mistakeExplanation?.contains("右图 · 错误示范") == true)
        #expect(candidate.animations.values.allSatisfy { !($0.primaryMuscles ?? []).isEmpty || !($0.secondaryMuscles ?? []).isEmpty })
        let single = try #require(candidate.animations["shoulders-single-dumbbell-press"])
        #expect(single.playbackTiming.duration == 8000)
        #expect(single.playbackTiming.effortEnd == 1920)
        #expect(single.playbackTiming.returnStart == 5760)
        #expect(single.stepIndex(at: 7) == 3)
        #expect(candidate.animations.values.filter { $0.playbackTiming.duration == 6000 }.count == 10)
    }
    @Test func armsCandidateKeepsEightSecondPlayback() throws {
        let candidate = try AnimatedTrainingCatalog.armsCandidate()
        #expect(candidate.collection.lessons.count == 8)
        #expect(Set(candidate.animations.values.map(\.resource)).count == 7)
        for animation in candidate.animations.values {
            #expect(animation.playbackTiming.duration == 8000)
            #expect(animation.playbackTiming.returnEnd == 7200)
            #expect(animation.stepIndex(at: 7.5) == 4)
        }
    }

    @Test func rejectsMismatchedOrZeroLengthPlaybackTiming() throws {
        let candidate = try AnimatedTrainingCatalog.armsCandidate()
        let temporary = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.copyItem(at: candidate.resourceDirectory, to: temporary)
        defer { try? FileManager.default.removeItem(at: temporary) }
        let url = temporary.appendingPathComponent("arms-animations.json")
        let original = try Data(contentsOf: url)
        for invalid in [EquipmentTiming(), EquipmentTiming(effortStart: 1000, effortEnd: 1000,
            returnStart: 4300, returnEnd: 7200, duration: 8000)] {
            var manifest = try #require(JSONSerialization.jsonObject(with: original) as? [String: Any])
            var animations = try #require(manifest["animations"] as? [[String: Any]])
            animations[0]["timingMilliseconds"] = try JSONSerialization.jsonObject(with: JSONEncoder().encode(invalid))
            manifest["animations"] = animations
            try JSONSerialization.data(withJSONObject: manifest).write(to: url)
            #expect(throws: (any Error).self) {
                try AnimatedTrainingCollection.load(directory: temporary, courseName: "tanchengyi-arms.json",
                    manifestName: "arms-animations.json", runtime: .bundled)
            }
        }
    }
    @Test func chestCandidateLoadsItsBundledPlaybackDependencies() throws {
        let candidate = try AnimatedTrainingCatalog.chestCandidate()
        #expect(candidate.runtime == .bundled)
        #expect(candidate.collection.lessons.count == 13)
        #expect(candidate.animations.count == 13)
        for animation in candidate.animations.values {
            #expect(animation.durationSeconds == 6)
            #expect(animation.steps.count == 4)
        }
    }
    @Test func abdominalCandidateLoadsFromBuiltResourceBundle() throws {
        let candidate = try AnimatedTrainingCatalog.abdominalCandidate()
        #expect(candidate.collection.lessons.count == 10)
        #expect(candidate.animations.count == 10)
        for lesson in candidate.collection.lessons {
            let animation = try #require(candidate.animations[lesson.id])
            #expect(animation.durationSeconds == 6)
            #expect(candidate.artworkURL(for: lesson.id) != nil)
            for (index, step) in animation.steps.enumerated() {
                #expect(animation.stepIndex(at: step.previewSeconds) == index)
            }
        }
    }
}

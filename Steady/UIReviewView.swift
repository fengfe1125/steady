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
        case "workout": NavigationStack {
                if ProcessInfo.processInfo.arguments.contains("--workout-smoke"), let log = model.ongoingWorkout ?? model.workoutLogs.first {
                    WorkoutRunView(model: model, id: log.id)
                } else { WorkoutHubView(model: model) }
            }
            case "workout-finished-library":
                if let log = model.workoutLogs.first { NavigationStack { WorkoutRunView(model: model, id: log.id) } }
            case "exercise-library":
                if let library = ExerciseLibrary.shared {
                    let args = ProcessInfo.processInfo.arguments
                    let search = args.firstIndex(of: "--library-search").flatMap { args.indices.contains($0 + 1) ? args[$0 + 1] : nil } ?? ""
                    NavigationStack { List { LibraryMoveSection(library: library, search: search) { _ in } }.navigationTitle("选择动作").journalSurface() }
                }
            case "exercise-library-detail":
                if let library = ExerciseLibrary.shared, let entry = library.entry(id: "edb-0025") {
                    NavigationStack { LibraryExerciseDetail(entry: entry, library: library) { _ in } }
                }
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
            case "plan-catalog-unavailable":
                if let reference = try? JSONDecoder().decode(TeachingReference.self,
                    from: Data(#"{"kind":"collection","topic":"arms","lessonID":"missing-resource"}"#.utf8)) {
                    NavigationStack { ExerciseTeachingDestination(reference: reference) }
                }
            case "plan-catalog-empty-replacement":
                if let plan = try? PlanCatalogUIFixture.limitedPlan(), let context = plan.generationContext,
                   let entry = plan.sessions.first?.exercises.first(where: { $0.role == "main" }) {
                    ExerciseReplacementSheet(model: model, exercise: entry, context: context) { _, _ in }
                }
            case "lower-body-start", "lower-body-form-bodyweight", "lower-body-form-dumbbells", "lower-body-form-gym", "lower-body-form-chair", "lower-body-form-equipped-bodyweight":
                LowerBodyFormFixture(model: model, screen: screen)
            case "lower-body-replacement":
                LowerBodyReplacementFixture(model: model)
            case "lower-body-condition-changed":
                LowerBodyHistoryFixture(model: model)
            case "plan-equipment": PlanFormView(model: model)
            case "plan-catalog-draft":
                if let plan = try? PlanCatalogUIFixture.replacementPlan() {
                    NavigationStack { DraftView(model: model, initialPlan: plan) }
                }
            case "plan-catalog-edit":
                if let plan = try? PlanCatalogUIFixture.replacementPlan(), let session = plan.sessions.first {
                    NavigationStack { SessionEditView(model: model, plan: plan, sessionID: session.id) }
                }
            case "plan-catalog-legacy":
                NavigationStack { DraftView(model: model, initialPlan: PlanCatalogUIFixture.legacyPlan()) }
            case "plan-catalog-unknown":
                NavigationStack { DraftView(model: model, initialPlan: PlanCatalogUIFixture.unknownPlan()) }
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
                } else if screen.hasPrefix("video-reference-"),
                   let reference = try? VideoReferenceLesson.loadAll().first(where: { $0.id == String(screen.dropFirst("video-reference-".count)) }) {
                    NavigationStack { VideoReferenceTeachingView(reference: reference, initialMode: ProcessInfo.processInfo.arguments.contains("--reference-detail") ? .detail : (ProcessInfo.processInfo.arguments.contains("--reference-mistakes") ? .mistakes : .motion)) }
                } else if screen.hasPrefix("plan-catalog-route-"),
                   let plan = try? PlanCatalogUIFixture.teachingPlan(topic: String(screen.dropFirst("plan-catalog-route-".count))) {
                    NavigationStack { DraftView(model: model, initialPlan: plan) }
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
            if !screen.hasPrefix("lower-body-") { await model.load() }
        }
    }
}

/// Preview fixtures use the same catalog APIs as the product and never reach a cloud service.
private enum PlanCatalogUIFixture {
    static func limitedPlan() throws -> TrainingPlan {
        var preferences = UserPreferences(); preferences.availableEquipmentIDs = ["wall"]
        return try ExerciseCatalog.load().demoPlan(preferences: preferences, today: Date(), calendar: .current)
    }
    static func replacementPlan() throws -> TrainingPlan {
        let catalog = try ExerciseCatalog.load()
        let context = PlanGenerationContext(experience: "偶尔运动", availableEquipmentIDs: catalog.equipment.map(\.id), availableMinutes: 90)
        let main = try catalog.eligibleExercises(context: context, role: "main").first { item in
            let exercise = try catalog.makeExercise(id: item.id, role: "main", context: context)
            return !catalog.replacementCandidates(for: exercise, context: context).isEmpty
        }
        guard let main,
              let warmup = catalog.eligibleExercises(context: context, role: "warmup").first(where: { $0.id != main.id }),
              let cooldown = catalog.eligibleExercises(context: context, role: "cooldown").first(where: { $0.id != main.id && $0.id != warmup.id }) else {
            throw ServiceError.invalidResponse
        }
        let entries = try [(warmup, "warmup"), (main, "main"), (cooldown, "cooldown")].map {
            try catalog.makeExercise(id: $0.0.id, role: $0.1, context: context)
        }
        var plan = TrainingPlan(title: "动作目录验证", sessions: [WorkoutSession(title: "动作预览与替换", scheduledAt: Date(), minutes: 90, exercises: entries)])
        plan.generationContext = context
        try catalog.validateReplacement(in: plan)
        return plan
    }
    static func teachingPlan(topic: String) throws -> TrainingPlan {
        let catalog = try ExerciseCatalog.load()
        guard let item = catalog.exercises.first(where: {
            topic == "equipment" ? $0.defaultTeaching.kind == "equipment" : $0.defaultTeaching.topic == topic
        }) else { throw ServiceError.invalidResponse }
        var entry = Exercise(name: item.name, prescription: "教学入口验证，不作为训练处方。")
        entry.catalogID = item.id; entry.catalogVersion = catalog.catalogVersion
        return TrainingPlan(title: "教学路由验证", sessions: [WorkoutSession(title: item.name, scheduledAt: Date(), minutes: 25, exercises: [entry])])
    }
    static func legacyPlan() -> TrainingPlan {
        TrainingPlan(title: "旧计划验证", sessions: [WorkoutSession(title: "旧计划教学", scheduledAt: Date(), minutes: 25,
            exercises: [Exercise(name: "高位下拉", prescription: "保留原有计划文字"), Exercise(name: "轻哑铃划船", prescription: "没有明确变式，不自动推断教学")])])
    }
    static func unknownPlan() -> TrainingPlan {
        var entry = Exercise(name: "高位下拉", prescription: "保留未知目录动作原有文字")
        entry.catalogID = "unknown-catalog-exercise"; entry.catalogVersion = 1
        return TrainingPlan(title: "未知动作验证", sessions: [WorkoutSession(title: "未知目录动作", scheduledAt: Date(), minutes: 25, exercises: [entry])])
    }
}
private enum LowerBodyUIFixture {
    static func preferences(screen: String) throws -> UserPreferences {
        let catalog = try ExerciseCatalog.load(version: 2)
        var p = UserPreferences(); p.availableMinutes = 30; p.onboardingComplete = true
        switch screen {
        case "lower-body-form-dumbbells": p.equipment = "哑铃"; p.availableEquipmentIDs = ["dumbbells"]
        case "lower-body-form-chair", "lower-body-form-equipped-bodyweight": p.availableEquipmentIDs = ["stable-chair", "fixed-support"]
        case "lower-body-form-gym": p.equipment = "健身房"; p.availableEquipmentIDs = ["leg-press-machine", "leg-curl-machine"]
        default: p.availableEquipmentIDs = []
        }
        if screen != "lower-body-start" { p.movementConditions = (catalog.conditions ?? []).map { .init(conditionID: $0.id, version: $0.version, status: .ready) } }
        if screen == "lower-body-form-chair" {
            p.movementConditions?.removeAll { $0.conditionID == "basic-squat" }
            p.movementConditions?.append(.init(conditionID: "basic-squat", version: 1, status: .unable))
        }
        return p
    }
    static func plan() throws -> TrainingPlan {
        try ExerciseCatalog.load(version: 2).demoPlan(preferences: preferences(screen: "lower-body-form-dumbbells"), today: Date(), calendar: .current)
    }
}
private struct LowerBodyFormFixture: View {
    @Bindable var model: AppModel
    let screen: String
    @State private var prepared = false
    var body: some View {
        Group {
            if prepared { PlanFormView(model: model, programKind: "lowerBodyBasics") }
            else { ProgressView() }
        }.task {
            guard !prepared else { return }
            await model.load()
            if let p = try? LowerBodyUIFixture.preferences(screen: screen) { _ = model.savePreferences(p); prepared = true }
        }
    }
}
private struct LowerBodyReplacementFixture: View {
    @Bindable var model: AppModel
    @State private var savedPlan: TrainingPlan?
    var body: some View {
        Group {
            if let savedPlan, let context = savedPlan.generationContext,
               let entry = savedPlan.sessions.first?.exercises.first(where: { $0.catalogID == "floor-glute-bridge" }) {
                ExerciseReplacementSheet(model: model, exercise: entry, context: context) { _, _ in }
            } else { ProgressView() }
        }.task {
            guard savedPlan == nil else { return }
            await model.load()
            if let plan = try? LowerBodyUIFixture.plan(), var p = try? LowerBodyUIFixture.preferences(screen: "lower-body-form-dumbbells") {
                p.movementConditions?.removeAll { $0.conditionID == "hip-hinge" }
                p.movementConditions?.append(.init(conditionID: "hip-hinge", version: 1, status: .unsure))
                _ = model.savePreferences(p); savedPlan = plan
            }
        }
    }
}
private struct LowerBodyHistoryFixture: View {
    @Bindable var model: AppModel
    @State private var savedPlan: TrainingPlan?
    var body: some View {
        Group {
            if let savedPlan, let session = savedPlan.sessions.first {
                NavigationStack { WorkoutView(model: model, planID: savedPlan.id, sessionID: session.id) }
            } else { ProgressView() }
        }.task {
            guard savedPlan == nil else { return }
            await model.load()
            if let plan = try? LowerBodyUIFixture.plan(), model.savePlan(plan), var p = try? LowerBodyUIFixture.preferences(screen: "lower-body-form-dumbbells") {
                p.movementConditions?.removeAll { $0.conditionID == "floor-access" }
                _ = model.savePreferences(p); savedPlan = plan
            }
        }
    }
}

#endif

#if DEBUG && targetEnvironment(simulator)
/// Synthetic, isolated iOS persistence smoke. Not a replacement for XCUI interaction.
@MainActor enum WorkoutLoopSmoke {
    /// A finished in-memory workout of three library moves, for the finish screen's muscle map.
    static func seedFinishedLibraryWorkout(model: AppModel) throws {
        let library = try ExerciseLibrary.load()
        let moves = ["edb-0314", "edb-0150", "edb-0043"].compactMap(library.entry(id:)).map(WorkoutMove.init(library:))
        guard moves.count == 3 else { throw ServiceError.invalidResponse }
        var log = try WorkoutLog(template: WorkoutTemplate(title: "动作库示例训练", moves: moves), now: Date().addingTimeInterval(-2400))
        for e in log.exercises.indices {
            for s in log.exercises[e].sets.indices {
                log.exercises[e].sets[s].weightKG = 20; log.exercises[e].sets[s].reps = 10; log.exercises[e].sets[s].completedAt = Date()
            }
        }
        log.effort = 6; log.finish()
        guard model.saveWorkout(log, creating: true) else { throw ServiceError.invalidResponse }
    }
    static func run(model: AppModel, phase: String) throws {
        var checks = 0
        func check(_ ok: Bool, _ label: String) throws {
            guard ok else { throw ServiceError.invalidInput("iOS workout smoke: " + label) }
            checks += 1
        }
        if phase == "begin" {
            var move = WorkoutMove(name: "本地验收推举"); move.target.sets = 2; move.target.incrementKG = 2.5
            let template = WorkoutTemplate(title: "离线训练验收", moves: [move])
            try check(model.saveWorkoutTemplate(template), "template save")
            let id = model.startWorkout(template)
            try check(id != nil, "start")
            try check(model.startWorkout(template) == nil, "duplicate start prevented")
            model.error = nil
            guard var log = model.ongoingWorkout else { throw ServiceError.invalidResponse }
            log.exercises[0].sets[0].weightKG = 10; log.exercises[0].sets[0].reps = 12
            log.exercises[0].sets[0].completedAt = Date(); log.restUntil = Date().addingTimeInterval(90)
            try check(model.saveWorkout(log), "set save")
            log.pause(); try check(model.saveWorkout(log), "pause")
            log.resume(); log.restUntil = Date().addingTimeInterval(90); try check(model.saveWorkout(log), "resume")
            try check(model.ongoingWorkout?.completedSets == 1, "one completed set")
        } else if phase == "finish" {
            guard var log = model.ongoingWorkout else { throw ServiceError.invalidResponse }
            try check(log.completedSets == 1, "disk reopen")
            try check(log.exercises[0].sets[0].weightKG == 10 && log.exercises[0].sets[0].reps == 12, "actuals restored")
            log.exercises[0].sets[1].weightKG = 10; log.exercises[0].sets[1].reps = 12
            log.exercises[0].sets[1].completedAt = Date(); log.note = "合成验收数据"; log.effort = 5; log.finish()
            try check(model.saveWorkout(log), "finish persisted")
            try check(model.ongoingWorkout == nil && model.workoutLogs.first?.status == .completed, "completed state")
            try check(model.workoutLogs.first?.restUntil == nil, "rest cleared")
        } else if phase == "repeat" {
            guard let template = model.workoutTemplates.first else { throw ServiceError.invalidResponse }
            try check(model.workoutLogs.first?.status == .completed, "completed log restored")
            try check(WorkoutProgression.previous(move: template.moves[0], history: model.workoutLogs)?.sets.first?.weightKG == 10, "previous actuals")
            try check(WorkoutProgression.suggestion(move: template.moves[0], history: model.workoutLogs)?.weightKG == 12.5, "progression target")
            try check(model.startWorkout(template) != nil, "start next session")
            try check(model.workoutLogs.count == 2, "distinct history")
        } else { throw ServiceError.invalidInput("Unknown smoke phase") }
        let result: [String: Any] = ["phase": phase, "passedChecks": checks, "logs": model.workoutLogs.count]
        try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys]).write(to: URL.documentsDirectory.appending(path: "workout-smoke-" + phase + ".json"))
    }
}
#endif

import SwiftUI
import SteadyCore

/// Shared navigation and reference directory, staged for final topic acceptance.
enum AnimatedTrainingTopic: String, CaseIterable, Identifiable {
    case arms, chest, shoulders, abs, armsExtra = "arms-extra", functional, legs, back
    var id: String { rawValue }
    var title: String {
        switch self {
        case .arms: "手臂基础"
        case .chest: "胸部训练"
        case .shoulders: "肩部训练"
        case .abs: "腹部训练"
        case .armsExtra: "手臂补充"
        case .functional: "下肢功能训练"
        case .legs: "腿部训练"
        case .back: "背部训练"
        }
    }
    func load() throws -> AnimatedTrainingCollection {
        switch self {
        case .arms: try AnimatedTrainingCatalog.armsCandidate()
        case .chest: try AnimatedTrainingCatalog.chestCandidate()
        case .shoulders: try AnimatedTrainingCatalog.shouldersCandidate()
        case .abs: try AnimatedTrainingCatalog.abdominalCandidate()
        case .armsExtra: try AnimatedTrainingCatalog.armsExtraCandidate()
        case .functional: try AnimatedTrainingCatalog.functionalCandidate()
        case .legs: try AnimatedTrainingCatalog.legsCandidate()
        case .back: try AnimatedTrainingCatalog.backCandidate()
        }
    }
}

struct AnimatedTrainingCollectionsView: View {
    var body: some View {
        List {
            Section {
                Text("从热身开始，逐步学习动作、支撑和发力。动画与要领可离线查看。")
                    .foregroundStyle(SteadyTheme.secondary)
            }
            ForEach(AnimatedTrainingTopic.allCases) { topic in
                switch Result(catching: { try topic.load() }) {
                case .success(let bundle):
                    NavigationLink {
                        AnimatedTrainingCollectionView(bundle: bundle)
                    } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(topic.title).font(.headline)
                            Text(bundle.collection.subtitle).font(.subheadline).foregroundStyle(SteadyTheme.secondary)
                            Text("\(bundle.collection.lessons.count) 课 · 动画与分步讲解")
                                .font(.caption).foregroundStyle(SteadyTheme.secondary)
                        }.padding(.vertical, 6)
                    }.accessibilityIdentifier("animatedCollection_\(topic.id)")
                case .failure:
                    Label("\(topic.title)暂时无法打开", systemImage: "book.closed")
                        .accessibilityIdentifier("animatedCollectionError_\(topic.id)")
                }
            }
        }.journalSurface().navigationTitle("训练合集")
    }
}

/// Each candidate supplies validated timing; seconds in lesson steps become milliseconds in the bridge.
@MainActor @Observable final class TrainingAnimationPlayer {
    let animation: TrainingAnimation
    let resourceURL: URL
    let runtime: TrainingAnimationRuntime
    var timing: EquipmentTiming { animation.playbackTiming }
    var mode: EquipmentViewMode = .motion
    var view: TrainingAnimationView
    var side = "left"
    var time = 0.0
    var speed = 1.0
    var playing = false
    var ready = false
    var failed = false
    var documentHeight = 700.0
    var revision = 0
    private(set) var seekTime = 0.0
    private(set) var seekRevision = 0

    init(animation: TrainingAnimation, resourceURL: URL, runtime: TrainingAnimationRuntime) {
        self.view = animation.defaultView ?? .oblique
        self.runtime = runtime
        self.animation = animation
        self.resourceURL = resourceURL
    }
    func pause() { playing = false; revision += 1 }
    func togglePlayback() { playing.toggle(); revision += 1 }
    func seek(seconds: Double) {
        guard seconds.isFinite else { return }
        pause()
        time = min(max(seconds * 1000, 0), timing.duration)
        seekTime = time; seekRevision += 1
    }
}

struct AnimatedTrainingCollectionView: View {
    let bundle: AnimatedTrainingCollection
    var body: some View {
        List {
            Section {
                Text(bundle.collection.overview)
                Label(bundle.collection.equipment, systemImage: "dumbbell")
                    .font(.subheadline).foregroundStyle(SteadyTheme.secondary)
                Text(bundle.collection.trainingNote).font(.footnote).foregroundStyle(SteadyTheme.secondary)
            }
            ForEach(bundle.collection.sections) { section in
                Section(section.title) {
                    ForEach(section.lessons) { lesson in
                        if let animation = bundle.animations[lesson.id],
                           let url = bundle.artworkURL(for: lesson.id) {
                            NavigationLink {
                                AnimatedTrainingLessonView(lesson: lesson, animation: animation, resourceURL: url, runtime: bundle.runtime)
                            } label: {
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(lesson.title).font(.headline)
                                    Text(lesson.summary).font(.caption).foregroundStyle(SteadyTheme.secondary).lineLimit(2)
                                }
                            }.accessibilityIdentifier("animatedLesson_\(lesson.id)")
                        }
                    }
                }
            }
        }.journalSurface().navigationTitle(bundle.collection.title)
    }
}

struct AnimatedTrainingLessonView: View {
    let lesson: TrainingLesson
    @State private var player: TrainingAnimationPlayer
    @Environment(\.accessibilityReduceMotion) private var systemReduceMotion
    private var reduceMotion: Bool {
        #if DEBUG && targetEnvironment(simulator)
        systemReduceMotion || ProcessInfo.processInfo.arguments.contains("--training-reduce-motion")
        #else
        systemReduceMotion
        #endif
    }
    @Environment(\.scenePhase) private var scenePhase

    init(lesson: TrainingLesson, animation: TrainingAnimation, resourceURL: URL, runtime: TrainingAnimationRuntime = .hostInjected, initialMode: EquipmentViewMode = .motion) {
        self.lesson = lesson
        let player = TrainingAnimationPlayer(animation: animation, resourceURL: resourceURL, runtime: runtime)
        player.mode = initialMode
        _player = State(initialValue: player)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text(lesson.summary).foregroundStyle(SteadyTheme.secondary)
                VideoReferenceTeachingLink(existingLessonID: lesson.id)
                Picker("图解", selection: $player.mode) {
                    ForEach(EquipmentViewMode.allCases) { Text($0.title).tag($0) }
                }.pickerStyle(.segmented).onChange(of: player.mode) { _, mode in
                    if mode == .motion { autoplay() } else { player.pause() }
                }
                if let views = player.animation.availableViews {
                    Picker("观察视角", selection: $player.view) {
                        ForEach(views, id: \.self) { Text($0.title).tag($0) }
                    }.pickerStyle(.segmented).onChange(of: player.view) { _, _ in player.pause() }
                        .accessibilityIdentifier("trainingView")
                }
                if player.animation.supportsSideSelection == true {
                    Picker("示范侧", selection: $player.side) {
                        Text("左侧").tag("left")
                        Text("右侧").tag("right")
                    }.pickerStyle(.segmented).onChange(of: player.side) { _, _ in player.pause() }
                        .accessibilityIdentifier("trainingSide")
                }
                TrainingAnimationArtwork(player: player)
                    .frame(height: player.animation.documentLayout == true ? player.documentHeight :
                        (player.runtime == .bundled ? 360 : (player.mode == .mistakes ? 240 : 280)))
                    .overlay {
                        if canTapToPlay {
                            Color.clear.contentShape(Rectangle()).onTapGesture { player.togglePlayback() }
                        }
                    }
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("\(lesson.title)原创图解" + (muscleSummary.map { "，\($0)" } ?? ""))
                    .accessibilityValue(canTapToPlay ? (player.playing ? "播放中" : "已暂停") : "")
                    .accessibilityHint(canTapToPlay ? "轻点暂停或继续播放" : "")
                    .accessibilityAddTraits(canTapToPlay ? .isButton : [])
                    .accessibilityAction { if canTapToPlay { player.togglePlayback() } }
                    .accessibilityIdentifier("trainingArtwork")
                if let muscleSummary {
                    Label(muscleSummary, systemImage: "figure.strengthtraining.traditional")
                        .font(.subheadline).foregroundStyle(SteadyTheme.secondary)
                        .accessibilityIdentifier("trainingMuscles")
                }
                if player.failed {
                    Text("图解暂时无法加载，仍可阅读下方步骤。返回后重新打开此动作可重试。")
                        .foregroundStyle(SteadyTheme.secondary)
                }
                if player.mode == .motion {
                    HStack {
                        Button(player.playing ? "暂停" : "播放") { player.togglePlayback() }
                            .disabled(!player.ready || reduceMotion)
                            .accessibilityIdentifier("trainingPlayback")
                        Spacer()
                        Button(player.speed == 1 ? "慢放 0.5×" : "恢复 1×") { player.speed = player.speed == 1 ? 0.5 : 1 }
                            .accessibilityIdentifier("trainingSpeed")
                    }.buttonStyle(.bordered)
                    HStack {
                        Text(String(format: "%.1f / %.1f 秒", player.time / 1000, player.animation.durationSeconds))
                            .font(.caption.monospacedDigit()).accessibilityIdentifier("trainingTime")
                        Spacer()
                        // The hint sits outside the picture so nothing covers the drawing.
                        if canTapToPlay {
                            Text(player.playing ? "轻点画面暂停" : "轻点画面播放").font(.caption).foregroundStyle(SteadyTheme.secondary)
                        }
                    }
                    Slider(value: Binding(get: { player.time / 1000 }, set: { player.seek(seconds: $0) }),
                           in: 0...player.animation.durationSeconds)
                        .disabled(!player.ready).accessibilityLabel("动作进度")
                    if reduceMotion { Text("已减少动态效果，点击步骤查看静态姿势。").font(.footnote) }
                    ForEach(Array(player.animation.steps.enumerated()), id: \.offset) { index, step in
                        Button {
                            player.seek(seconds: step.previewSeconds)
                        } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                Label("\(index + 1). \(step.title)", systemImage:
                                    player.animation.stepIndex(at: player.time / 1000) == index ? "checkmark.circle.fill" : "circle")
                                    .font(.headline).foregroundStyle(SteadyTheme.primary)
                                Text(step.instruction).foregroundStyle(SteadyTheme.secondary)
                            }.frame(maxWidth: .infinity, alignment: .leading)
                        }.buttonStyle(.plain).disabled(!player.ready)
                            .accessibilityIdentifier("trainingStep_\(index)")
                    }
                }
                if player.mode == .detail, let explanation = player.animation.detailExplanation {
                    Text(explanation).accessibilityIdentifier("trainingDetailExplanation")
                }
                if player.mode == .mistakes, let explanation = player.animation.mistakeExplanation {
                    Text(explanation).accessibilityIdentifier("trainingMistakeExplanation")
                }
                Text("训练安排").font(.title3.bold()).foregroundStyle(SteadyTheme.primary)
                Text(lesson.dosage)
                notes("准备与支撑", lesson.preparation)
                notes("动作要点与呼吸", lesson.cues)
                notes("常见错误", lesson.mistakes)
                notes("补充说明", lesson.supplements)
                if !lesson.checks.isEmpty {
                    Text("开始前检查").font(.title3.bold()).foregroundStyle(SteadyTheme.primary)
                    ForEach(Array(lesson.checks.enumerated()), id: \.offset) { _, check in Text(check) }
                }
            }.padding()
        }.journalSurface().navigationTitle(lesson.title).navigationBarTitleDisplayMode(.inline)
            .onAppear { autoplay() }
            .onChange(of: reduceMotion) { _, enabled in if enabled { player.pause() } }
            .onChange(of: scenePhase) { _, phase in if phase != .active { player.pause() } }
            .onDisappear { player.pause() }
    }

    private var canTapToPlay: Bool { player.mode == .motion && player.ready && !player.failed && !reduceMotion }

    /// Opening a lesson (or returning to 全身动作) plays the animation unless motion is reduced.
    /// The command is queued until the web view reports ready.
    private func autoplay() {
        guard player.mode == .motion, !reduceMotion, !player.failed else { return }
        player.playing = true; player.revision += 1
    }

    private var muscleSummary: String? {
        let animation = player.animation
        return trainingMuscleSummary(primary: animation.primaryMuscles, stretch: animation.stretchMuscles, secondary: animation.secondaryMuscles)
    }

    @ViewBuilder private func notes(_ title: String, _ values: [TrainingNote]) -> some View {
        if !values.isEmpty {
            Text(title).font(.title3.bold()).foregroundStyle(SteadyTheme.primary)
            ForEach(Array(values.enumerated()), id: \.offset) { _, note in
                VStack(alignment: .leading, spacing: 5) {
                    Text(note.title).font(.headline).foregroundStyle(SteadyTheme.primary)
                    Text(note.detail).foregroundStyle(SteadyTheme.secondary)
                }
            }
        }
    }
}

/// Which muscles the artwork colours, so the highlight is also readable as text.
func trainingMuscleSummary(primary: [String]?, stretch: [String]?, secondary: [String]?) -> String? {
    let parts = [("主要发力", primary), ("拉伸", stretch), ("协同", secondary)]
        .compactMap { title, names in names.flatMap { $0.isEmpty ? nil : "\(title)：\($0.joined(separator: "、"))" } }
    return parts.isEmpty ? nil : parts.joined(separator: " · ")
}


/// A separately attributed example keeps original course narration and video timestamps intact.
struct VideoReferenceTeachingLink: View {
    let existingLessonID: String
    var body: some View {
        if let reference = VideoReferenceLesson.matching(lessonID: existingLessonID) {
            NavigationLink {
                VideoReferenceTeachingView(reference: reference)
            } label: {
                Label("变体示范：\(reference.variant)", systemImage: "figure.strengthtraining.traditional")
            }.accessibilityIdentifier("videoReference_\(reference.id)")
        }
    }
}

struct VideoReferenceTeachingView: View {
    let reference: VideoReferenceLesson
    var initialMode: EquipmentViewMode = .motion
    var body: some View {
        if let url = reference.artworkURL {
            AnimatedTrainingLessonView(lesson: reference.lesson, animation: reference.animation, resourceURL: url, runtime: .bundled, initialMode: initialMode)
        } else {
            ContentUnavailableView("示范暂时无法打开", systemImage: "book.closed", description: Text("请返回原动作教学。"))
        }
    }
}

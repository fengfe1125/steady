import SwiftUI
import SteadyCore

struct EquipmentLibraryView: View {
    @State private var selectedLesson: EquipmentLessonID?
    var body: some View {
        List {
            Section { Text("先认识器材，再跟着步骤学。\n选择器械或哑铃动作，查看动作和细节图解。").foregroundStyle(.secondary) }
            ForEach(EquipmentLessonDefinition.groups, id: \.self) { group in
                Section(group) {
                    ForEach(EquipmentLessonID.equipmentLibrary.filter { EquipmentLessonDefinition.lesson($0).group == group }) { lesson in
                        let definition = EquipmentLessonDefinition.lesson(lesson)
                        Button { selectedLesson = lesson } label: {
                            HStack(spacing: 16) {
                                // Drawn from the lesson's own animation at its working position (tools/anatomy/icons.mjs).
                                Image("equipment-\(lesson.rawValue)").resizable().scaledToFit()
                                    .frame(width: 52, height: 52).background(SteadyTheme.soft)
                                    .clipShape(RoundedRectangle(cornerRadius: 14))
                                    .accessibilityHidden(true)
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(lesson.title).font(.headline)
                                    Text(definition.subtitle).font(.subheadline).foregroundStyle(.secondary)
                                }
                                Spacer(minLength: 4)
                                Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(.tertiary)
                            }.padding(.vertical, 8)
                        }.buttonStyle(.plain).accessibilityIdentifier("equipmentLesson_\(lesson.rawValue)")
                    }
                }
            }
            Section { Text("图解可以离线查看。器械先按机身说明调整；哑铃先选轻重量，确认握法、支撑和安全放回方式。").font(.footnote).foregroundStyle(.secondary) }
        }.journalSurface().navigationTitle("健身房器材")
            .navigationDestination(item: $selectedLesson) { lesson in
                EquipmentLessonView(lesson: lesson)
            }
    }
}

@MainActor @Observable final class EquipmentPlayer {
    var mode: EquipmentViewMode = .motion
    var time: Double = 0
    var speed: Double = 1
    var playing = false
    var ready = false
    var failed = false
    var revision = 0
    private(set) var seekRevision = 0
    private(set) var seekTime: Double = 0

    let definition: EquipmentLessonDefinition
    let usesBundledAnatomy: Bool
    let artworkExplanations: TrainingArtworkExplanations?
    init(lesson: EquipmentLessonID) {
        definition = .lesson(lesson)
        if let url = Bundle.main.url(forResource: definition.resource, withExtension: "html") {
            usesBundledAnatomy = (try? TrainingArtworkDocument.usesBundledAnatomy(at: url)) == true
            artworkExplanations = try? TrainingArtworkDocument.anatomyExplanations(at: url, lessonID: lesson.rawValue)
        } else {
            usesBundledAnatomy = false
            artworkExplanations = nil
        }
    }
    var phase: String { definition.phase(at: time) }

    func pause() { playing = false; revision += 1 }
    func togglePlayback() { playing.toggle(); revision += 1 }
    func toggleSpeed() { speed = speed == 1 ? 0.5 : 1; revision += 1 }
    func seek(_ value: Double) {
        time = min(max(value, 0), definition.timing.duration); seekTime = time
        playing = false; seekRevision += 1; revision += 1
    }
    func show(_ mode: EquipmentViewMode) {
        self.mode = mode; pause()
    }
}

struct EquipmentLessonView: View {
    let lesson: EquipmentLessonID
    @State private var player: EquipmentPlayer
    @State private var stepIndex = 0
    @State private var checks: Set<Int> = []
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.dynamicTypeSize) private var typeSize
    private var motionReduced: Bool {
        #if DEBUG && targetEnvironment(simulator)
        reduceMotion || ProcessInfo.processInfo.arguments.contains("--equipment-reduce-motion")
        #else
        reduceMotion
        #endif
    }
    private var definition: EquipmentLessonDefinition { player.definition }
    private var step: EquipmentStep { definition.steps[stepIndex] }

    init(lesson: EquipmentLessonID, initialMode: EquipmentViewMode = .motion) {
        self.lesson = lesson
        let player = EquipmentPlayer(lesson: lesson)
        player.show(initialMode)
        _player = State(initialValue: player)
        _stepIndex = State(initialValue: initialMode == .detail ? 1 : 0)
    }

    var body: some View {
        ScrollViewReader { scroll in
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("先看一遍，再跟着学").font(.title2.weight(.semibold))
                        Text(definition.subtitle).font(.subheadline).foregroundStyle(.secondary)
                        Text(definition.structure).font(.footnote).foregroundStyle(.secondary)
                    }
                    VStack(alignment: .leading, spacing: 16) {
                        modeSelector
                        artwork
                        if player.mode == .motion, let muscles = muscleSummary {
                            Label(muscles, systemImage: "figure.strengthtraining.traditional")
                                .font(.subheadline).foregroundStyle(.secondary)
                                .accessibilityIdentifier("lessonMuscles")
                        }
                        if player.mode == .motion { playbackControls }
                        else if player.mode == .detail { detailNotes }
                        else { mistakeNotes }
                    }.id("player")
                    guide(scroll: scroll)
                    selfCheck.id("selfCheck")
                    sources
                }.padding(20)
            }.background(SteadyTheme.background)
                .navigationTitle(lesson.title).navigationBarTitleDisplayMode(.inline)
                .toolbar(.hidden, for: .tabBar)
                .onAppear { autoplay() }
                .onDisappear { player.pause() }
                .onChange(of: scenePhase) { _, phase in if phase != .active { player.pause() } }
                .onChange(of: reduceMotion) { _, reduced in if reduced { player.pause() } }
        }
    }

    /// Opening the lesson (or returning to 全身动作) plays the animation unless motion is reduced.
    private func autoplay() {
        guard !motionReduced, player.mode == .motion, !player.failed else { return }
        player.playing = true; player.revision += 1
    }

    private var muscleSummary: String? {
        let names = player.artworkExplanations
        return trainingMuscleSummary(primary: names?.primaryMuscles, stretch: names?.stretchMuscles, secondary: names?.secondaryMuscles)
    }

    private var canTapToPlay: Bool { player.mode == .motion && player.ready && !player.failed && !motionReduced }

    private var modeSelector: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 0) { modeButtons }
            VStack(alignment: .leading, spacing: 4) { modeButtons }
        }
        .background(SteadyTheme.soft, in: RoundedRectangle(cornerRadius: 12))
    }

    @ViewBuilder private var modeButtons: some View {
        ForEach(EquipmentViewMode.allCases) { mode in
            Button {
                player.show(mode)
                if mode == .detail { stepIndex = 1 }
                else if mode == .motion && stepIndex == 1 { stepIndex = 0; player.seek(0) }
                if mode == .motion { autoplay() }
            } label: {
                Text(mode.title).font(.subheadline.weight(player.mode == mode ? .semibold : .regular))
                    .fixedSize().frame(maxWidth: .infinity, minHeight: 44)
                    .background(player.mode == mode ? SteadyTheme.card : .clear, in: RoundedRectangle(cornerRadius: 10))
            }.buttonStyle(.plain).padding(3)
                .foregroundStyle(player.mode == mode ? SteadyTheme.primary : SteadyTheme.secondary)
                .accessibilityAddTraits(player.mode == mode ? .isSelected : [])
                .accessibilityIdentifier("lessonMode_\(mode.rawValue)")
        }
    }

    private var artwork: some View {
        VStack(alignment: .leading, spacing: 0) {
            if player.mode == .motion {
                HStack { Text(definition.machine); Spacer(); Text(definition.viewLabel) }
                    .font(.caption).foregroundStyle(.secondary).padding([.top, .horizontal], 16)
            } else if player.mode == .detail {
                Text(definition.detailTitle).accessibilityIdentifier("lessonDetailTitle").font(.headline).padding([.top, .horizontal], 16)
            }
            if player.usesBundledAnatomy {
                artworkCanvas.aspectRatio(1, contentMode: .fit)
            } else {
                artworkCanvas.frame(height: player.mode == .motion ? 300 : player.mode == .detail ? 260 : 130)
            }
            if player.mode == .motion {
                HStack {
                    Text(player.phase).font(.subheadline.weight(.medium)).foregroundStyle(SteadyTheme.primary)
                        .accessibilityIdentifier("lessonPhase")
                    Spacer()
                    Text(player.playing ? "轻点画面暂停" : "轻点画面播放").font(.caption).foregroundStyle(.secondary)
                }.padding([.bottom, .horizontal], 16)
            }
        }.background(SteadyTheme.soft, in: RoundedRectangle(cornerRadius: 24))
            .clipShape(RoundedRectangle(cornerRadius: 24))
    }

    private var artworkCanvas: some View {
        ZStack {
            EquipmentArtwork(player: player).accessibilityHidden(true)
            if canTapToPlay {
                Color.clear.contentShape(Rectangle()).onTapGesture { player.togglePlayback() }
                    .accessibilityHidden(true)
            }
            if !player.ready && !player.failed { ProgressView("正在打开图解") }
            if player.failed {
                ContentUnavailableView("图解暂时无法打开", systemImage: "exclamationmark.triangle",
                                       description: Text("可以先阅读下面的动作步骤，再重新进入此页。"))
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("动作图解")
        .accessibilityValue(canTapToPlay ? (player.playing ? "播放中" : "已暂停") : "")
        .accessibilityHint(canTapToPlay ? "轻点暂停或继续播放" : "")
        .accessibilityAction { if canTapToPlay { player.togglePlayback() } }
        .accessibilityIdentifier("lessonArtwork")
    }

    private var playbackControls: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 14) {
                Button { player.togglePlayback() } label: {
                    Image(systemName: player.playing ? "pause.fill" : "play.fill")
                        .frame(width: 46, height: 46)
                        .background(SteadyTheme.primary, in: Circle()).foregroundStyle(SteadyTheme.background)
                }.buttonStyle(.plain).disabled(!player.ready || player.failed)
                    .accessibilityLabel(player.playing ? "暂停动画" : "播放动画")
                    .accessibilityIdentifier("lessonPlayback")
                Slider(value: Binding(get: { player.time }, set: { player.seek($0) }), in: 0...6000)
                    .tint(SteadyTheme.primary).disabled(!player.ready || player.failed)
                    .accessibilityLabel("动画进度")
                    .accessibilityValue(String(format: "%.1f 秒，共 6 秒", player.time / 1000))
                    .accessibilityIdentifier("lessonProgress")
                Button { player.toggleSpeed() } label: {
                    Text(player.speed == 1 ? "1×" : "0.5×").font(.subheadline.monospacedDigit())
                        .padding(.horizontal, 12).frame(minHeight: 44)
                        .background(SteadyTheme.soft, in: RoundedRectangle(cornerRadius: 10))
                }.buttonStyle(.plain).accessibilityLabel("切换播放速度")
                    .accessibilityValue(player.speed == 1 ? "1 倍" : "0.5 倍")
                    .accessibilityIdentifier("lessonSpeed")
            }
            HStack(alignment: .top) {
                Text(player.playing ? "循环播放 · 一次完整动作 6 秒" : "已暂停 · 可拖动查看静态姿势")
                Spacer(minLength: 8)
                Text(String(format: "%.1f / 6s", player.time / 1000)).monospacedDigit()
                    .accessibilityIdentifier("lessonTime")
            }.font(.caption).foregroundStyle(.secondary)
        }
    }

    private var detailNotes: some View {
        VStack(alignment: .leading, spacing: 14) {
            if let explanation = player.artworkExplanations?.detailExplanation {
                Text(explanation).font(.subheadline).accessibilityIdentifier("lessonDetailExplanation")
                Divider()
            }
            ForEach(definition.details.indices, id: \.self) { index in
                if player.usesBundledAnatomy {
                    supplementaryNote(definition.details[index].title, definition.details[index].detail)
                } else {
                    numberedNote(index + 1, definition.details[index].title, definition.details[index].detail)
                }
            }
            Text(definition.detailCaption).font(.footnote).foregroundStyle(.secondary)
        }.accessibilityElement(children: .contain).accessibilityIdentifier("lessonDetailNotes")
    }

    private func numberedNote(_ number: Int, _ title: String, _ detail: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(number)").font(.caption.weight(.semibold)).frame(width: 26, height: 26)
                .background(SteadyTheme.soft, in: Circle()).foregroundStyle(SteadyTheme.primary)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.subheadline.weight(.medium))
                Text(detail).font(.footnote).foregroundStyle(.secondary)
            }
        }.accessibilityElement(children: .combine)
    }

    private var mistakeNotes: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let explanation = player.artworkExplanations?.mistakeExplanation {
                Text(explanation).font(.subheadline).accessibilityIdentifier("lessonMistakeExplanation")
            } else {
                HStack(alignment: .top, spacing: 20) {
                    Label(definition.comparison[0], systemImage: "checkmark.circle")
                    Label(definition.comparison[1], systemImage: "xmark.circle")
                }.font(.subheadline).foregroundStyle(SteadyTheme.primary)
            }
            Divider()
            ForEach(definition.mistakes.indices, id: \.self) { index in
                if player.usesBundledAnatomy {
                    supplementaryNote(definition.mistakes[index].title, definition.mistakes[index].detail)
                } else {
                    numberedNote(index + 1, definition.mistakes[index].title, definition.mistakes[index].detail)
                }
            }
        }.accessibilityElement(children: .contain).accessibilityIdentifier("lessonMistakeNotes")
    }

    private func supplementaryNote(_ title: String, _ detail: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.subheadline.weight(.medium))
            Text(detail).font(.footnote).foregroundStyle(.secondary)
        }.accessibilityElement(children: .combine)
    }

    private func guide(scroll: ScrollViewProxy) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("跟着步骤看").font(.title3.weight(.semibold))
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: typeSize.isAccessibilitySize ? 2 : 4), spacing: 8) {
                ForEach(0..<definition.steps.count, id: \.self) { index in
                    Button { selectStep(index); scrollToPlayer(scroll) } label: {
                        Text("\(index + 1) \(definition.steps[index].name)").font(.subheadline)
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .background(stepIndex == index ? SteadyTheme.primary : SteadyTheme.soft, in: RoundedRectangle(cornerRadius: 10))
                            .foregroundStyle(stepIndex == index ? SteadyTheme.background : SteadyTheme.primary)
                    }.buttonStyle(.plain).accessibilityAddTraits(stepIndex == index ? .isSelected : [])
                        .accessibilityIdentifier("lessonStep_\(index)")
                }
            }
            Text(step.title).font(.headline).accessibilityIdentifier("lessonStepTitle")
            Text(step.text).font(.subheadline).foregroundStyle(.secondary)
            ForEach(step.points, id: \.self) { point in
                HStack(alignment: .top, spacing: 10) {
                    Text("·").foregroundStyle(SteadyTheme.primary)
                    Text(point).font(.subheadline)
                }
            }
            JournalCard {
                Text("怎么确认？").font(.subheadline.weight(.medium))
                Text(step.question).font(.subheadline).foregroundStyle(.secondary)
            }
            Label(step.hint, systemImage: "info.circle").font(.footnote).foregroundStyle(.secondary)
            HStack {
                Button("上一步") { selectStep(stepIndex - 1); scrollToPlayer(scroll) }
                    .disabled(stepIndex == 0).frame(minHeight: 44)
                Spacer()
                Button(stepIndex == 3 ? "开始前自查" : "下一步：\(definition.steps[stepIndex + 1].name)") {
                    if stepIndex == 3 { scroll.scrollTo("selfCheck", anchor: .top) }
                    else { selectStep(stepIndex + 1); scrollToPlayer(scroll) }
                }.buttonStyle(.borderedProminent).tint(SteadyTheme.button).foregroundStyle(SteadyTheme.primary)
                    .accessibilityIdentifier("lessonNextStep")
            }
        }
    }

    private func selectStep(_ index: Int) {
        stepIndex = index
        player.show(step.mode); player.seek(step.time)
    }

    private func scrollToPlayer(_ scroll: ScrollViewProxy) {
        withAnimation(motionReduced ? nil : .easeOut(duration: 0.25)) { scroll.scrollTo("player", anchor: .top) }
    }

    private var selfCheck: some View {
        VStack(alignment: .leading, spacing: 16) {
            Divider()
            Text("开始前，再确认一次").font(.title3.weight(.semibold))
            let items = definition.checks
            ForEach(items.indices, id: \.self) { index in
                Button {
                    if checks.contains(index) { checks.remove(index) } else { checks.insert(index) }
                } label: {
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: checks.contains(index) ? "checkmark.square.fill" : "square")
                            .font(.title2).foregroundStyle(SteadyTheme.primary)
                        VStack(alignment: .leading, spacing: 6) {
                            Text(items[index].title).font(.subheadline.weight(.medium))
                            Text(items[index].detail).font(.footnote).foregroundStyle(.secondary)
                        }.frame(maxWidth: .infinity, alignment: .leading)
                    }.padding(.vertical, 4).frame(minHeight: 44)
                }.buttonStyle(.plain).accessibilityValue(checks.contains(index) ? "已确认" : "未确认")
                    .accessibilityIdentifier("lessonCheck_\(index)")
            }
            Text("\(checks.count) / 3 已确认 · 这是自查，不是系统对姿势的判断")
                .font(.caption).foregroundStyle(.secondary).accessibilityIdentifier("lessonCheckSummary")
        }
    }

    private var sources: some View {
        VStack(alignment: .leading, spacing: 12) {
            Divider()
            Text(definition.scope).font(.footnote).foregroundStyle(.secondary)
            if !lesson.isArmSupplement { DisclosureGroup("教学参考") {
                VStack(alignment: .leading, spacing: 14) {
                    ForEach(definition.references, id: \.url) { reference in
                        Link(reference.title, destination: reference.url)
                    }
                }.font(.footnote).padding(.vertical, 8)
            }.font(.footnote) }
        }
    }
}

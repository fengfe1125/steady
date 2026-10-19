import SwiftUI
import SteadyCore

private struct WorkoutRoute: Identifiable { let id: UUID }
private struct SetRoute: Identifiable { let exercise: UUID; let id: UUID }

struct WorkoutHubView: View {
    @Bindable var model: AppModel
    @State private var create = false
    var body: some View {
        List {
            if model.ongoingWorkout != nil {
                Section("进行中的训练") {
                    ForEach(model.workoutLogs.filter(\.isOngoing)) { log in
                        NavigationLink(log.title) { WorkoutRunView(model: model, id: log.id) }.accessibilityIdentifier("continueWorkout")
                    }
                    if model.workoutLogs.filter(\.isOngoing).count > 1 {
                        Text("多台设备各有未结束训练，记录均已保留。请先结束或放弃多余的训练，再开始新训练。").font(.footnote)
                    }
                }
            }
            Section {
                Button("开始训练 / 新建模板") { create = true }.accessibilityIdentifier("newWorkout")
                NavigationLink("训练历史") { WorkoutHistoryView(model: model) }
            }
            if model.journal.preferences.cloudSync && model.syncDetails.workoutSyncAvailable == false {
                Section { Text("服务端尚未启用训练日志同步；新训练完整保存在本机，原有健康与计划同步继续可用。").font(.footnote) }
            }
            Section("我的训练模板") {
                if model.workoutTemplates.isEmpty { Text("选择动作，保存你自己的训练安排。").foregroundStyle(.secondary) }
                ForEach(model.workoutTemplates) { template in
                    NavigationLink(template.title) { WorkoutTemplateView(model: model, template: template) }
                        .swipeActions { Button("删除模板", role: .destructive) { _ = model.deleteWorkout(id: template.id, template: true) } }
                }
            }
            Section { Text("本机即可记录，无需账户、网络或 AI。教学与训练建议不代替医疗建议。").font(.footnote).foregroundStyle(.secondary) }
        }.navigationTitle("我的训练").journalSurface()
            .sheet(isPresented: $create) { NavigationStack { WorkoutTemplateView(model: model) } }
    }
}

struct WorkoutTemplateView: View {
    @Bindable var model: AppModel
    @State var template: WorkoutTemplate
    @State private var picking = false
    @State private var run: WorkoutRoute?
    @State private var saved = false
    @Environment(\.dismiss) private var dismiss
    init(model: AppModel, template: WorkoutTemplate? = nil) {
        self.model = model; _template = State(initialValue: template ?? WorkoutTemplate(title: "我的训练", moves: []))
    }
    var body: some View {
        Form {
            Section("训练名称") { TextField("训练名称", text: $template.title).accessibilityIdentifier("workoutTitle") }
            Section("动作 · 可拖动排序") {
                ForEach($template.moves) { $move in
                    NavigationLink { WorkoutMoveEditor(move: $move) } label: {
                        VStack(alignment: .leading) { Text(move.name); Text(targetText(move)).font(.caption).foregroundStyle(.secondary) }
                    }
                }.onMove { template.moves.move(fromOffsets: $0, toOffset: $1) }
                    .onDelete { template.moves.remove(atOffsets: $0) }
                Button("添加动作") { picking = true }.accessibilityIdentifier("addWorkoutMove")
            }
            Section {
                Button("保存模板") { saved = model.saveWorkoutTemplate(template) }.disabled(template.moves.isEmpty).accessibilityIdentifier("saveWorkoutTemplate")
                if saved { Text("模板已保存").foregroundStyle(.secondary) }
                Button("开始这次训练") {
                    if model.saveWorkoutTemplate(template), let id = model.startWorkout(template) { run = WorkoutRoute(id: id) }
                }.disabled(template.moves.isEmpty || model.ongoingWorkout != nil).accessibilityIdentifier("startWorkout")
                if model.ongoingWorkout != nil { Text("请先继续或结束当前训练。").font(.footnote) }
            }
        }.navigationTitle("训练模板").journalSurface()
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("关闭") { dismiss() } }; ToolbarItem(placement: .primaryAction) { EditButton() } }
            .sheet(isPresented: $picking) { NavigationStack { WorkoutMovePicker { template.moves.append($0); saved = false } } }
            .sheet(item: $run) { route in NavigationStack { WorkoutRunView(model: model, id: route.id) } }
            .alert("暂时无法保存", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) { Button("知道了") { model.error = nil } } message: { Text(model.error ?? "") }
    }
}

private func targetText(_ move: WorkoutMove) -> String {
    let amount = move.metric == .duration ? "\(move.target.durationSeconds) 秒" : "\(move.target.minReps)–\(move.target.maxReps) 次"
    return "\(move.target.sets) 组 × \(amount)\(move.perSide ? " / 每侧" : "") · 休息 \(move.target.restSeconds) 秒"
}

private struct WorkoutMovePicker: View {
    var add: (WorkoutMove) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var search = ""
    @State private var equipment = ""
    @State private var customName = ""
    @State private var metric: WorkoutMetric = .weightReps
    @State private var scope = Scope.catalog
    @State private var library: ExerciseLibrary?
    @State private var libraryUnavailable = false
    private enum Scope: Hashable { case catalog, library }
    private let catalog = try? ExerciseCatalog.load(version: 2)
    var matches: [CatalogExercise] {
        catalog?.exercises.filter { e in
            (equipment.isEmpty || e.equipment.contains(equipment)) && (search.isEmpty || ([e.name] + e.aliases).contains { $0.localizedCaseInsensitiveContains(search) })
        } ?? []
    }
    var body: some View {
        List {
            Section {
                Picker("动作来源", selection: $scope) {
                    Text("审核目录").tag(Scope.catalog)
                    Text("动作库").tag(Scope.library)
                }.pickerStyle(.segmented).accessibilityIdentifier("moveScope")
            }
            if scope == .library {
                if let library {
                    LibraryMoveSection(library: library, search: search) { add($0); dismiss() }
                } else if libraryUnavailable {
                    Text("动作库暂时无法读取，仍可使用审核目录或自定义动作。")
                } else {
                    HStack { ProgressView(); Text("正在载入动作库") }
                }
                customSection
            } else {
                catalogSections
            }
        }.navigationTitle("选择动作").searchable(text: $search, prompt: scope == .library ? "中文、拼音或英文名称" : "名称或别名")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("关闭") { dismiss() } } }
            .task(id: scope) {
                guard scope == .library, library == nil else { return }
                library = await Task.detached { ExerciseLibrary.shared }.value
                libraryUnavailable = library == nil
            }
    }
    private var customSection: some View {
        Section("自定义动作 · 暂无教学") {
            TextField("动作名称", text: $customName).accessibilityIdentifier("customMoveName")
            Picker("记录方式", selection: $metric) { ForEach(WorkoutMetric.allCases, id: \.self) { Text($0.title).tag($0) } }
            Button("添加自定义动作") { add(WorkoutMove(name: customName.trimmingCharacters(in: .whitespacesAndNewlines), metric: metric)); dismiss() }
                .disabled(customName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty).accessibilityIdentifier("addCustomMove")
        }
    }
    // Custom entry sits right under the scope switch so its button stays above the keyboard.
    @ViewBuilder private var catalogSections: some View {
        customSection
        Section {
            Picker("器材筛选", selection: $equipment) {
                Text("全部器材").tag("")
                ForEach(catalog?.equipment ?? []) { Text($0.name).tag($0.id) }
            }
            Text("手动选择动作前，请查看教学并确认自己能舒适完成。").font(.footnote).foregroundStyle(.secondary)
        }
        Section("动作目录（\(matches.count)）") {
            if catalog == nil { Text("动作目录无法读取，仍可添加自定义动作。") }
            ForEach(matches) { entry in
                if entry.status == "approved" {
                    Button(entry.name) { add(WorkoutMove(catalog: entry, version: 2)); dismiss() }.accessibilityIdentifier("pickMove_\(entry.id)")
                } else {
                    NavigationLink { ExerciseTeachingDestination(reference: entry.defaultTeaching) } label: {
                        VStack(alignment: .leading) { Text(entry.name); Text("仅供学习 · 查看教学").font(.caption).foregroundStyle(.secondary) }
                    }
                }
            }
        }
    }
}

private struct WorkoutMoveEditor: View {
    @Binding var move: WorkoutMove
    var body: some View {
        Form {
            Section {
                Text(move.name)
                Picker("记录方式", selection: $move.metric) { ForEach(WorkoutMetric.allCases, id: \.self) { Text($0.title).tag($0) } }
                Toggle("左右侧分别记录", isOn: $move.perSide)
                if move.metric == .weightReps { Picker("重量含义", selection: $move.loadBasis) { ForEach(LoadBasis.allCases, id: \.self) { Text($0.title).tag($0) } } }
            }
            Section("每次训练目标") {
                Stepper("\(move.target.sets) 组", value: $move.target.sets, in: 1...20)
                if move.metric == .duration { Stepper("每组 \(move.target.durationSeconds) 秒", value: $move.target.durationSeconds, in: 5...3600, step: 5) }
                else {
                    Stepper("最低 \(move.target.minReps) 次", value: $move.target.minReps, in: 1...move.target.maxReps)
                    Stepper("最高 \(move.target.maxReps) 次", value: $move.target.maxReps, in: move.target.minReps...100)
                }
                Stepper("休息 \(move.target.restSeconds) 秒", value: $move.target.restSeconds, in: 0...900, step: 15)
                if move.metric == .weightReps {
                    TextField("目标重量（kg，可留空）", value: $move.target.weightKG, format: .number).keyboardType(.decimalPad)
                    TextField("加重步长（kg，留空关闭进阶）", value: $move.target.incrementKG, format: .number).keyboardType(.decimalPad)
                    Text("所有正式组达到次数上限后，才会提示增加一个步长；每次由你确认。").font(.footnote)
                }
            }
            Section("教学与来源") {
                if let teaching = move.teaching { NavigationLink("查看动作教学") { ExerciseTeachingDestination(reference: teaching) } }
                else if move.libraryID != nil {
                    NavigationLink("查看动作说明") { LibraryMoveDetailLoader(identity: move.identity) }.accessibilityIdentifier("libraryMoveDetail")
                }
                else { Text("此动作暂无已关联的教学") }
                if let text = move.prescription { Text(text).font(.footnote) }
            }
        }.navigationTitle("动作目标").journalSurface()
    }
}

struct WorkoutRunView: View {
    @Bindable var model: AppModel
    let id: UUID
    @State private var editing: SetRoute?
    @State private var finish = false
    @State private var discard = false
    @State private var note = ""
    @State private var effort = 5
    @State private var notifications = UserDefaults.standard.bool(forKey: WorkoutNotifications.key)
    @State private var plateMoves: Set<String> = []
    @State private var plateSettings = false
    @State private var skippedWarmups: Set<UUID> = []
    @AppStorage(PlateInventoryStore.key) private var plateData = Data()
    @Environment(\.dismiss) private var dismiss
    private var log: WorkoutLog? { model.workoutLogs.first { $0.id == id } }
    private var inventory: PlateInventory { PlateInventoryStore.decode(plateData) }
    private func persist(_ value: WorkoutLog) -> Bool {
        let saved = model.saveWorkout(value)
        if saved { WorkoutNotifications.update(deadline: value.restUntil) }
        return saved
    }
    var body: some View {
        ScrollViewReader { proxy in List {
            if let log {
                let records = WorkoutRecords.records(in: log, history: model.workoutLogs)
                Section {
                    TimelineView(.periodic(from: .now, by: 1)) { context in
                        Text("已练 \(Int(log.elapsed(at: context.date)) / 60) 分钟 · \(log.completedSets) 组已记录")
                        if log.remainingRest(at: context.date) > 0 {
                            Text("休息剩余 \(log.remainingRest(at: context.date)) 秒").font(.title2).monospacedDigit().accessibilityIdentifier("restCountdown")
                        }
                    }
                    if !records.isEmpty {
                        Label("这次刷新了 \(records.count) 组个人纪录", systemImage: "trophy.fill")
                            .foregroundStyle(SteadyTheme.primary).accessibilityIdentifier("workoutRecordSummary")
                    }
                    if log.isOngoing {
                        HStack {
                            Button("跳过休息") { var next = log; next.restUntil = nil; _ = persist(next) }.buttonStyle(.bordered)
                            Button("延长 30 秒") { var next = log; next.restUntil = max(next.restUntil ?? Date(), Date()).addingTimeInterval(30); _ = persist(next) }.buttonStyle(.bordered).disabled(log.status != .active)
                        }
                        Button(log.status == .paused ? "继续训练" : "暂停训练") {
                            var next = log; if next.status == .paused { next.resume() } else { next.pause() }; _ = persist(next)
                        }.accessibilityIdentifier("pauseWorkout")
                        Toggle("休息结束通知", isOn: $notifications).onChange(of: notifications) { _, value in
                            Task { notifications = await WorkoutNotifications.setEnabled(value); if notifications { WorkoutNotifications.update(deadline: self.log?.restUntil) } }
                        }
                    } else {
                        Text(log.status == .completed ? "训练已完成" : "已结束 · 部分完成").accessibilityIdentifier("workoutFinished")
                        Text("历史修改会重新计算统计和下次建议。原计划反馈保持独立。").font(.footnote).foregroundStyle(.secondary)
                    }
                }
                ForEach(log.exercises) { exercise in
                    exerciseSection(exercise, log: log, records: records)
                }
                Section("训练感受") {
                    Stepper("主观强度 \(effort)/10", value: $effort, in: 1...10)
                    TextField("备注", text: $note, axis: .vertical).accessibilityIdentifier("workoutNote")
                    if log.isOngoing { Button("结束并保存训练") { finish = true }.accessibilityIdentifier("finishWorkout") }
                    else { Button("保存反馈") { var next = log; next.note = note; next.effort = effort; _ = persist(next) } }
                }
                if log.isOngoing { Section { Button("放弃这次训练", role: .destructive) { discard = true } } }
            } else { Text("没有找到这次训练，请返回刷新。").foregroundStyle(.secondary) }
        }
        #if DEBUG && targetEnvironment(simulator)
        .task {
            // Screenshot review only: `--ui-scroll move:<identity>` brings an exercise into view.
            let args = ProcessInfo.processInfo.arguments
            if let i = args.firstIndex(of: "--ui-scroll"), args.indices.contains(i + 1) { try? await Task.sleep(for: .milliseconds(600)); proxy.scrollTo(args[i + 1], anchor: .top) }
        }
        #endif
        }.navigationTitle(log?.title ?? "训练").navigationBarTitleDisplayMode(.inline).journalSurface()
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("关闭") { dismiss() } } }
            .onAppear { note = log?.note ?? ""; effort = log?.effort ?? 5 }
            .sheet(item: $editing) { route in
                if let current = self.log, let e = current.exercises.first(where: { $0.id == route.exercise }), let s = e.sets.first(where: { $0.id == route.id }) {
                    NavigationStack { WorkoutSetEditor(move: e.move, value: s, plates: plateMoves.contains(e.move.identity)) { value in
                        guard var next = self.log, let ei = next.exercises.firstIndex(where: { $0.id == route.exercise }), let si = next.exercises[ei].sets.firstIndex(where: { $0.id == route.id }) else { return false }
                        next.exercises[ei].sets[si] = value
                        if next.status == .active { next.restUntil = Date().addingTimeInterval(Double(e.move.target.restSeconds)) }
                        if !next.isOngoing { next.status = next.exercises.allSatisfy(\.allWorkCompleted) ? .completed : .partial }
                        return persist(next)
                    } }
                }
            }
            .sheet(isPresented: $plateSettings) { NavigationStack { PlateInventoryView() } }
            .task(id: log?.exercises.map(\.move.identity)) {
                let moves = log?.exercises.map(\.move) ?? []
                plateMoves = await Task.detached { PlateInventoryStore.plateLoadedIdentities(moves) }.value
            }
            .confirmationDialog("结束这次训练？未完成的组会保留，记录为部分完成。", isPresented: $finish) {
                Button("结束并保存") { if var next = log { next.note = note; next.effort = effort; next.finish(); _ = persist(next) } }
            }
            .confirmationDialog("放弃将删除这次训练草稿。", isPresented: $discard) {
                Button("删除训练草稿", role: .destructive) { if model.deleteWorkout(id: id) { WorkoutNotifications.cancel(); dismiss() } }
            }
            .alert("暂时无法保存", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) { Button("知道了") { model.error = nil } } message: { Text(model.error ?? "") }
    }
    /// Finished logs that started before this one: the baseline for records and estimates.
    private func priorLogs(_ log: WorkoutLog) -> [WorkoutLog] {
        model.workoutLogs.filter { $0.id != log.id && !$0.isOngoing && $0.startedAt < log.startedAt }
    }
    /// A ramp only while nothing has been done yet; based on the confirmed target, else last time's top working set.
    private func warmupPlan(_ exercise: ExerciseLog, log: WorkoutLog) -> (note: String, sets: [WarmupSet])? {
        let move = exercise.move
        guard log.status == .active, move.metric == .weightReps, !skippedWarmups.contains(exercise.id),
              !exercise.sets.contains(where: { $0.warmup || $0.completedAt != nil }) else { return nil }
        let previous = WorkoutProgression.previous(move: move, history: model.workoutLogs.filter { $0.id != log.id })?
            .sets.filter { !$0.warmup && $0.completedAt != nil }.compactMap(\.weightKG).max()
        guard let working = move.target.weightKG ?? previous else { return nil }
        let increment = move.target.incrementKG ?? 2.5
        let sets = WarmupRamp.suggest(workingWeightKG: working, incrementKG: increment, minimumKG: plateMoves.contains(move.identity) ? inventory.barKG : 0)
        guard !sets.isEmpty else { return nil }
        let basis = move.target.weightKG != nil ? "目标 \(working.formatted()) kg" : "上次正式组 \(working.formatted()) kg"
        let rounding = move.target.incrementKG != nil ? "按步长 \(increment.formatted()) kg 取整" : "未设置步长，按 2.5 kg 取整"
        return ("按\(basis)的 40% / 60% / 80%，\(rounding)。确认后才会加入。", sets)
    }
    @ViewBuilder private func exerciseSection(_ exercise: ExerciseLog, log: WorkoutLog, records: [UUID: [PersonalRecord]]) -> some View {
        let plates = plateMoves.contains(exercise.move.identity)
        Section(exercise.move.name) {
            Text(targetText(exercise.move)).font(.footnote).foregroundStyle(.secondary).id("move:" + exercise.move.identity)
            if exercise.move.metric == .weightReps { Text(exercise.move.loadBasis.title).font(.caption) }
            if let previous = WorkoutProgression.previous(move: exercise.move, history: model.workoutLogs.filter { $0.id != log.id }) {
                Text("上次：" + previous.sets.filter { !$0.warmup && $0.completedAt != nil }.map { setSummary($0, metric: exercise.move.metric) }.joined(separator: "；")).font(.footnote)
            } else { Text("暂无上次完成记录").font(.footnote).foregroundStyle(.secondary) }
            if log.isOngoing, let suggestion = WorkoutProgression.suggestion(move: exercise.move, history: model.workoutLogs.filter { $0.id != log.id }) {
                Text(suggestion.reason).font(.footnote)
                Button("确认使用 \(suggestion.weightKG.formatted()) kg 目标") {
                    var next = log
                    if let i = next.exercises.firstIndex(where: { $0.id == exercise.id }) { next.exercises[i].move.target.weightKG = suggestion.weightKG; _ = persist(next) }
                }
            }
            if exercise.move.metric == .weightReps {
                let best = OneRepMax.best(move: exercise.move, history: priorLogs(log))
                let today = exercise.sets.compactMap(OneRepMax.estimate).max()
                if best != nil || today != nil {
                    Text("预估 1RM：" + [best.map { "此前最佳 \(WorkoutRecords.format($0)) kg" }, today.map { "本次 \(WorkoutRecords.format($0)) kg" }].compactMap { $0 }.joined(separator: " · "))
                        .font(.footnote).accessibilityIdentifier("estimatedOneRM")
                }
            }
            if plates {
                if let kg = exercise.move.target.weightKG { Text("目标 \(kg.formatted()) kg：" + plateLine(kg, inventory: inventory)).font(.footnote).accessibilityIdentifier("targetPlates") }
                Button { plateSettings = true } label: {
                    Label("杠铃杆 \(inventory.barKG.formatted()) kg · 按本机杠铃片计算", systemImage: "slider.horizontal.3").font(.footnote)
                }.accessibilityIdentifier("plateSettings")
            }
            if let plan = warmupPlan(exercise, log: log) {
                VStack(alignment: .leading, spacing: 6) {
                    Label("热身建议", systemImage: "flame").font(.subheadline.weight(.medium)).foregroundStyle(SteadyTheme.primary)
                    ForEach(Array(plan.sets.enumerated()), id: \.offset) { _, warmup in
                        Text("\(warmup.weightKG.formatted()) kg × \(warmup.reps) 次" + (plates ? " · " + plateLine(warmup.weightKG, inventory: inventory) : "")).font(.footnote)
                    }
                    Text(plan.note).font(.caption).foregroundStyle(SteadyTheme.secondary)
                }.accessibilityElement(children: .combine).accessibilityIdentifier("warmupSuggestion")
                Button("加入这 \(plan.sets.count) 组热身") {
                    var next = log
                    if let i = next.exercises.firstIndex(where: { $0.id == exercise.id }) {
                        let sides: [WorkoutSide] = exercise.move.perSide ? [.left, .right] : [.both]
                        let added = plan.sets.flatMap { warmup in sides.map { side in
                            var value = SetLog(side: side); value.warmup = true; value.weightKG = warmup.weightKG; value.reps = warmup.reps; return value
                        } }
                        next.exercises[i].sets.insert(contentsOf: added, at: 0); _ = persist(next)
                    }
                }.accessibilityIdentifier("addWarmups")
                Button("这次不热身") { skippedWarmups.insert(exercise.id) }.foregroundStyle(SteadyTheme.secondary)
            }
            if let teaching = exercise.move.teaching { NavigationLink("查看动作教学") { ExerciseTeachingDestination(reference: teaching) } }
            else { Text("此动作暂无已关联的教学").font(.caption).foregroundStyle(.secondary) }
            ForEach(Array(exercise.sets.enumerated()), id: \.element.id) { index, set in
                let number = exercise.sets[...index].filter { $0.warmup == set.warmup && $0.side == set.side }.count
                Button { editing = SetRoute(exercise: exercise.id, id: set.id) } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text("\(set.warmup ? "热身" : "正式") \(number)\(sideLabel(set.side))")
                            Spacer()
                            Text(set.completedAt == nil ? (set.warmup && set.weightKG != nil ? "建议 " + setSummary(set, metric: exercise.move.metric) : "记录本组") : setSummary(set, metric: exercise.move.metric))
                            if set.completedAt != nil { Image(systemName: "checkmark.circle.fill") }
                        }
                        if let found = records[set.id] {
                            Label("新纪录：" + found.map(\.title).joined(separator: "；"), systemImage: "trophy.fill")
                                .font(.caption).foregroundStyle(SteadyTheme.primary).accessibilityIdentifier("personalRecord_\(index)")
                        }
                    }.foregroundStyle(.primary)
                }.accessibilityIdentifier("workoutSet_\(index)")
                    .disabled(log.status == .paused)
                    .swipeActions { Button("删除组", role: .destructive) {
                        var next = log
                        if let i = next.exercises.firstIndex(where: { $0.id == exercise.id }) {
                            next.exercises[i].sets.removeAll { $0.id == set.id }
                            if !next.isOngoing { next.status = next.exercises.allSatisfy(\.allWorkCompleted) ? .completed : .partial }
                            _ = persist(next)
                        }
                    } }
            }
            if log.status != .paused {
                Button("添加训练组") {
                    var next = log
                    if let i = next.exercises.firstIndex(where: { $0.id == exercise.id }) {
                        next.exercises[i].sets += exercise.move.perSide ? [SetLog(side: .left), SetLog(side: .right)] : [SetLog()]
                        if !next.isOngoing { next.status = .partial }; _ = persist(next)
                    }
                }
            }
        }
    }
}

private func sideLabel(_ side: WorkoutSide) -> String { switch side { case .both: ""; case .left: " · 左侧"; case .right: " · 右侧" } }
private func setSummary(_ set: SetLog, metric: WorkoutMetric) -> String {
    let value: String
    switch metric {
    case .weightReps: value = "\((set.weightKG ?? 0).formatted()) kg × \(set.reps ?? 0) 次"
    case .reps: value = "\(set.reps ?? 0) 次"
    case .duration: value = "\(set.durationSeconds ?? 0) 秒"
    }
    return value + sideLabel(set.side)
}

private struct WorkoutSetEditor: View {
    let move: WorkoutMove
    @State var value: SetLog
    var plates = false
    var save: (SetLog) -> Bool
    @AppStorage(PlateInventoryStore.key) private var plateData = Data()
    @State private var error: String?
    @State private var timerStart: Date?
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        Form {
            Section(move.name + sideLabel(value.side)) {
                Toggle("热身组", isOn: $value.warmup)
                if move.metric == .weightReps { TextField(move.loadBasis.title, value: $value.weightKG, format: .number).keyboardType(.decimalPad).accessibilityIdentifier("setWeight") }
                if plates, let kg = value.weightKG { Text(plateLine(kg, inventory: PlateInventoryStore.decode(plateData))).font(.footnote).accessibilityIdentifier("setPlates") }
                if move.metric == .duration {
                    TextField("实际秒数", value: $value.durationSeconds, format: .number).keyboardType(.numberPad).accessibilityIdentifier("setDuration")
                    if let start = timerStart { TimelineView(.periodic(from: .now, by: 1)) { context in Text("计时 \(max(0, Int(context.date.timeIntervalSince(start)))) 秒").monospacedDigit() } }
                    Button(timerStart == nil ? "开始本组计时" : "停止并填入秒数") {
                        if let start = timerStart { value.durationSeconds = max(1, Int(Date().timeIntervalSince(start))); timerStart = nil } else { timerStart = Date() }
                    }
                }
                else { TextField("实际次数", value: $value.reps, format: .number).keyboardType(.numberPad).accessibilityIdentifier("setReps") }
                Text("目标：" + targetText(move)).font(.footnote).foregroundStyle(.secondary)
                if let kg = move.target.weightKG, move.metric == .weightReps { Text("已确认目标：\(kg.formatted()) kg").font(.footnote) }
                if move.metric == .weightReps, !value.warmup, let kg = value.weightKG, let reps = value.reps, let estimate = OneRepMax.estimate(weightKG: kg, reps: reps) {
                    Text("本组预估 1RM \(WorkoutRecords.format(estimate)) kg（\(reps <= 10 ? "Brzycki" : "Epley") 公式，仅供参考）").font(.footnote).foregroundStyle(.secondary)
                }
            }
            Button("确认完成并保存") {
                var next = value
                if let start = timerStart { next.durationSeconds = max(1, Int(Date().timeIntervalSince(start))) }
                next.completedAt = next.completedAt ?? Date()
                do { try next.validate(for: move); if save(next) { dismiss() } else { error = "保存失败，输入仍保留，请重试。" } }
                catch { self.error = error.localizedDescription }
            }.accessibilityIdentifier("saveWorkoutSet")
            if value.completedAt != nil { Button("标记为未完成") { var next = value; next.completedAt = nil; if save(next) { dismiss() } else { error = "保存失败，请重试。" } } }
            if let error { Text(error).foregroundStyle(.red).accessibilityIdentifier("setSaveError") }
        }.navigationTitle("记录训练组").toolbar { ToolbarItem(placement: .cancellationAction) { Button("关闭") { dismiss() } } }
    }
}

struct WorkoutHistoryView: View {
    @Bindable var model: AppModel
    @State private var selectedDate = Date()
    private var history: [WorkoutLog] { model.workoutLogs.filter { !$0.isOngoing } }
    var body: some View {
        List {
            Section("训练日历") {
                DatePicker("查看日期", selection: $selectedDate, displayedComponents: .date).datePickerStyle(.graphical)
                let dayLogs = history.filter { Calendar.current.isDate($0.startedAt, inSameDayAs: selectedDate) }
                if dayLogs.isEmpty { Text("这一天没有训练记录").foregroundStyle(.secondary) }
                ForEach(dayLogs) { row($0) }
            }
            Section("全部训练") {
                if history.isEmpty { Text("完成训练后，会在这里看到实际记录。").foregroundStyle(.secondary) }
                ForEach(history) { row($0) }
            }
            Section("按动作回顾") {
                ForEach(Array(Set(history.flatMap { $0.exercises.map(\.move.identity) })).sorted(), id: \.self) { identity in
                    if let move = history.flatMap(\.exercises).first(where: { $0.move.identity == identity })?.move {
                        NavigationLink(move.name) { WorkoutMovementHistory(model: model, move: move) }
                    }
                }
            }
        }.navigationTitle("训练历史").journalSurface()
    }
    private func row(_ log: WorkoutLog) -> some View {
        NavigationLink { WorkoutRunView(model: model, id: log.id) } label: {
            VStack(alignment: .leading) {
                Text(log.title)
                Text("\(log.startedAt.formatted(date: .abbreviated, time: .shortened)) · \(log.completedSets) 组 · \(log.status == .completed ? "完成" : "部分完成")").font(.caption).foregroundStyle(.secondary)
            }
        }.swipeActions { Button("删除", role: .destructive) { _ = model.deleteWorkout(id: log.id) } }
    }
}
private struct WorkoutMovementHistory: View {
    @Bindable var model: AppModel
    let move: WorkoutMove
    var body: some View {
        List {
            ForEach(model.workoutLogs.filter { !$0.isOngoing }) { log in
                ForEach(log.exercises.filter { $0.move.identity == move.identity }) { exercise in
                    Section(log.startedAt.formatted(date: .abbreviated, time: .shortened)) {
                        Text(exercise.move.metric.title + (exercise.move.metric == .weightReps ? " · " + exercise.move.loadBasis.title : ""))
                        ForEach(exercise.sets.filter { $0.completedAt != nil }) { set in
                            Text((set.warmup ? "热身 · " : "正式 · ") + setSummary(set, metric: exercise.move.metric))
                        }
                        NavigationLink("查看这次训练") { WorkoutRunView(model: model, id: log.id) }
                    }
                }
            }
        }.navigationTitle(move.name)
    }
}

/// Bar and plates live only in this device's preferences; workout records and their sync shape are unchanged.
enum PlateInventoryStore {
    static let key = "workoutPlateInventory"
    static func decode(_ data: Data) -> PlateInventory { (try? JSONDecoder().decode(PlateInventory.self, from: data)) ?? .standard }
    static func encode(_ value: PlateInventory) -> Data { value == .standard ? Data() : (try? JSONEncoder().encode(value)) ?? Data() }
    /// Reads the catalog and library off the main thread; only free-bar barbell moves qualify.
    nonisolated static func plateLoadedIdentities(_ moves: [WorkoutMove]) -> Set<String> {
        let library = moves.contains { $0.libraryID != nil } ? ExerciseLibrary.shared : nil
        var catalogs: [Int: ExerciseCatalog] = [:]
        var result: Set<String> = []
        for move in moves {
            var catalog: ExerciseCatalog?
            if let version = move.catalogVersion {
                if catalogs[version] == nil { catalogs[version] = try? ExerciseCatalog.load(version: version) }
                catalog = catalogs[version]
            }
            if PlateMath.loadsPlates(move, catalog: catalog, library: library) { result.insert(move.identity) }
        }
        return result
    }
}
private func plateLine(_ kg: Double, inventory: PlateInventory) -> String {
    guard let load = PlateMath.load(targetKG: kg, inventory: inventory) else { return "低于杠铃杆的 \(inventory.barKG.formatted()) kg" }
    let side = load.perSide.isEmpty ? "空杆" : "每侧 " + load.perSide.map { $0.formatted() }.joined(separator: " + ") + " kg"
    return side + (load.shortfallKG > 0 ? "（现有杠铃片最多凑到 \(load.totalKG.formatted()) kg）" : "")
}

struct PlateInventoryView: View {
    @AppStorage(PlateInventoryStore.key) private var plateData = Data()
    @Environment(\.dismiss) private var dismiss
    private var inventory: Binding<PlateInventory> {
        Binding(get: { PlateInventoryStore.decode(plateData) }, set: { plateData = PlateInventoryStore.encode($0) })
    }
    var body: some View {
        Form {
            Section {
                Stepper("杠铃杆 \(inventory.wrappedValue.barKG.formatted()) kg", value: inventory.barKG, in: 0...50, step: 2.5)
                    .accessibilityIdentifier("barWeight")
            } header: { Text("杠铃杆") } footer: { Text("标准杆通常为 20 kg，女子杆 15 kg，曲杆和短杆更轻。") }
            Section("杠铃片 · 每副两片") {
                ForEach(inventory.wrappedValue.plates.indices, id: \.self) { index in
                    let plate = inventory.wrappedValue.plates[index]
                    Stepper("\(plate.weightKG.formatted()) kg · \(plate.pairs) 副", value: inventory.plates[index].pairs, in: 0...20)
                }
            }
            Section {
                Button("恢复默认（20 kg 杆，每种 2 副，25 kg 4 副）") { plateData = Data() }.disabled(plateData.isEmpty)
            } footer: {
                Text("只保存在这台设备上，不随训练记录同步。两侧加同样的杠铃片；凑不准时取不超过目标的最接近重量。")
            }
        }.navigationTitle("杠铃片设置").navigationBarTitleDisplayMode(.inline).journalSurface()
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("完成") { dismiss() } } }
    }
}

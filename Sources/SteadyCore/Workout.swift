import Foundation

public enum WorkoutMetric: String, Codable, CaseIterable, Sendable {
    case weightReps, reps, duration
    public var title: String { switch self { case .weightReps: "重量 × 次数"; case .reps: "仅次数"; case .duration: "计时" } }
}
public enum WorkoutSide: String, Codable, CaseIterable, Sendable { case both, left, right }
public enum LoadBasis: String, Codable, CaseIterable, Sendable {
    case total, perSide
    public var title: String { self == .total ? "总重量（kg）" : "单侧重量（kg）" }
}
public struct WorkoutTarget: Codable, Equatable, Sendable {
    public var sets = 2
    public var minReps = 8
    public var maxReps = 12
    public var durationSeconds = 60
    public var restSeconds = 90
    public var weightKG: Double?
    public var incrementKG: Double?
    public init() {}
}
public struct WorkoutMove: Codable, Equatable, Identifiable, Sendable {
    public var id = UUID()
    public var identity: String
    public var name: String
    public var catalogID: String?
    public var catalogVersion: Int?
    public var teaching: TeachingReference?
    public var metric: WorkoutMetric
    public var perSide = false
    public var loadBasis: LoadBasis = .total
    public var target = WorkoutTarget()
    public var prescription: String?
    public init(name: String, metric: WorkoutMetric = .weightReps) {
        identity = "custom:" + UUID().uuidString; self.name = name; self.metric = metric
    }
    public init(catalog: CatalogExercise, version: Int) {
        identity = "catalog:" + catalog.id; name = catalog.name; catalogID = catalog.id; catalogVersion = version
        teaching = catalog.defaultTeaching
        let t = catalog.templates.first(where: { $0.role == "main" }) ?? catalog.templates.first
        let bodyweightSupports: Set<String> = ["wall", "mat", "foam-roller", "light-resistance-band", "ab-wheel", "pull-up-bar", "suspension-trainer", "fixed-support", "stable-chair"]
        metric = t?.durationSeconds != nil ? .duration : (Set(catalog.equipment).isSubset(of: bodyweightSupports) ? .reps : .weightReps)
        perSide = t?.perSide ?? false
        target.sets = t?.sets ?? 2; target.minReps = t?.reps ?? 8; target.maxReps = max(target.minReps, 12)
        target.durationSeconds = t?.durationSeconds ?? 60; target.restSeconds = t?.restSeconds ?? 90
        prescription = t?.prescription
    }
    public func validate() throws {
        guard !identity.isEmpty, identity.count <= 200, !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, name.count <= 100,
              (1...20).contains(target.sets), (1...1000).contains(target.minReps),
              (target.minReps...1000).contains(target.maxReps), (1...86400).contains(target.durationSeconds),
              (0...900).contains(target.restSeconds),
              target.weightKG.map({ $0.isFinite && (0...1000).contains($0) }) ?? true,
              target.incrementKG.map({ $0.isFinite && $0 > 0 && $0 <= 100 }) ?? true else {
            throw ServiceError.invalidInput("请检查动作名称、组数、次数、时长或重量。")
        }
    }
}
public struct WorkoutTemplate: Codable, Equatable, Identifiable, Sendable {
    public var metadata = RecordMetadata(source: .manual)
    public var title: String
    public var moves: [WorkoutMove]
    public var id: UUID { metadata.id }
    public init(title: String, moves: [WorkoutMove]) { self.title = title; self.moves = moves }
    public func validate() throws {
        guard !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, title.count <= 200,
              (1...40).contains(moves.count), Set(moves.map(\.id)).count == moves.count else { throw ServiceError.invalidInput("请输入训练名称并添加 1–40 个动作。") }
        try moves.forEach { try $0.validate() }
    }
    public init(session: WorkoutSession) {
        title = session.title
        moves = session.exercises.map { exercise in
            let catalog = exercise.catalogVersion.flatMap { try? ExerciseCatalog.load(version: $0) }
            if let id = exercise.catalogID, let entry = catalog?.exercise(id: id), let version = exercise.catalogVersion {
                var move = WorkoutMove(catalog: entry, version: version)
                if let template = entry.templates.first(where: { $0.id == exercise.templateID }) {
                    move.target.sets = template.sets ?? 1; move.target.minReps = template.reps ?? 8
                    move.target.maxReps = max(move.target.minReps, 12); move.target.durationSeconds = template.durationSeconds ?? 60
                    move.target.restSeconds = template.restSeconds; move.perSide = template.perSide
                }
                move.prescription = exercise.prescription; return move
            }
            var move = WorkoutMove(name: exercise.name, metric: .reps)
            move.identity = "legacy:" + exercise.id.uuidString; move.prescription = exercise.prescription
            return move
        }
    }
}
public struct SetLog: Codable, Equatable, Identifiable, Sendable {
    public var id = UUID()
    public var side: WorkoutSide = .both
    public var warmup = false
    public var weightKG: Double?
    public var reps: Int?
    public var durationSeconds: Int?
    public var completedAt: Date?
    public init(side: WorkoutSide = .both) { self.side = side }
    public func validate(for move: WorkoutMove) throws {
        guard (move.perSide ? side != .both : side == .both),
              weightKG.map({ $0.isFinite && (0...1000).contains($0) }) ?? true,
              reps.map({ (1...1000).contains($0) }) ?? true,
              durationSeconds.map({ (1...86400).contains($0) }) ?? true else { throw ServiceError.invalidInput("训练组的数据或左右侧无效。") }
        if completedAt != nil {
            guard move.metric == .duration ? durationSeconds != nil : reps != nil,
                  move.metric != .weightReps || weightKG != nil else { throw ServiceError.invalidInput("请先填写本组实际完成的数据。") }
        }
    }
}
public struct ExerciseLog: Codable, Equatable, Identifiable, Sendable {
    public var id = UUID()
    public var move: WorkoutMove
    public var sets: [SetLog]
    public init(move: WorkoutMove) {
        self.move = move
        sets = (0..<move.target.sets).flatMap { _ in move.perSide ? [SetLog(side: .left), SetLog(side: .right)] : [SetLog()] }
    }
    public var allWorkCompleted: Bool {
        let work = sets.filter { !$0.warmup }
        let expected = move.target.sets * (move.perSide ? 2 : 1)
        return work.count >= expected && work.allSatisfy { $0.completedAt != nil }
            && (!move.perSide || [WorkoutSide.left, .right].allSatisfy { side in work.filter { $0.side == side }.count >= move.target.sets })
    }
}
public enum WorkoutStatus: String, Codable, Sendable { case active, paused, completed, partial }
public struct WorkoutLog: Codable, Equatable, Identifiable, Sendable {
    public var metadata = RecordMetadata(source: .manual)
    public var title: String
    public var templateID: UUID?
    public var planID: UUID?
    public var sessionID: UUID?
    public var startedAt: Date
    public var endedAt: Date?
    public var status: WorkoutStatus = .active
    public var runningSince: Date?
    public var elapsedSeconds: Double = 0
    public var restUntil: Date?
    public var effort: Int?
    public var note = ""
    public var exercises: [ExerciseLog]
    public var id: UUID { metadata.id }
    public var isOngoing: Bool { status == .active || status == .paused }
    public var completedSets: Int { exercises.reduce(0) { $0 + $1.sets.filter { $0.completedAt != nil }.count } }
    public init(template: WorkoutTemplate, now: Date = Date()) throws {
        try template.validate(); title = template.title; templateID = template.id; startedAt = now; runningSince = now
        exercises = template.moves.map(ExerciseLog.init)
    }
    public func elapsed(at now: Date) -> Double { elapsedSeconds + (runningSince.map { max(0, now.timeIntervalSince($0)) } ?? 0) }
    public func remainingRest(at now: Date) -> Int { max(0, Int(ceil(restUntil?.timeIntervalSince(now) ?? 0))) }
    public mutating func pause(at now: Date = Date()) {
        guard status == .active else { return }; elapsedSeconds = elapsed(at: now); runningSince = nil; restUntil = nil; status = .paused
    }
    public mutating func resume(at now: Date = Date()) { guard status == .paused else { return }; runningSince = now; status = .active }
    public mutating func finish(at now: Date = Date()) {
        guard isOngoing else { return }; elapsedSeconds = elapsed(at: now); runningSince = nil; restUntil = nil; endedAt = now
        status = exercises.allSatisfy(\.allWorkCompleted) ? .completed : .partial
    }
    public func validate() throws {
        try WorkoutTemplate(title: title, moves: exercises.map(\.move)).validate()
        guard elapsedSeconds.isFinite, elapsedSeconds >= 0, note.count <= 4000,
              effort.map({ (1...10).contains($0) }) ?? true,
              Set(exercises.map(\.id)).count == exercises.count,
              isOngoing ? endedAt == nil : endedAt != nil,
              (status == .active) == (runningSince != nil),
              status != .completed || exercises.allSatisfy(\.allWorkCompleted),
              endedAt.map({ $0 >= startedAt }) ?? true else { throw ServiceError.invalidInput("训练状态或反馈无效。") }
        for e in exercises {
            guard e.sets.count <= 100, Set(e.sets.map(\.id)).count == e.sets.count else { throw ServiceError.invalidInput("训练组过多或重复。") }
            try e.sets.forEach { try $0.validate(for: e.move) }
        }
    }
}
public struct ProgressionSuggestion: Equatable, Sendable {
    public var weightKG: Double
    public var reason: String
}
public enum WorkoutProgression {
    public static func previous(move: WorkoutMove, history: [WorkoutLog]) -> ExerciseLog? {
        history.filter { $0.status == .completed }.sorted { ($0.endedAt ?? $0.startedAt) > ($1.endedAt ?? $1.startedAt) }
            .lazy.compactMap { log in log.exercises.first { $0.move.identity == move.identity && $0.move.metric == move.metric && $0.move.perSide == move.perSide && $0.move.loadBasis == move.loadBasis } }.first
    }
    public static func suggestion(move: WorkoutMove, history: [WorkoutLog]) -> ProgressionSuggestion? {
        guard move.metric == .weightReps, let increment = move.target.incrementKG, increment.isFinite, increment > 0,
              let prior = previous(move: move, history: history), prior.allWorkCompleted else { return nil }
        let work = prior.sets.filter { !$0.warmup }
        guard work.count >= move.target.sets * (move.perSide ? 2 : 1),
              work.allSatisfy({ $0.completedAt != nil && ($0.reps ?? 0) >= move.target.maxReps }),
              let weight = work.first?.weightKG, work.allSatisfy({ $0.weightKG == weight }), weight + increment <= 1000 else { return nil }
        return ProgressionSuggestion(weightKG: weight + increment, reason: "上次所有正式组均达到 \(move.target.maxReps) 次；按你设置的 \(increment) kg 步长，建议下次 \(weight + increment) kg。需确认后应用。")
    }
}
@MainActor public protocol WorkoutRepository: AnyObject {
    func workoutTemplates() throws -> [WorkoutTemplate]
    func workoutLogs() throws -> [WorkoutLog]
    func saveWorkoutTemplate(_ value: WorkoutTemplate) throws
    func saveWorkoutLog(_ value: WorkoutLog) throws
    func deleteWorkout(id: UUID, template: Bool) throws
}

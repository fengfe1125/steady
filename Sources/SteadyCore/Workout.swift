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
/// Estimated one-rep max from a single set. Public formulas: Brzycki (w × 36 / (37 − r)) up to 10 reps,
/// Epley (w × (1 + r / 30)) above; the two agree exactly at 10 reps, so the switch has no jump.
/// Sets above 20 reps are too far from a single to estimate and return nil.
public enum OneRepMax {
    public static let maxReps = 20
    public static func epley(weightKG: Double, reps: Int) -> Double? {
        guard weightKG.isFinite, weightKG > 0, reps >= 1 else { return nil }
        return reps == 1 ? weightKG : weightKG * (1 + Double(reps) / 30)
    }
    public static func brzycki(weightKG: Double, reps: Int) -> Double? {
        guard weightKG.isFinite, weightKG > 0, (1...10).contains(reps) else { return nil }
        return weightKG * 36 / Double(37 - reps)
    }
    public static func estimate(weightKG: Double, reps: Int) -> Double? {
        guard reps <= maxReps else { return nil }
        return reps <= 10 ? brzycki(weightKG: weightKG, reps: reps) : epley(weightKG: weightKG, reps: reps)
    }
    /// Completed working sets only; warm-ups never count.
    public static func estimate(_ set: SetLog) -> Double? {
        guard !set.warmup, set.completedAt != nil, let weight = set.weightKG, let reps = set.reps else { return nil }
        return estimate(weightKG: weight, reps: reps)
    }
    /// Best estimate across a move's history, matched like `WorkoutProgression.previous` (identity, metric, perSide, loadBasis).
    public static func best(move: WorkoutMove, history: [WorkoutLog]) -> Double? {
        guard move.metric == .weightReps else { return nil }
        let key = RecordKey(move)
        return history.flatMap { $0.exercises.filter { RecordKey($0.move) == key }.flatMap(\.sets) }.compactMap(estimate).max()
    }
}

/// Records are compared only between logs of the same identity, metric, perSide and loadBasis,
/// so a per-side dumbbell entry never competes with a total-load one.
public struct RecordKey: Hashable, Sendable {
    public var identity: String
    public var metric: WorkoutMetric
    public var perSide: Bool
    public var loadBasis: LoadBasis
    public init(_ move: WorkoutMove) { identity = move.identity; metric = move.metric; perSide = move.perSide; loadBasis = move.loadBasis }
}
public struct PersonalRecord: Equatable, Sendable {
    public enum Kind: String, Equatable, Sendable { case heaviestWeight, mostReps, bestEstimatedOneRM }
    public var kind: Kind
    public var value: Double
    public var previous: Double
    /// For `.mostReps` on weighted moves: the weight the reps were done at.
    public var weightKG: Double?
    public var title: String {
        switch kind {
        case .heaviestWeight: "最大重量 \(value.formatted()) kg（此前 \(previous.formatted()) kg）"
        case .mostReps: (weightKG.map { "\($0.formatted()) kg 及以上" } ?? "") + "最多次数 \(Int(value)) 次（此前 \(Int(previous)) 次）"
        case .bestEstimatedOneRM: "预估 1RM \(WorkoutRecords.format(value)) kg（此前 \(WorkoutRecords.format(previous)) kg）"
        }
    }
}
public enum WorkoutRecords {
    private struct Lift { var weight: Double?; var reps: Int }
    private static let epsilon = 0.0001
    /// Estimated kilograms to at most one decimal; logged weights keep their own precision.
    public static func format(_ kg: Double) -> String { ((kg * 10).rounded() / 10).formatted(.number.precision(.fractionLength(0...1))) }
    private static func lift(_ set: SetLog, metric: WorkoutMetric) -> Lift? {
        guard !set.warmup, set.completedAt != nil, let reps = set.reps else { return nil }
        switch metric {
        case .weightReps: return set.weightKG.map { Lift(weight: $0, reps: reps) }
        case .reps: return Lift(weight: nil, reps: reps)
        case .duration: return nil
        }
    }
    /// Records a completed working set beats, measured against `baseline` (earlier working sets of the same key).
    /// An empty baseline yields nothing: a first-ever set is a starting point, not a record. Ties are not records.
    /// "Most reps" on a weighted move means more reps than any earlier set at this weight or heavier,
    /// and needs at least one earlier set at that weight or heavier.
    static func records(for set: SetLog, metric: WorkoutMetric, baseline: [SetLog]) -> [PersonalRecord] {
        guard let current = lift(set, metric: metric) else { return [] }
        let earlier = baseline.compactMap { lift($0, metric: metric) }
        guard !earlier.isEmpty else { return [] }
        var found: [PersonalRecord] = []
        if let weight = current.weight {
            if weight > 0, let top = earlier.compactMap(\.weight).max(), weight > top + epsilon {
                found.append(PersonalRecord(kind: .heaviestWeight, value: weight, previous: top))
            }
            let atOrAbove = earlier.filter { ($0.weight ?? 0) >= weight - epsilon }
            if let most = atOrAbove.map(\.reps).max(), current.reps > most {
                found.append(PersonalRecord(kind: .mostReps, value: Double(current.reps), previous: Double(most), weightKG: weight))
            }
            if let estimate = OneRepMax.estimate(weightKG: weight, reps: current.reps),
               let best = earlier.compactMap({ lift in lift.weight.flatMap { OneRepMax.estimate(weightKG: $0, reps: lift.reps) } }).max(), estimate > best + epsilon {
                found.append(PersonalRecord(kind: .bestEstimatedOneRM, value: estimate, previous: best))
            }
        } else if let most = earlier.map(\.reps).max(), current.reps > most {
            found.append(PersonalRecord(kind: .mostReps, value: Double(current.reps), previous: Double(most)))
        }
        return found
    }
    /// Records set in `log`, keyed by set ID. History is every other finished log that started earlier;
    /// within `log`, each set is also compared with the sets of the same key completed before it,
    /// so repeating a record weight on the next set is not flagged again.
    public static func records(in log: WorkoutLog, history: [WorkoutLog]) -> [UUID: [PersonalRecord]] {
        let prior = history.filter { $0.id != log.id && !$0.isOngoing && $0.startedAt < log.startedAt }
        var baseline: [RecordKey: [SetLog]] = [:]
        for past in prior { for exercise in past.exercises { baseline[RecordKey(exercise.move), default: []] += exercise.sets } }
        let current = log.exercises.flatMap { exercise in exercise.sets.enumerated().map { (exercise.move, $0.offset, $0.element) } }
            .filter { $0.2.completedAt != nil }
            .sorted { ($0.2.completedAt!, $0.1) < ($1.2.completedAt!, $1.1) }
        var result: [UUID: [PersonalRecord]] = [:]
        for (move, _, set) in current {
            let key = RecordKey(move)
            let found = records(for: set, metric: move.metric, baseline: baseline[key] ?? [])
            if !found.isEmpty { result[set.id] = found }
            baseline[key, default: []].append(set)
        }
        return result
    }
}

public struct WarmupSet: Equatable, Sendable {
    public var weightKG: Double
    public var reps: Int
}
/// A ramp of lighter sets before the working weight. Only a suggestion: the app adds nothing until the user confirms.
public enum WarmupRamp {
    public static let steps: [(fraction: Double, reps: Int)] = [(0.4, 8), (0.6, 5), (0.8, 3)]
    public static func round(_ kg: Double, toIncrement increment: Double) -> Double {
        guard increment.isFinite, increment > 0 else { return kg }
        return ((kg / increment).rounded() * increment * 1000).rounded() / 1000
    }
    /// Each step is rounded to `incrementKG`, raised to `minimumKG` (an empty bar), and dropped when it would not be
    /// lighter than the working weight or would repeat the previous step's weight.
    public static func suggest(workingWeightKG: Double, incrementKG: Double, minimumKG: Double = 0) -> [WarmupSet] {
        guard workingWeightKG.isFinite, workingWeightKG > 0, incrementKG.isFinite, incrementKG > 0 else { return [] }
        var result: [WarmupSet] = []
        for step in steps {
            let weight = max(minimumKG, round(workingWeightKG * step.fraction, toIncrement: incrementKG))
            guard weight > 0, weight < workingWeightKG - 0.0001 else { continue }
            if let last = result.last, abs(last.weightKG - weight) < 0.0001 { continue }
            result.append(WarmupSet(weightKG: weight, reps: step.reps))
        }
        return result
    }
}

/// The user's bar and plates, kept only in local preferences on this device (never synced).
public struct PlateInventory: Codable, Equatable, Sendable {
    public struct Plate: Codable, Equatable, Hashable, Sendable {
        public var weightKG: Double
        public var pairs: Int
        public init(weightKG: Double, pairs: Int) { self.weightKG = weightKG; self.pairs = pairs }
    }
    public var barKG: Double
    public var plates: [Plate]
    public init(barKG: Double, plates: [Plate]) { self.barKG = barKG; self.plates = plates }
    public static let standard = PlateInventory(barKG: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25].map { Plate(weightKG: $0, pairs: $0 == 25 ? 4 : 2) })
}
public struct PlateLoad: Equatable, Sendable {
    public var barKG: Double
    /// One side of the bar, heaviest first.
    public var perSide: [Double]
    public var totalKG: Double { barKG + perSide.reduce(0, +) * 2 }
    /// Target minus what the plates can make; 0 when exact.
    public var shortfallKG: Double
}
public enum PlateMath {
    /// Library and catalog equipment that takes standard plates on a free bar. Smith machines are left out: their bar weight varies by model.
    public static let barbellEquipment: Set<String> = ["barbell", "olympic barbell", "ez barbell", "trap bar", "ez-bar"]
    public static func loadsPlates(_ move: WorkoutMove, catalog: ExerciseCatalog?, library: ExerciseLibrary?) -> Bool {
        guard move.metric == .weightReps, move.loadBasis == .total else { return false }
        if let id = move.catalogID, let entry = catalog?.exercise(id: id) { return !barbellEquipment.isDisjoint(with: entry.equipment) }
        if let entry = library?.entry(identity: move.identity) { return barbellEquipment.contains(entry.equipment) }
        return false
    }
    /// Plates per side for `targetKG` using at most the owned pairs: the fewest plates that reach the closest weight
    /// not above the target (heavier plates first on ties). Nil when the target is below the bar or the input is invalid.
    public static func load(targetKG: Double, inventory: PlateInventory) -> PlateLoad? {
        let unit = 10.0 // grams per step; covers 1.25 kg and 0.5 kg plates exactly
        func steps(_ kg: Double) -> Int { Int((kg * 1000 / unit).rounded()) }
        guard targetKG.isFinite, inventory.barKG.isFinite, inventory.barKG >= 0, targetKG <= 1000, targetKG + 0.0001 >= inventory.barKG else { return nil }
        let plates = inventory.plates.filter { $0.weightKG.isFinite && $0.weightKG > 0 && $0.pairs > 0 }
        let pieces = plates.flatMap { Array(repeating: steps($0.weightKG), count: min($0.pairs, 50)) }.sorted(by: >)
        let goal = max(0, steps((targetKG - inventory.barKG) / 2))
        let gcd = pieces.reduce(0) { a, b in var (x, y) = (a, b); while y != 0 { (x, y) = (y, x % y) }; return x }
        guard gcd > 0 else { return PlateLoad(barKG: inventory.barKG, perSide: [], shortfallKG: Double(goal * 2) * unit / 1000) }
        let size = goal / gcd
        var best: [[Int]?] = Array(repeating: nil, count: size + 1)
        best[0] = []
        func better(_ a: [Int], than b: [Int]?) -> Bool {
            guard let b else { return true }
            return a.count != b.count ? a.count < b.count : a.lexicographicallyPrecedes(b, by: >)
        }
        for piece in pieces {
            let p = piece / gcd
            guard p <= size else { continue }
            for s in stride(from: size, through: p, by: -1) {
                if let base = best[s - p] {
                    let candidate = (base + [piece]).sorted(by: >)
                    if better(candidate, than: best[s]) { best[s] = candidate }
                }
            }
        }
        let reached = (0...size).last { best[$0] != nil } ?? 0
        let side = (best[reached] ?? []).map { Double($0) * unit / 1000 }
        let shortfall = max(0, (targetKG - inventory.barKG - side.reduce(0, +) * 2) * 1000).rounded() / 1000
        return PlateLoad(barKG: inventory.barKG, perSide: side, shortfallKG: shortfall)
    }
}
@MainActor public protocol WorkoutRepository: AnyObject {
    func workoutTemplates() throws -> [WorkoutTemplate]
    func workoutLogs() throws -> [WorkoutLog]
    func saveWorkoutTemplate(_ value: WorkoutTemplate) throws
    func saveWorkoutLog(_ value: WorkoutLog) throws
    func deleteWorkout(id: UUID, template: Bool) throws
}

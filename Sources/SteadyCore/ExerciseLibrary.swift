import Foundation

/// A broad, text-only exercise library for manual logging. It sits beside the
/// reviewed `ExerciseCatalog`: entries carry steps and muscles but no Steady
/// teaching or animation, and AI plan generation never selects from it.
public struct ExerciseLibrary: Decodable, Sendable {
    public struct Source: Decodable, Sendable {
        public let title: String
        public let repository: String
        public let commit: String
        public let license: String
        public let licenseText: String
        public let scope: String
        public let translation: String
    }
    public struct Term: Decodable, Identifiable, Hashable, Sendable {
        public let id: String
        public let name: String
        public let count: Int?
    }
    public struct Entry: Decodable, Identifiable, Sendable {
        public let id: String
        public let name: String
        public let englishName: String
        public let bodyPart: String
        public let equipment: String
        public let target: String
        public let secondaryMuscles: [String]
        public let metric: WorkoutMetric
        public let perSide: Bool
        public let steps: [String]
        public let englishSteps: [String]
        public let catalogEquivalents: [String]
        public var identity: String { ExerciseLibrary.identityPrefix + id }
    }
    public static let identityPrefix = "library:"

    public let schemaVersion: Int
    public let libraryVersion: Int
    public let source: Source
    public let bodyParts: [Term]
    public let equipment: [Term]
    public let muscles: [Term]
    public let exercises: [Entry]
    private var searchKeys: [[String]] = []
    private var names: [String: String] = [:]

    private enum CodingKeys: String, CodingKey { case schemaVersion, libraryVersion, source, bodyParts, equipment, muscles, exercises }

    /// Loaded once; the first read decodes ~1.5 MB and builds pinyin keys, so callers read it off the main actor.
    public static let shared: ExerciseLibrary? = try? load()

    public static func load() throws -> Self {
        guard let url = Bundle.module.url(forResource: "exercise-library.v1", withExtension: "json", subdirectory: "TrainingCollections") else {
            throw ServiceError.invalidInput("动作库暂时无法读取，仍可使用动作目录或自定义动作。")
        }
        var result = try JSONDecoder().decode(Self.self, from: Data(contentsOf: url))
        guard result.schemaVersion == 1, Set(result.exercises.map(\.id)).count == result.exercises.count else { throw ServiceError.invalidResponse }
        // "chest", "back" and "shoulders" name both a body part and a muscle with the same label.
        result.names = Dictionary((result.bodyParts + result.equipment + result.muscles).map { ($0.id, $0.name) }, uniquingKeysWith: { first, _ in first })
        result.searchKeys = result.exercises.map(Self.searchKeys)
        return result
    }

    public func entry(id: String) -> Entry? { exercises.first { $0.id == id } }
    public func entry(identity: String) -> Entry? {
        identity.hasPrefix(Self.identityPrefix) ? entry(id: String(identity.dropFirst(Self.identityPrefix.count))) : nil
    }
    /// Chinese label for a body part, equipment or muscle ID.
    public func label(_ id: String) -> String { names[id] ?? id }

    /// Entries that can be added by hand. Movements that the reviewed catalog
    /// already covers stay hidden so its approval decision is not bypassed.
    public func search(_ query: String, bodyPart: String? = nil, equipment: String? = nil) -> [Entry] {
        let needle = Self.normalize(query)
        var scored: [(Int, Int)] = []
        for (index, e) in exercises.enumerated() where e.catalogEquivalents.isEmpty
            && (bodyPart == nil || e.bodyPart == bodyPart) && (equipment == nil || e.equipment == equipment) {
            if needle.isEmpty { scored.append((0, index)); continue }
            if let rank = searchKeys[index].firstIndex(where: { $0.contains(needle) }) {
                scored.append((searchKeys[index][rank].hasPrefix(needle) ? rank * 2 : rank * 2 + 1, index))
            }
        }
        return scored.sorted { $0 < $1 }.map { exercises[$0.1] }
    }

    static func normalize(_ text: String) -> String {
        text.lowercased().folding(options: [.diacriticInsensitive, .widthInsensitive], locale: nil).filter { !$0.isWhitespace }
    }
    /// Chinese name, English name, full pinyin and pinyin initials, in rank order.
    static func searchKeys(_ e: Entry) -> [String] {
        let latin = (e.name.applyingTransform(.toLatin, reverse: false) ?? e.name)
            .folding(options: .diacriticInsensitive, locale: nil).lowercased()
        let syllables = latin.split(whereSeparator: { $0.isWhitespace })
        return [normalize(e.name), normalize(e.englishName), syllables.joined(), String(syllables.compactMap(\.first))]
    }
}

extension WorkoutMove {
    public init(library entry: ExerciseLibrary.Entry) {
        self.init(name: entry.name, metric: entry.metric)
        identity = entry.identity
        perSide = entry.perSide
        target.sets = 3; target.minReps = 8; target.maxReps = 12
        target.durationSeconds = 30
        target.restSeconds = entry.metric == .weightReps ? 90 : 60
    }
    public var libraryID: String? {
        identity.hasPrefix(ExerciseLibrary.identityPrefix) ? String(identity.dropFirst(ExerciseLibrary.identityPrefix.count)) : nil
    }
}

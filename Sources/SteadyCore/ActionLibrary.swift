import Foundation

/// One move from the illustrated action library (tools/action-library/export.mjs).
/// Learning content only: it does not join plans, templates or the exercise catalog.
public struct ActionLibraryEntry: Decodable, Sendable, Identifiable, Hashable {
    public let id: String
    public let title: String
    public let group: String
    public let equipment: [String]
    public let lesson: TrainingLesson
    public let animation: TrainingAnimation
    public let part: String

    private enum CodingKeys: String, CodingKey { case id, title, group, equipment, lesson, animation }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        title = try c.decode(String.self, forKey: .title)
        group = try c.decode(String.self, forKey: .group)
        equipment = try c.decode([String].self, forKey: .equipment)
        lesson = try c.decode(TrainingLesson.self, forKey: .lesson)
        animation = try c.decode(TrainingAnimation.self, forKey: .animation)
        part = decoder.userInfo[.actionLibraryPart] as? String ?? ""
    }

    public static func == (a: Self, b: Self) -> Bool { a.part == b.part && a.id == b.id }
    public func hash(into hasher: inout Hasher) { hasher.combine(part); hasher.combine(id) }

    /// Asset catalog name of the row icon (tools/action-library/icons.mjs).
    public var iconName: String { "action-\(id)" }

    public var artworkURL: URL? {
        guard animation.resource == "\(id).html", !id.contains("/"), !id.contains("\\") else { return nil }
        return Bundle.module.url(forResource: id, withExtension: "html", subdirectory: "TrainingCollections/ActionLibrary/\(part)")
    }
}

extension CodingUserInfoKey {
    fileprivate static let actionLibraryPart = CodingUserInfoKey(rawValue: "actionLibraryPart")!
}

public struct ActionLibraryGroup: Sendable, Identifiable {
    public let title: String
    public let entries: [ActionLibraryEntry]
    public var id: String { title }
    public init(title: String, entries: [ActionLibraryEntry]) { self.title = title; self.entries = entries }
}

public enum ActionLibrary {
    public static let parts = ["chest"]
    public static func title(part: String) -> String { part == "chest" ? "胸部" : part }

    private static let cache = Cache()
    private final class Cache: @unchecked Sendable {
        let lock = NSLock()
        var parts: [String: Result<[ActionLibraryEntry], Error>] = [:]
    }

    /// Entries in display order; every row must point at a bundled page.
    public static func entries(part: String) throws -> [ActionLibraryEntry] {
        cache.lock.lock(); defer { cache.lock.unlock() }
        if let cached = cache.parts[part] { return try cached.get() }
        let result = Result { try read(part: part) }
        cache.parts[part] = result
        return try result.get()
    }

    public static func groups(part: String) throws -> [ActionLibraryGroup] {
        let rows = try entries(part: part)
        var order: [String] = []
        for row in rows where !order.contains(row.group) { order.append(row.group) }
        return order.map { g in ActionLibraryGroup(title: g, entries: rows.filter { $0.group == g }) }
    }

    private static func read(part: String) throws -> [ActionLibraryEntry] {
        guard parts.contains(part),
              let url = Bundle.module.url(forResource: "library", withExtension: "json", subdirectory: "TrainingCollections/ActionLibrary/\(part)") else {
            throw TrainingCollectionLoadError.missingResource
        }
        let decoder = JSONDecoder()
        decoder.userInfo[.actionLibraryPart] = part
        let rows = try decoder.decode([ActionLibraryEntry].self, from: Data(contentsOf: url))
        guard !rows.isEmpty, Set(rows.map(\.id)).count == rows.count else { throw TrainingCollectionLoadError.invalidResource }
        for row in rows {
            guard row.lesson.id == row.animation.lessonID,
                  row.animation.durationSeconds.isFinite, row.animation.durationSeconds > 0,
                  row.animation.steps.count >= 4,
                  abs(row.animation.playbackTiming.duration - row.animation.durationSeconds * 1000) < 1 else {
                throw TrainingCollectionLoadError.invalidResource
            }
            // Page contents are checked by the tests; reading 280 pages here would stall the list.
            guard row.artworkURL != nil else { throw TrainingCollectionLoadError.missingResource }
        }
        return rows
    }
}

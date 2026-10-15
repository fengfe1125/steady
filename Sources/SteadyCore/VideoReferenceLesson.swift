import Foundation

/// Six independently attributed video-derived examples; saved plan identities stay unchanged.
public struct VideoReferenceLesson: Decodable, Sendable, Identifiable {
    public let id: String
    public let existingLessonID: String
    public let compatible: Bool
    public let sourceID: String
    public let variant: String
    public let lesson: TrainingLesson
    public let animation: TrainingAnimation

    private static let bundled: Result<[Self], Error> = Result { try readAll() }
    public static func loadAll() throws -> [Self] { try bundled.get() }

    private static func readAll() throws -> [Self] {
        guard let url = Bundle.module.url(forResource: "lessons", withExtension: "json", subdirectory: "TrainingCollections/VideoReferences") else {
            throw TrainingCollectionLoadError.missingResource
        }
        let rows = try JSONDecoder().decode([Self].self, from: Data(contentsOf: url))
        guard Set(rows.map(\.id)).count == rows.count,
              Set(rows.map(\.existingLessonID)).count == rows.count else { throw TrainingCollectionLoadError.invalidResource }
        for row in rows {
            guard row.lesson.id == row.animation.lessonID,
                  row.animation.durationSeconds.isFinite, row.animation.durationSeconds > 0,
                  row.animation.resource == "reference-\(row.id).html",
                  row.animation.steps.count >= 4,
                  abs(row.animation.playbackTiming.duration - row.animation.durationSeconds * 1000) < 0.01 else {
                throw TrainingCollectionLoadError.invalidResource
            }
            guard let artwork = row.artworkURL,
                  try TrainingArtworkDocument.usesBundledAnatomy(at: artwork) else {
                throw TrainingCollectionLoadError.missingResource
            }
        }
        return rows
    }
    public static func matching(lessonID: String) -> Self? {
        try? loadAll().first { $0.existingLessonID == lessonID }
    }
    public var artworkURL: URL? {
        guard animation.resource == "reference-\(id).html", !id.contains("/"), !id.contains("\\") else { return nil }
        return Bundle.module.url(forResource: "reference-\(id)", withExtension: "html", subdirectory: "TrainingCollections/VideoReferences")
    }
}

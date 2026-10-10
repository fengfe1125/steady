import Foundation

public struct TrainingArtworkExplanations: Decodable, Equatable, Sendable {
    public let id: String
    public let detailExplanation: String
    public let mistakeExplanation: String
    /// Muscle names coloured by the artwork (pages built before these fields existed omit them).
    public let primaryMuscles: [String]?
    public let secondaryMuscles: [String]?
    public let stretchMuscles: [String]?
}

/// Anatomy pages load their own renderer from the same offline resource directory.
public enum TrainingArtworkDocument {
    public static let anatomyEngine = "steady-anatomy.js"

    public static func usesBundledAnatomy(at url: URL) throws -> Bool {
        let html = try String(contentsOf: url, encoding: .utf8)
        guard html.contains("window.SteadyLesson=") else { return false }
        guard html.contains("<script src=\"\(anatomyEngine)\"></script>") else {
            throw TrainingCollectionLoadError.invalidResource
        }
        let engine = url.deletingLastPathComponent().appendingPathComponent(anatomyEngine)
        guard FileManager.default.isReadableFile(atPath: engine.path) else {
            throw TrainingCollectionLoadError.missingResource
        }
        return true
    }

    public static func anatomyExplanations(at url: URL, lessonID: String) throws -> TrainingArtworkExplanations? {
        guard try usesBundledAnatomy(at: url) else { return nil }
        let html = try String(contentsOf: url, encoding: .utf8)
        guard let start = html.range(of: "window.SteadyLesson="),
              let end = html.range(of: ";</script>", range: start.upperBound..<html.endIndex),
              let json = String(html[start.upperBound..<end.lowerBound]).data(using: .utf8) else {
            throw TrainingCollectionLoadError.invalidResource
        }
        let explanations = try JSONDecoder().decode(TrainingArtworkExplanations.self, from: json)
        guard explanations.id == lessonID, !explanations.detailExplanation.isEmpty, !explanations.mistakeExplanation.isEmpty else {
            throw TrainingCollectionLoadError.invalidResource
        }
        return explanations
    }
}

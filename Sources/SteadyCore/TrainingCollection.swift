import Foundation

public enum TrainingContentOrigin: String, Codable, Sendable {
    case video, supplemental
    public var title: String { self == .video ? "原视频整理" : "补充建议" }
}

public struct TrainingReference: Codable, Sendable {
    public let title: String
    public let url: URL
}

public struct TrainingNote: Codable, Sendable {
    public let title: String
    public let detail: String
}

public struct TrainingVideoRange: Codable, Sendable {
    public let start: Double
    public let end: Double
    public var label: String { "\(Self.timestamp(start))–\(Self.timestamp(end))" }
    public static func timestamp(_ seconds: Double) -> String {
        let value = max(0, Int(seconds))
        return String(format: "%02d:%02d", value / 60, value % 60)
    }
}

public struct TrainingFrame: Codable, Identifiable, Sendable {
    public let resource: String
    public let seconds: Double
    public let caption: String
    public var id: String { resource }
    public var timestamp: String { TrainingVideoRange.timestamp(seconds) }
    public var imageURL: URL? {
        Bundle.module.url(forResource: resource, withExtension: "jpg", subdirectory: "TrainingCollections")
    }
}

public enum TrainingIllustration: String, Codable, Sendable {
    case walking, armCircles, wallPushUp, warmupPress, chestPress, pecFly
}

public struct TrainingLesson: Codable, Identifiable, Sendable {
    public let id: String
    public let title: String
    public let summary: String
    public let equipment: String
    public let origin: TrainingContentOrigin
    public let videoRange: TrainingVideoRange?
    public let dosage: String
    public let frames: [TrainingFrame]
    /// Supplemental diagrams are separate from attributed video frames.
    public let illustration: TrainingIllustration?
    public let preparation: [TrainingNote]
    public let steps: [TrainingNote]
    public let cues: [TrainingNote]
    public let mistakes: [TrainingNote]
    public let supplements: [TrainingNote]
    public let checks: [String]
    public let references: [TrainingReference]
}

public struct TrainingCollectionSection: Codable, Identifiable, Sendable {
    public let id: String
    public let title: String
    public let caption: String
    public let lessons: [TrainingLesson]
}

public struct TrainingCollection: Codable, Identifiable, Sendable {
    public let id: String
    public let title: String
    public let subtitle: String
    public let author: String
    public let sourceTitle: String
    public let sourceURL: URL
    public let durationSeconds: Double
    public let overview: String
    public let equipment: String
    public let trainingNote: String
    public let sections: [TrainingCollectionSection]
    public let references: [TrainingReference]
    public var lessons: [TrainingLesson] { sections.flatMap(\.lessons) }
    public var videoLessons: [TrainingLesson] { lessons.filter { $0.origin == .video } }
    public func lesson(id: String) -> TrainingLesson? { lessons.first { $0.id == id } }
}

public enum TrainingCollectionLoadError: Error, Sendable {
    case missingResource, invalidResource
}


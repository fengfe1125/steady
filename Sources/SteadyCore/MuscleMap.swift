import CoreGraphics
import Foundation

/// How strongly a body-map region is shown. Target muscles outrank secondary ones.
public enum MuscleEmphasis: Int, Comparable, Sendable {
    case secondary = 1, target = 2
    public static func < (a: Self, b: Self) -> Bool { a.rawValue < b.rawValue }
}

/// Front and back body outlines from MuscleMap (MIT), pinned in
/// `tools/muscle-map/build.mjs`. Only the path data is vendored; drawing and
/// colors live in the app so the map follows Steady's own theme.
public struct MuscleMapArtwork: Decodable, Sendable {
    public struct Source: Decodable, Sendable {
        public let title: String
        public let repository: String
        public let tag: String
        public let commit: String
        public let license: String
        public let licenseText: String
        public let scope: String
    }
    public enum Side: String, Decodable, CaseIterable, Sendable { case front, back }
    /// `base` and `cosmetic` regions form the figure; `detail` regions sit on
    /// top of their `parent` and are drawn only while highlighted.
    public enum Layer: String, Decodable, Sendable { case base, detail, cosmetic }
    public struct Region: Decodable, Identifiable, Sendable {
        public let id: String
        public let layer: Layer
        public let parent: String?
        /// A region cut out of a larger muscle shows that muscle's highlight when it has none.
        public let inherits: String?
        public let paths: [String]
        public internal(set) var commands: [SVGPathCommand] = []
        private enum CodingKeys: String, CodingKey { case id, layer, parent, inherits, paths }
    }
    public struct View: Decodable, Sendable {
        public let side: Side
        let viewBox: [Double]
        public var regions: [Region]
        public var bounds: CGRect { CGRect(x: viewBox[0], y: viewBox[1], width: viewBox[2], height: viewBox[3]) }
    }
    /// One region to fill, in drawing order, with its highlight if any.
    public struct Fill: Sendable {
        public let region: Region
        public let emphasis: MuscleEmphasis?
    }

    public let schemaVersion: Int
    public let source: Source
    public var views: [View]

    /// Parsed once; the bundled paths take a few milliseconds to decode.
    public static let shared: MuscleMapArtwork? = try? load()

    public static func load() throws -> Self {
        guard let url = Bundle.module.url(forResource: "muscle-map.v1", withExtension: "json", subdirectory: "MuscleMap") else {
            throw ServiceError.invalidInput("肌肉图暂时无法读取。")
        }
        var result = try JSONDecoder().decode(Self.self, from: Data(contentsOf: url))
        guard result.schemaVersion == 1, Set(result.views.map(\.side)) == Set(Side.allCases) else { throw ServiceError.invalidResponse }
        for v in result.views.indices {
            for r in result.views[v].regions.indices {
                result.views[v].regions[r].commands = try result.views[v].regions[r].paths.flatMap(SVGPath.parse)
            }
        }
        return result
    }

    public func view(_ side: Side) -> View? { views.first { $0.side == side } }
    /// Every region ID drawn on at least one side.
    public var regionIDs: Set<String> { Set(views.flatMap { $0.regions.map(\.id) }) }

    /// The figure first, then highlighted details that add something their parent does not already show.
    public func fills(_ side: Side, highlights: [String: MuscleEmphasis]) -> [Fill] {
        guard let view = view(side) else { return [] }
        var result: [Fill] = []
        for region in view.regions where region.layer != .detail {
            let emphasis = region.layer == .cosmetic ? nil : highlights[region.id] ?? region.inherits.flatMap { highlights[$0] }
            result.append(Fill(region: region, emphasis: emphasis))
        }
        for region in view.regions where region.layer == .detail {
            guard let emphasis = highlights[region.id] else { continue }
            if let parent = region.parent, let shown = highlights[parent], shown >= emphasis { continue }
            result.append(Fill(region: region, emphasis: emphasis))
        }
        return result
    }
}

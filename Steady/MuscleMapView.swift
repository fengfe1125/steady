import SwiftUI
import SteadyCore

/// Front and back body map with the muscles named in text underneath. It is a
/// standalone figure: never place it over a teaching animation's character.
struct MuscleMapPanel: View {
    let target: [String]
    let secondary: [String]
    let label: (String) -> String

    var body: some View {
        let highlights = MuscleRegions.highlights(target: target, secondary: secondary)
        VStack(alignment: .leading, spacing: 12) {
            MuscleMapFigure(highlights: highlights)
            if !target.isEmpty { legendRow("主要肌群", names: target, emphasis: .target) }
            if !secondary.isEmpty { legendRow("协同肌群", names: secondary, emphasis: .secondary) }
            if !notes.isEmpty {
                Text(notes.joined(separator: "；") + "。").font(.footnote).foregroundStyle(SteadyTheme.secondary)
            }
        }.padding(.vertical, 4)
    }

    /// Why a muscle is missing from the figure or drawn on a neighbouring region.
    private var notes: [String] {
        var seen = Set<String>()
        return (target + secondary).compactMap { MuscleRegions.unmapped[$0] ?? MuscleRegions.approximate[$0] }.filter { seen.insert($0).inserted }
    }

    private func legendRow(_ title: String, names: [String], emphasis: MuscleEmphasis) -> some View {
        var seen = Set<String>()
        return HStack(spacing: 8) {
            Circle().fill(MuscleMapFigure.color(emphasis)).frame(width: 10, height: 10)
            Text(title).foregroundStyle(SteadyTheme.secondary)
            Spacer(minLength: 12)
            Text(names.map(label).filter { seen.insert($0).inserted }.joined(separator: "、")).multilineTextAlignment(.trailing)
        }.accessibilityElement(children: .combine)
    }
}

/// The front and back figures side by side, filled with Steady's theme colors.
struct MuscleMapFigure: View {
    let highlights: [String: MuscleEmphasis]

    static func color(_ emphasis: MuscleEmphasis?) -> Color {
        switch emphasis {
        case .target: SteadyTheme.primary
        case .secondary: SteadyTheme.primary.opacity(0.42)
        case nil: SteadyTheme.line
        }
    }

    var body: some View {
        if let map = MuscleMapArtwork.shared {
            HStack(spacing: 16) {
                ForEach(MuscleMapArtwork.Side.allCases, id: \.self) { side in
                    if let view = map.view(side) {
                        VStack(spacing: 6) {
                            Canvas { context, size in draw(map.fills(side, highlights: highlights), in: view.bounds, context: context, size: size) }
                                .aspectRatio(view.bounds.width / view.bounds.height, contentMode: .fit)
                            Text(side == .front ? "正面" : "背面").font(.caption).foregroundStyle(SteadyTheme.secondary)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity).frame(height: 260)
            // The names below carry the same information as text.
            .accessibilityHidden(true)
        }
    }

    private func draw(_ fills: [MuscleMapArtwork.Fill], in box: CGRect, context: GraphicsContext, size: CGSize) {
        let scale = min(size.width / box.width, size.height / box.height)
        let transform = CGAffineTransform(translationX: (size.width - box.width * scale) / 2, y: (size.height - box.height * scale) / 2)
            .scaledBy(x: scale, y: scale).translatedBy(x: -box.minX, y: -box.minY)
        for fill in fills {
            let shading: Color = fill.region.id == "hair" ? SteadyTheme.secondary.opacity(0.55) : Self.color(fill.emphasis)
            context.fill(Path(fill.region.commands).applying(transform), with: .color(shading))
        }
    }
}

private extension Path {
    init(_ commands: [SVGPathCommand]) {
        self.init()
        for command in commands {
            switch command {
            case .move(let p): move(to: p)
            case .line(let p): addLine(to: p)
            case .quad(let c, let p): addQuadCurve(to: p, control: c)
            case .cubic(let c1, let c2, let p): addCurve(to: p, control1: c1, control2: c2)
            case .close: closeSubpath()
            }
        }
    }
}

extension MuscleMapPanel {
    /// Muscles from library moves with at least one completed work set; a muscle
    /// that any move targets is listed as a target, not again as a helper.
    static func trained(in log: WorkoutLog, library: ExerciseLibrary) -> (target: [String], secondary: [String]) {
        var target: [String] = [], secondary: [String] = []
        for exercise in log.exercises where exercise.sets.contains(where: { !$0.warmup && $0.completedAt != nil }) {
            guard let entry = exercise.move.libraryID.flatMap(library.entry(id:)) else { continue }
            if !target.contains(entry.target) { target.append(entry.target) }
            for id in entry.secondaryMuscles where !secondary.contains(id) { secondary.append(id) }
        }
        return (target, secondary.filter { !target.contains($0) })
    }
}

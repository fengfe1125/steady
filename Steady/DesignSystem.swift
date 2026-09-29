import SwiftUI
import UIKit
import CoreText

enum SteadyTheme {
    static let background = Color("Background")
    static let card = Color("Card")
    static let primary = Color("Primary")
    static let secondary = Color("Secondary")
    static let soft = Color("Soft")
    static let line = Color("Line")
    static let button = Color("ButtonFill")
}

struct JournalCard<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 12) { content }
            .frame(maxWidth: .infinity, alignment: .leading).padding(16)
            .background(SteadyTheme.card, in: RoundedRectangle(cornerRadius: 20))
    }
}
struct DemoBadge: View {
    var body: some View {
        Label("演示数据 · 不是实际身体分析", systemImage: "leaf")
            .font(.footnote).foregroundStyle(SteadyTheme.secondary)
            .accessibilityIdentifier("demoBadge")
    }
}
struct PrimaryAction: View {
    let title: String
    var action: () -> Void
    var body: some View {
        Button(action: action) { Text(title).foregroundStyle(SteadyTheme.primary).frame(maxWidth: .infinity).padding(.vertical, 8) }
            .buttonStyle(.borderedProminent).tint(SteadyTheme.button).controlSize(.large)
    }
}
struct JournalPage<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        ScrollView { VStack(alignment: .leading, spacing: 16) { content }.padding(24) }
            .background(SteadyTheme.background)
    }
}
struct EvidenceView: View {
    let evidence: [SteadyCore.EvidenceReference]
    var body: some View {
        ForEach(evidence) { ref in
            VStack(alignment: .leading, spacing: 4) {
                Text("\(ref.metric) · \(ref.value)").font(.subheadline.weight(.medium))
                Text("\(ref.dayKey) · \(ref.source == .demo ? "固定虚构样例" : "苹果健康摘要")").font(.caption).foregroundStyle(.secondary)
            }.accessibilityElement(children: .combine)
        }
    }
}
import SteadyCore

struct ModeBadge: View {
    let isDemo: Bool
    var body: some View {
        if isDemo { DemoBadge() }
        else { Label("健康日记 · 非医疗诊断", systemImage: "leaf").font(.footnote).foregroundStyle(SteadyTheme.secondary) }
    }
}


/// Decorative typography only; system controls retain their native fonts.
enum JournalFonts {
    static func register() {
        for url in Bundle.main.urls(forResourcesWithExtension: "ttf", subdirectory: nil) ?? [] {
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        }
    }
    static func handwriting(_ size: CGFloat = 30) -> Font {
        UIFont(name: "LongCang-Regular", size: size) != nil
            ? .custom("LongCang-Regular", size: size, relativeTo: .title2) : .system(.title2, design: .rounded)
    }
    static var english: Font {
        UIFont(name: "Caveat-Regular", size: 22) != nil
            ? .custom("Caveat-Regular", size: 22, relativeTo: .body) : .system(.body, design: .serif)
    }
}

struct JournalWelcome: View {
    let title: String
    var subtitle: String? = nil
    var expression: SproutExpression = .happy
    var presentation: SproutPresentation = .full
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var appeared = false
    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 8) {
                Text(title).font(JournalFonts.handwriting()).foregroundStyle(SteadyTheme.primary)
                    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
                    .fixedSize(horizontal: false, vertical: true)
                if let subtitle { Text(subtitle).font(.subheadline).foregroundStyle(SteadyTheme.secondary) }
            }
            Spacer(minLength: 0)
            if !typeSize.isAccessibilitySize || presentation != .leaves {
                SproutView(expression: expression, presentation: presentation)
                    .frame(width: presentation == .leaves ? 50 : 64, height: presentation == .leaves ? 34 : 82)
            }
        }
        .padding(16).frame(maxWidth: .infinity, alignment: .leading)
        .background(SteadyTheme.soft, in: RoundedRectangle(cornerRadius: 20))
        .opacity(appeared || reduceMotion ? 1 : 0)
        .onAppear { withAnimation(reduceMotion ? nil : .easeOut(duration: 0.3)) { appeared = true } }
    }
}

struct JournalSurface: ViewModifier {
    func body(content: Content) -> some View {
        content.scrollContentBackground(.hidden).background(SteadyTheme.background)
    }
}
extension View {
    func journalSurface() -> some View { modifier(JournalSurface()) }
    func journalPrimaryButton() -> some View {
        buttonStyle(.borderedProminent).tint(SteadyTheme.button).foregroundStyle(SteadyTheme.primary)
    }
}

@MainActor enum JournalIcons {
    static let exercise: UIImage = {
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 24, height: 24))
        let result = renderer.image { _ in
            let p = UIBezierPath()
            p.move(to: CGPoint(x: 12, y: 7))
            p.addCurve(to: CGPoint(x: 12, y: 2), controlPoint1: CGPoint(x: 8, y: 7), controlPoint2: CGPoint(x: 8, y: 2))
            p.addCurve(to: CGPoint(x: 12, y: 7), controlPoint1: CGPoint(x: 16, y: 2), controlPoint2: CGPoint(x: 16, y: 7))
            for point in [CGPoint(x:12,y:12),CGPoint(x:3,y:7),CGPoint(x:12,y:12),CGPoint(x:21,y:6),CGPoint(x:12,y:12),CGPoint(x:12,y:16),CGPoint(x:6,y:22),CGPoint(x:12,y:16),CGPoint(x:18,y:22)] { p.addLine(to: point) }
            p.lineWidth = 1.5; p.lineCapStyle = .round; p.lineJoinStyle = .round
            UIColor.black.setStroke(); p.stroke()
        }
        return result.withRenderingMode(.alwaysTemplate)
    }()
}

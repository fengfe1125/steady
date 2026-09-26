import SwiftUI

enum SteadyTheme {
    static let background = Color("Background")
    static let card = Color("Card")
    static let primary = Color("Primary")
    static let secondary = Color("Secondary")
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
        Button(action: action) { Text(title).foregroundStyle(Color("OnAccent")).frame(maxWidth: .infinity).padding(.vertical, 8) }
            .buttonStyle(.borderedProminent).controlSize(.large)
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

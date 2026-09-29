import SwiftUI

enum SproutExpression: CaseIterable {
    case normal, happy, shy, wink, sleepy, curious, surprised, sad, focused, eager, peek, nervous
    var label: String {
        switch self {
        case .normal: "平静"
        case .happy: "开心"
        case .shy: "害羞"
        case .wink: "眨眼"
        case .sleepy: "困困"
        case .curious: "好奇"
        case .surprised: "惊讶"
        case .sad: "委屈"
        case .focused: "认真"
        case .eager: "期待"
        case .peek: "偷看"
        case .nervous: "紧张"
        }
    }
}
enum SproutPresentation { case full, half, leaves }

/// The outline is one continuous stroke; the eyes are independent for expression and blinking.
struct SproutView: View {
    var expression: SproutExpression = .normal
    var presentation: SproutPresentation = .full
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @State private var visible = false
    @State private var selectedExpression: SproutExpression?
    @State private var tapCount = 0

    private struct TapPose {
        var width = 1.0
        var height = 1.0
        var lift = 0.0
        var tilt = 0.0
    }
    private var currentExpression: SproutExpression { selectedExpression ?? expression }
    private var animates: Bool { visible && !reduceMotion && scenePhase == .active }
    var body: some View {
        Group {
            if presentation == .leaves {
                artwork.accessibilityHidden(true).allowsHitTesting(false)
            } else {
                Button {
                    let expressions = SproutExpression.allCases
                    let index = expressions.firstIndex(of: currentExpression) ?? 0
                    selectedExpression = expressions[(index + 1) % expressions.count]
                    if animates { tapCount += 1 }
                } label: {
                    artwork
                        .keyframeAnimator(initialValue: TapPose(), trigger: tapCount) { content, pose in
                            content
                                .scaleEffect(x: animates ? pose.width : 1,
                                             y: animates ? pose.height : 1, anchor: .bottom)
                                .rotationEffect(.degrees(animates ? pose.tilt : 0), anchor: .bottom)
                                .offset(y: animates ? pose.lift : 0)
                        } keyframes: { _ in
                            KeyframeTrack(\.width) {
                                CubicKeyframe(1.07, duration: 0.09)
                                CubicKeyframe(0.96, duration: 0.14)
                                CubicKeyframe(1.02, duration: 0.20)
                                CubicKeyframe(1, duration: 0.13)
                            }
                            KeyframeTrack(\.height) {
                                CubicKeyframe(0.93, duration: 0.09)
                                CubicKeyframe(1.05, duration: 0.14)
                                CubicKeyframe(0.98, duration: 0.20)
                                CubicKeyframe(1, duration: 0.13)
                            }
                            KeyframeTrack(\.lift) {
                                CubicKeyframe(0, duration: 0.09)
                                CubicKeyframe(-5, duration: 0.14)
                                CubicKeyframe(0, duration: 0.20)
                                CubicKeyframe(0, duration: 0.13)
                            }
                            KeyframeTrack(\.tilt) {
                                CubicKeyframe(-2, duration: 0.09)
                                CubicKeyframe(3, duration: 0.14)
                                CubicKeyframe(-1, duration: 0.20)
                                CubicKeyframe(0, duration: 0.13)
                            }
                        }
                        .frame(minWidth: 44, minHeight: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("叶芽")
                .accessibilityValue(currentExpression.label)
                .accessibilityHint("轻点切换表情")
                .accessibilityIdentifier("sproutChangeExpression")
            }
        }
        .onAppear { visible = true }.onDisappear { visible = false }
    }
    private var artwork: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 15, paused: !animates)) { timeline in
            let t = animates ? timeline.date.timeIntervalSinceReferenceDate : 0
            Canvas { ctx, size in
                let height: CGFloat = presentation == .leaves ? 60 : presentation == .half ? 112 : 150
                let scale = min(size.width / 110, size.height / height)
                ctx.translateBy(x: (size.width - 110 * scale) / 2, y: (size.height - height * scale) / 2)
                ctx.scaleBy(x: scale, y: scale)
                ctx.translateBy(x: -115, y: -30)
                var outline = Path()
                outline.move(to: CGPoint(x:171,y:86))
                if presentation != .leaves {
                outline.addCurve(to: CGPoint(x:123,y:130), control1: CGPoint(x:145,y:82), control2: CGPoint(x:123,y:103))
                outline.addCurve(to: CGPoint(x:168,y:174), control1: CGPoint(x:122,y:155), control2: CGPoint(x:143,y:173))
                outline.addCurve(to: CGPoint(x:216,y:132), control1: CGPoint(x:195,y:175), control2: CGPoint(x:215,y:156))
                outline.addCurve(to: CGPoint(x:171,y:86), control1: CGPoint(x:218,y:107), control2: CGPoint(x:198,y:86))
                }
                outline.addCurve(to: CGPoint(x:128,y:37), control1: CGPoint(x:165,y:64), control2: CGPoint(x:143,y:43))
                outline.addCurve(to: CGPoint(x:171,y:86), control1: CGPoint(x:127,y:59), control2: CGPoint(x:142,y:80))
                outline.addCurve(to: CGPoint(x:219,y:36), control1: CGPoint(x:176,y:63), control2: CGPoint(x:196,y:42))
                outline.addCurve(to: CGPoint(x:171,y:86), control1: CGPoint(x:217,y:59), control2: CGPoint(x:200,y:80))
                ctx.stroke(outline, with: .color(.accentColor), style: StrokeStyle(lineWidth: 3.3, lineCap: .round, lineJoin: .round))
                if presentation != .leaves {
                    let mood: SproutExpression = animates && t.truncatingRemainder(dividingBy: 7) < 0.16 ? .sleepy : currentExpression
                    drawEyes(in: &ctx, expression: mood)
                }
            }
            .clipped()
            .offset(y: animates ? sin(t * .pi / 2) * 1.5 : 0)
        }
        .accessibilityHidden(true)
    }
    private func drawEyes(in ctx: inout GraphicsContext, expression: SproutExpression) {
        func stroke(_ points: [CGPoint]) {
            var p = Path(); p.addLines(points)
            ctx.stroke(p, with: .color(.accentColor), style: StrokeStyle(lineWidth: 3.3, lineCap: .round, lineJoin: .round))
        }
        func dot(_ x: CGFloat, _ y: CGFloat = 130, _ rx: CGFloat = 3.5, _ ry: CGFloat = 3.5, ring: Bool = false) {
            let p = Path(ellipseIn: CGRect(x:x-rx,y:y-ry,width:rx*2,height:ry*2))
            if ring { ctx.stroke(p, with: .color(.accentColor), lineWidth: 2.8) }
            else { ctx.fill(p, with: .color(.accentColor)) }
        }
        for (index,x) in [CGFloat(155),184].enumerated() {
            switch expression {
            case .happy, .sleepy:
                var p = Path(); p.move(to: CGPoint(x:x-6,y:132))
                p.addQuadCurve(to: CGPoint(x:x+6,y:132), control: CGPoint(x:x,y:expression == .happy ? 120 : 138))
                ctx.stroke(p, with: .color(.accentColor), style: StrokeStyle(lineWidth: 3.3, lineCap: .round))
            case .shy: stroke([CGPoint(x:x+(index == 0 ? -5 : 5),y:124),CGPoint(x:x+(index == 0 ? 3 : -3),y:130),CGPoint(x:x+(index == 0 ? -5 : 5),y:136)])
            case .wink where index == 1: stroke([CGPoint(x:x-5,y:132),CGPoint(x:x+5,y:128)])
            case .curious where index == 1: dot(x,128,4,6)
            case .surprised: dot(x,130,4,6,ring:true)
            case .eager: dot(x,130,5.5,5.5,ring:true); dot(x+1,131,2,2)
            case .sad, .focused:
                let slope: CGFloat = expression == .sad ? -5 : 3
                stroke([CGPoint(x:x-6,y:125+(index == 0 ? 0 : slope)),CGPoint(x:x+5,y:125+(index == 0 ? slope : 0))]); dot(x,134,2.5,2.5)
            case .peek: stroke([CGPoint(x:x-6,y:126),CGPoint(x:x+6,y:126)]); dot(x+3,132,3,3)
            case .nervous: stroke([CGPoint(x:x,y:125),CGPoint(x:x,y:135)])
            default: dot(x)
            }
        }
    }
}

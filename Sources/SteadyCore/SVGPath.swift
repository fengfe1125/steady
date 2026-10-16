import CoreGraphics
import Foundation

/// A drawing command in absolute coordinates. Arcs and smooth curves are
/// resolved while parsing, so a renderer only needs these five cases.
public enum SVGPathCommand: Equatable, Sendable {
    case move(CGPoint)
    case line(CGPoint)
    case quad(control: CGPoint, to: CGPoint)
    case cubic(control1: CGPoint, control2: CGPoint, to: CGPoint)
    case close
}

/// Parses SVG path data (`d` attributes), including the compact forms that
/// minifiers emit: `1-2`, `.5.5` and arc flags without separators (`a1 1 0 01.5.5`).
public enum SVGPath {
    public struct ParseError: Error, Equatable { public let offset: Int }

    public static func parse(_ data: String) throws -> [SVGPathCommand] {
        var scanner = Scanner(bytes: Array(data.utf8))
        var result: [SVGPathCommand] = []
        var current = CGPoint.zero, start = CGPoint.zero
        var lastCubic: CGPoint?, lastQuad: CGPoint?
        var command: UInt8 = 0

        while true {
            scanner.skipSeparators()
            guard let byte = scanner.peek() else { break }
            if Scanner.isCommand(byte) { command = byte; scanner.index += 1 }
            else if command == 0 || command == UInt8(ascii: "Z") || command == UInt8(ascii: "z") { throw ParseError(offset: scanner.index) }
            let relative = command >= UInt8(ascii: "a")
            func point() throws -> CGPoint {
                let x = try scanner.number(), y = try scanner.number()
                return relative ? CGPoint(x: current.x + x, y: current.y + y) : CGPoint(x: x, y: y)
            }
            var nextCubic: CGPoint?, nextQuad: CGPoint?
            switch command | 0x20 {
            case UInt8(ascii: "m"):
                current = try point(); start = current
                result.append(.move(current))
                // Further coordinate pairs after a move are implicit lines.
                command = relative ? UInt8(ascii: "l") : UInt8(ascii: "L")
            case UInt8(ascii: "l"):
                current = try point(); result.append(.line(current))
            case UInt8(ascii: "h"):
                let x = try scanner.number(); current.x = relative ? current.x + x : x
                result.append(.line(current))
            case UInt8(ascii: "v"):
                let y = try scanner.number(); current.y = relative ? current.y + y : y
                result.append(.line(current))
            case UInt8(ascii: "c"):
                let c1 = try point(), c2 = try point(), to = try point()
                result.append(.cubic(control1: c1, control2: c2, to: to))
                current = to; nextCubic = c2
            case UInt8(ascii: "s"):
                let c1 = lastCubic.map { reflect($0, about: current) } ?? current
                let c2 = try point(), to = try point()
                result.append(.cubic(control1: c1, control2: c2, to: to))
                current = to; nextCubic = c2
            case UInt8(ascii: "q"):
                let c = try point(), to = try point()
                result.append(.quad(control: c, to: to))
                current = to; nextQuad = c
            case UInt8(ascii: "t"):
                let c = lastQuad.map { reflect($0, about: current) } ?? current
                let to = try point()
                result.append(.quad(control: c, to: to))
                current = to; nextQuad = c
            case UInt8(ascii: "a"):
                let rx = try scanner.number(), ry = try scanner.number(), rotation = try scanner.number()
                let large = try scanner.flag(), sweep = try scanner.flag()
                let to = try point()
                result += arc(from: current, to: to, rx: rx, ry: ry, degrees: rotation, large: large, sweep: sweep)
                current = to
            case UInt8(ascii: "z"):
                result.append(.close); current = start
            default:
                throw ParseError(offset: scanner.index)
            }
            lastCubic = nextCubic; lastQuad = nextQuad
        }
        return result
    }

    /// Bounding box of every point the commands visit, control points included.
    public static func bounds(_ commands: [SVGPathCommand]) -> CGRect {
        var points: [CGPoint] = []
        for command in commands {
            switch command {
            case .move(let p), .line(let p): points.append(p)
            case .quad(let c, let p): points += [c, p]
            case .cubic(let c1, let c2, let p): points += [c1, c2, p]
            case .close: break
            }
        }
        guard let first = points.first else { return .null }
        return points.dropFirst().reduce(CGRect(origin: first, size: .zero)) { $0.union(CGRect(origin: $1, size: .zero)) }
    }

    private static func reflect(_ point: CGPoint, about center: CGPoint) -> CGPoint {
        CGPoint(x: 2 * center.x - point.x, y: 2 * center.y - point.y)
    }

    /// Endpoint-to-center conversion (SVG 1.1 appendix F.6.5), then one cubic per quarter turn or less.
    static func arc(from p0: CGPoint, to p1: CGPoint, rx: Double, ry: Double, degrees: Double, large: Bool, sweep: Bool) -> [SVGPathCommand] {
        var rx = abs(rx), ry = abs(ry)
        if p0 == p1 { return [] }
        if rx == 0 || ry == 0 { return [.line(p1)] }
        let phi = degrees * .pi / 180, cosPhi = cos(phi), sinPhi = sin(phi)
        let dx = (p0.x - p1.x) / 2, dy = (p0.y - p1.y) / 2
        let x1 = cosPhi * dx + sinPhi * dy, y1 = -sinPhi * dx + cosPhi * dy
        let lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry)
        if lambda > 1 { rx *= lambda.squareRoot(); ry *= lambda.squareRoot() }
        let numerator = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
        let denominator = rx * rx * y1 * y1 + ry * ry * x1 * x1
        var factor = (max(0, numerator) / denominator).squareRoot()
        if large == sweep { factor = -factor }
        let cx1 = factor * rx * y1 / ry, cy1 = -factor * ry * x1 / rx
        let cx = cosPhi * cx1 - sinPhi * cy1 + (p0.x + p1.x) / 2
        let cy = sinPhi * cx1 + cosPhi * cy1 + (p0.y + p1.y) / 2
        func angle(_ ux: Double, _ uy: Double, _ vx: Double, _ vy: Double) -> Double {
            atan2(ux * vy - uy * vx, ux * vx + uy * vy)
        }
        let theta = angle(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry)
        var delta = angle((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry)
        if !sweep && delta > 0 { delta -= 2 * .pi } else if sweep && delta < 0 { delta += 2 * .pi }

        let count = max(1, Int((abs(delta) / (.pi / 2)).rounded(.up)))
        let step = delta / Double(count), k = 4.0 / 3.0 * tan(step / 4)
        func onEllipse(_ t: Double) -> CGPoint {
            CGPoint(x: cx + rx * cos(t) * cosPhi - ry * sin(t) * sinPhi, y: cy + rx * cos(t) * sinPhi + ry * sin(t) * cosPhi)
        }
        func derivative(_ t: Double) -> CGPoint {
            CGPoint(x: -rx * sin(t) * cosPhi - ry * cos(t) * sinPhi, y: -rx * sin(t) * sinPhi + ry * cos(t) * cosPhi)
        }
        var result: [SVGPathCommand] = []
        var t = theta, from = p0
        for index in 0..<count {
            let next = t + step
            let to = index == count - 1 ? p1 : onEllipse(next)
            let d0 = derivative(t), d1 = derivative(next)
            result.append(.cubic(control1: CGPoint(x: from.x + k * d0.x, y: from.y + k * d0.y),
                                 control2: CGPoint(x: to.x - k * d1.x, y: to.y - k * d1.y), to: to))
            t = next; from = to
        }
        return result
    }

    private struct Scanner {
        let bytes: [UInt8]
        var index = 0

        static func isCommand(_ byte: UInt8) -> Bool {
            switch byte | 0x20 {
            case UInt8(ascii: "m"), UInt8(ascii: "l"), UInt8(ascii: "h"), UInt8(ascii: "v"), UInt8(ascii: "c"),
                 UInt8(ascii: "s"), UInt8(ascii: "q"), UInt8(ascii: "t"), UInt8(ascii: "a"), UInt8(ascii: "z"): return true
            default: return false
            }
        }
        func peek() -> UInt8? { index < bytes.count ? bytes[index] : nil }
        mutating func skipSeparators() {
            while let byte = peek(), byte == 0x20 || byte == 0x2C || byte == 0x09 || byte == 0x0A || byte == 0x0D { index += 1 }
        }
        /// Arc flags are a single `0` or `1` and may run straight into the next number.
        mutating func flag() throws -> Bool {
            skipSeparators()
            switch peek() {
            case UInt8(ascii: "0"): index += 1; return false
            case UInt8(ascii: "1"): index += 1; return true
            default: throw ParseError(offset: index)
            }
        }
        mutating func number() throws -> Double {
            skipSeparators()
            let begin = index
            if let sign = peek(), sign == UInt8(ascii: "-") || sign == UInt8(ascii: "+") { index += 1 }
            var digits = 0, dot = false
            while let byte = peek() {
                if byte >= UInt8(ascii: "0") && byte <= UInt8(ascii: "9") { digits += 1; index += 1 }
                else if byte == UInt8(ascii: "."), !dot { dot = true; index += 1 }
                else { break }
            }
            guard digits > 0 else { throw ParseError(offset: begin) }
            if let e = peek(), e == UInt8(ascii: "e") || e == UInt8(ascii: "E") {
                let mark = index
                index += 1
                if let sign = peek(), sign == UInt8(ascii: "-") || sign == UInt8(ascii: "+") { index += 1 }
                var exponentDigits = 0
                while let byte = peek(), byte >= UInt8(ascii: "0") && byte <= UInt8(ascii: "9") { exponentDigits += 1; index += 1 }
                if exponentDigits == 0 { index = mark }
            }
            guard let value = Double(String(decoding: bytes[begin..<index], as: UTF8.self)) else { throw ParseError(offset: begin) }
            return value
        }
    }
}

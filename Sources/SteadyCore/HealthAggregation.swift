import Foundation

public struct SleepInterval: Sendable, Equatable {
    public var start: Date
    public var end: Date
    public init(start: Date, end: Date) { self.start = start; self.end = end }
}
public enum HealthAggregation {
    public static func dayKey(_ date: Date, calendar: Calendar) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }
    /// Deduplicate overlapping asleep samples before assigning each merged sleep to its waking day.
    public static func sleepMinutes(_ samples: [SleepInterval], calendar: Calendar) -> [String: Int] {
        let sorted = samples.filter { $0.end > $0.start }.sorted { $0.start < $1.start }
        var merged: [SleepInterval] = []
        for sample in sorted {
            if let last = merged.last, sample.start <= last.end {
                merged[merged.count - 1].end = max(last.end, sample.end)
            } else { merged.append(sample) }
        }
        // Stages separated by brief awake intervals belong to the same night's episode.
        var groups: [[SleepInterval]] = []
        for sample in merged {
            if let last = groups.last?.last, sample.start.timeIntervalSince(last.end) <= 3 * 3600 {
                groups[groups.count - 1].append(sample)
            } else { groups.append([sample]) }
        }
        var seconds: [String: Double] = [:]
        for group in groups {
            guard let end = group.last?.end else { continue }
            seconds[dayKey(end, calendar: calendar), default: 0] += group.reduce(0) { $0 + $1.end.timeIntervalSince($1.start) }
        }
        return seconds.mapValues { Int($0 / 60) }
    }
}

public enum WireCodec {
    public static func encoder() -> JSONEncoder { let e = JSONEncoder(); e.dateEncodingStrategy = .millisecondsSince1970; e.outputFormatting = [.sortedKeys]; return e }
    public static func decoder() -> JSONDecoder { let d = JSONDecoder(); d.dateDecodingStrategy = .millisecondsSince1970; return d }
}

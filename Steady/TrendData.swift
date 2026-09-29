import Foundation
import SteadyCore

enum TrendMetric: String, CaseIterable, Identifiable {
    case weight = "体重", sleep = "睡眠", steps = "步数", active = "运动"
    var id: String { rawValue }
    var unit: String { switch self { case .weight: "kg"; case .sleep: "小时"; case .steps: "步"; case .active: "分钟" } }
    func value(_ s: DailySummary) -> Double? {
        switch self { case .weight: s.weightKG; case .sleep: s.sleepMinutes.map { Double($0) / 60 }; case .steps: s.steps.map(Double.init); case .active: s.activeMinutes.map(Double.init) }
    }
}
struct TrendWindow {
    let start: Date
    let end: Date
    let records: [DailySummary]
    init(summaries: [DailySummary], days: Int, reference: Date, calendar: Calendar = .current) {
        let day = calendar.startOfDay(for: reference)
        let start = calendar.date(byAdding: .day, value: -(max(1, days) - 1), to: day)!
        let end = calendar.date(byAdding: .day, value: 1, to: day)!
        self.start = start; self.end = end
        records = summaries.filter { $0.date >= start && $0.date < end }.sorted { $0.date < $1.date }
    }
    func points(for metric: TrendMetric) -> [DailySummary] {
        records.filter { metric.value($0)?.isFinite == true }
    }
}

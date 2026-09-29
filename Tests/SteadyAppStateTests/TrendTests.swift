import Foundation
import Testing
import SteadyCore
@testable import SteadyAppState

private func calendar(_ zone: String = "Asia/Shanghai") -> Calendar {
    var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: zone)!; return c
}
private func summary(_ date: Date, steps: Int? = nil, weight: Double? = nil) -> DailySummary {
    DailySummary(metadata: RecordMetadata(), dayKey: HealthAggregation.dayKey(date, calendar: calendar()), timeZoneID: "Asia/Shanghai", date: date, weightKG: weight, sleepMinutes: nil, steps: steps, activeMinutes: nil)
}
@Test func trendUsesCalendarWindowNotRecordCount() {
    let c = calendar(), end = c.date(from: DateComponents(year: 2026, month: 9, day: 29))!
    func day(_ offset: Int) -> Date { c.date(byAdding: .day, value: offset, to: end)! }
    let records = [summary(day(1), steps: 9), summary(day(-6), steps: 0), summary(day(-9), steps: 10), summary(day(0), steps: 30), summary(day(-3))]
    let w = TrendWindow(summaries: records, days: 7, reference: end, calendar: c)
    #expect(w.records.map(\.date) == [day(-6), day(-3), day(0)])
    #expect(w.points(for: .steps).map(\.steps) == [0, 30])
    #expect(w.points(for: .sleep).isEmpty)
    #expect(w.points(for: .weight).isEmpty)
    #expect(TrendWindow(summaries: records, days: 14, reference: end, calendar: c).points(for: .steps).count == 3)
    #expect(TrendWindow(summaries: records, days: 30, reference: end, calendar: c).records.count == 4)
}
@Test func trendSinglePointAndMetricUnits() {
    let c = calendar(), now = Date()
    var record = summary(now, steps: 0, weight: 62.5); record.sleepMinutes = 90; record.activeMinutes = 0
    let w = TrendWindow(summaries: [record], days: 7, reference: now, calendar: c)
    for metric in TrendMetric.allCases { #expect(w.points(for: metric).count == 1) }
    #expect(TrendMetric.sleep.value(record) == 1.5)
    #expect(TrendMetric.active.value(record) == 0)
    #expect(TrendWindow(summaries: [], days: 7, reference: now, calendar: c).points(for: .steps).isEmpty)
}
@Test func trendWindowRespectsDaylightSavingBoundary() {
    let c = calendar("America/Los_Angeles")
    let date = c.date(from: DateComponents(year: 2026, month: 3, day: 9))!
    let w = TrendWindow(summaries: [], days: 7, reference: date, calendar: c)
    #expect(c.dateComponents([.day], from: w.start, to: w.end).day == 7)
    #expect(w.end.timeIntervalSince(w.start) == 7 * 86400 - 3600)
}

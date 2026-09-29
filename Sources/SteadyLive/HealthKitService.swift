#if os(iOS)
import Foundation
@preconcurrency import HealthKit
import SteadyCore

public actor HealthKitService: HealthDataService {
    private let health = HKHealthStore()
    private let repository: DeviceRepository
    private var rereadAfterAuthorization = false
    private let types: [HKSampleType] = [HKQuantityType(.bodyMass), HKCategoryType(.sleepAnalysis), HKQuantityType(.stepCount), HKQuantityType(.appleExerciseTime)]
    public init(repository: DeviceRepository) { self.repository = repository }
    public func requestAuthorization() async throws {
        guard HKHealthStore.isHealthDataAvailable() else { throw ServiceError.invalidInput("这台设备不支持苹果健康。") }
        try await health.requestAuthorization(toShare: [], read: Set(types))
        // A previous empty read may have advanced anchors while access was unavailable.
        rereadAfterAuthorization = true
    }
    private struct Cache: Codable {
        var origin: Date
        var timezone: String
        var anchors: [String: Data] = [:]
        var sampleDays: [UUID: [Date]] = [:]
    }
    public func summaries(from: Date, through: Date) async throws -> [DailySummary] {
        guard HKHealthStore.isHealthDataAvailable() else { return [] }
        let epoch = await repository.epoch
        var calendar = Calendar(identifier: .gregorian); calendar.timeZone = .current
        let saved = rereadAfterAuthorization ? nil : try await repository.readHealthCache()
        var cache = saved.flatMap { try? WireCodec.decoder().decode(Cache.self, from: $0) }
            ?? Cache(origin: calendar.startOfDay(for: from), timezone: calendar.timeZone.identifier)
        if cache.timezone != calendar.timeZone.identifier { cache = Cache(origin: calendar.startOfDay(for: from), timezone: calendar.timeZone.identifier) }
        var days = Set<Date>()
        let firstRead = cache.anchors.isEmpty
        var date = calendar.startOfDay(for: firstRead ? from : calendar.date(byAdding: .day, value: -6, to: through)!)
        while date <= through { days.insert(date); date = calendar.date(byAdding: .day, value: 1, to: date)! }
        for type in types {
            let anchor = cache.anchors[type.identifier].flatMap { try? NSKeyedUnarchiver.unarchivedObject(ofClass: HKQueryAnchor.self, from: $0) }
            let predicate = HKQuery.predicateForSamples(withStart: cache.origin, end: nil)
            let changes: ([HKSample], [HKDeletedObject], HKQueryAnchor?) = try await withCheckedThrowingContinuation { continuation in
                let query = HKAnchoredObjectQuery(type: type, predicate: predicate, anchor: anchor, limit: HKObjectQueryNoLimit) { _, samples, deleted, next, error in
                    if let error { continuation.resume(throwing: error) }
                    else { continuation.resume(returning: (samples ?? [], deleted ?? [], next)) }
                }
                health.execute(query)
            }
            for sample in changes.0 {
                let affected = [calendar.startOfDay(for: sample.startDate), calendar.startOfDay(for: sample.endDate)]
                if let old = cache.sampleDays[sample.uuid] { days.formUnion(old) }
                cache.sampleDays[sample.uuid] = affected; days.formUnion(affected)
            }
            for deleted in changes.1 { days.formUnion(cache.sampleDays.removeValue(forKey: deleted.uuid) ?? []) }
            if let next = changes.2 { cache.anchors[type.identifier] = try NSKeyedArchiver.archivedData(withRootObject: next, requiringSecureCoding: true) }
            try Task.checkCancellation()
        }
        // Include adjacent days because a changed/deleted sleep segment may move an episode's waking date.
        for date in Array(days) { days.insert(calendar.date(byAdding: .day, value: -1, to: date)!); days.insert(calendar.date(byAdding: .day, value: 1, to: date)!) }
        days = days.filter { $0 >= cache.origin && $0 <= through }
        guard let earliest = days.min() else { return try await repository.summaries() }
        let end = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: through))!
        let sleep = try await samples(type: HKCategoryType(.sleepAnalysis), start: calendar.date(byAdding: .day, value: -2, to: earliest)!, end: end)
        let asleep = sleep.compactMap { $0 as? HKCategorySample }.filter { [HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue, HKCategoryValueSleepAnalysis.asleepCore.rawValue, HKCategoryValueSleepAnalysis.asleepDeep.rawValue, HKCategoryValueSleepAnalysis.asleepREM.rawValue].contains($0.value) }
        let sleeping = HealthAggregation.sleepMinutes(asleep.map { SleepInterval(start: $0.startDate, end: $0.endDate) }, calendar: calendar)
        var summaries: [DailySummary] = []
        for day in days.sorted() {
            let next = calendar.date(byAdding: .day, value: 1, to: day)!
            let weightSamples = try await samples(type: HKQuantityType(.bodyMass), start: day, end: next)
            let weight = weightSamples.compactMap { $0 as? HKQuantitySample }.filter { $0.endDate >= day && $0.endDate < next }.max { $0.endDate < $1.endDate }
            let steps = try await sum(type: HKQuantityType(.stepCount), unit: .count(), start: day, end: next)
            let exercise = try await sum(type: HKQuantityType(.appleExerciseTime), unit: .minute(), start: day, end: next)
            let key = HealthAggregation.dayKey(day, calendar: calendar)
            var summary = DailySummary(metadata: RecordMetadata(date: day, source: .healthKit), dayKey: key, timeZoneID: calendar.timeZone.identifier, date: day,
                weightKG: weight?.quantity.doubleValue(for: .gramUnit(with: .kilo)), sleepMinutes: sleeping[key], steps: steps.value.map { Int($0) }, activeMinutes: exercise.value.map { Int($0) })
            summary.metadata.revision = 1; summary.calculationVersion = 1
            summary.metricSources = ["weightKG": weight.map { [$0.sourceRevision.source.name] } ?? [], "steps": steps.sources, "activeMinutes": exercise.sources,
                "sleepMinutes": Array(Set(asleep.filter { abs($0.endDate.timeIntervalSince(day)) < 2 * 86400 }.map { $0.sourceRevision.source.name })).sorted()]
            summaries.append(summary)
            try Task.checkCancellation()
        }
        guard await repository.epoch == epoch, try await repository.load().preferences.healthRead else { throw CancellationError() }
        // Persist results before advancing anchors: a failed write will cause changes to be replayed.
        let all = try await repository.saveSummaries(summaries)
        try await repository.writeHealthCache(WireCodec.encoder().encode(cache))
        rereadAfterAuthorization = false
        return all
    }
    private func samples(type: HKSampleType, start: Date, end: Date) async throws -> [HKSample] {
        try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: HKQuery.predicateForSamples(withStart: start, end: end), limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
                if let error { continuation.resume(throwing: error) } else { continuation.resume(returning: samples ?? []) }
            }
            health.execute(query)
        }
    }
    private func sum(type: HKQuantityType, unit: HKUnit, start: Date, end: Date) async throws -> (value: Double?, sources: [String]) {
        try await withCheckedThrowingContinuation { continuation in
            let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate), options: .cumulativeSum) { _, statistics, error in
                if let healthError = error as? HKError, healthError.code == .errorNoData {
                    continuation.resume(returning: (nil, []))
                } else if let error { continuation.resume(throwing: error) }
                else { continuation.resume(returning: (statistics?.sumQuantity()?.doubleValue(for: unit), statistics?.sources?.map(\.name).sorted() ?? [])) }
            }
            health.execute(query)
        }
    }
}
#endif

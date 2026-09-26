import Foundation
import Network
import SteadyCore

@MainActor public final class CloudSyncService: SyncService {
    private let cloud: CloudClient
    private let store: DeviceRepository
    private var status: SyncState = .idle
    private var running = false
    public init(cloud: CloudClient, store: DeviceRepository) { self.cloud = cloud; self.store = store }
    public func state() async -> SyncState { status }
    public func details() async -> SyncDetails { (try? store.details()) ?? SyncDetails() }
    public func restoreHistory() async throws { try await sync() }
    public func retry() async throws { try await sync() }
    public func clearCloudRecords() async throws {
        guard let user = UUID(uuidString: store.partition) else { throw ServiceError.unauthenticated }
        let _: ConsentReply = try await cloud.call("consents", body: store.consent(), expectedUser: user)
        struct Body: Encodable, Sendable { var confirmation = "delete-cloud-records" }
        struct Reply: Decodable, Sendable { var deleted: Bool }
        let reply: Reply = try await cloud.call("cloud-clear", body: Body(), expectedUser: user)
        guard reply.deleted else { throw ServiceError.invalidResponse }
    }
    public func sync() async throws {
        guard !running else { return }
        guard let userID = UUID(uuidString: store.partition) else { status = .idle; return }
        running = true; defer { running = false }
        let epoch = store.epoch, consent = try store.consent()
        do {
            let _: ConsentReply = try await cloud.call("consents", body: consent, expectedUser: userID)
            guard consent.cloudSync else { status = .idle; return }
            status = .syncing
            for mutation in try store.pending() {
                try check(epoch)
                do {
                    let reply: PushReply = try await cloud.call("sync-push", body: PushBody(mutation: mutation, consent: consent), expectedUser: userID)
                    try check(epoch)
                    try store.accept(reply.record, mutationID: reply.conflict ? nil : mutation.id)
                } catch { if store.epoch == epoch { try store.fail(mutation) }; throw error }
            }
            var cursor = try store.cursor(), hasMore = true
            while hasMore {
                try check(epoch)
                let reply: PullReply = try await cloud.call("sync-pull", body: PullBody(cursor: cursor, consent: consent), expectedUser: userID)
                try check(epoch)
                for record in reply.records { try store.accept(record) }
                cursor = reply.cursor; hasMore = reply.hasMore
                try store.finishPull(cursor: cursor)
            }
            status = .idle
        } catch is CancellationError { status = .idle; throw CancellationError() }
        catch { status = .failed(error.localizedDescription); throw error }
    }
    private func check(_ epoch: Int) throws {
        try Task.checkCancellation()
        guard epoch == store.epoch, try store.consent().cloudSync else { throw CancellationError() }
    }
    private struct ConsentReply: Decodable, Sendable { var accepted: Bool }
    private struct PushBody: Encodable, Sendable { var mutation: PendingMutation; var consent: DeviceConsent }
    private struct PushReply: Decodable, Sendable { var record: CloudRecord; var conflict: Bool }
    private struct PullBody: Encodable, Sendable { var cursor: Int; var consent: DeviceConsent }
    private struct PullReply: Decodable, Sendable { var records: [CloudRecord]; var cursor: Int; var hasMore: Bool }
}

/// A cancellable connectivity signal. Sync remains best-effort and never claims background delivery.
public struct Connectivity: Sendable {
    public init() {}
    public func updates() -> AsyncStream<Bool> {
        AsyncStream { continuation in
            let monitor = NWPathMonitor()
            monitor.pathUpdateHandler = { path in continuation.yield(path.status == .satisfied) }
            monitor.start(queue: DispatchQueue(label: "Steady.connectivity"))
            continuation.onTermination = { _ in monitor.cancel() }
        }
    }
}

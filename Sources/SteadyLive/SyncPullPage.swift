import Foundation
import SteadyCore

/// Unknown kinds are skipped while known malformed records still fail the page.
public struct SyncPullPage: Decodable, Sendable {
    public let records: [CloudRecord]
    public let cursor: Int
    public let hasMore: Bool
    public let supportedKinds: [String]
    enum Keys: String, CodingKey { case records, cursor, hasMore, supportedKinds }
    enum Probe: String, CodingKey { case kind }
    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        supportedKinds = try c.decodeIfPresent([String].self, forKey: .supportedKinds) ?? ["profiles", "summaries", "reports", "conversations", "messages", "plans", "sessions", "notes"]
        cursor = try c.decode(Int.self, forKey: .cursor); hasMore = try c.decode(Bool.self, forKey: .hasMore)
        var values = try c.nestedUnkeyedContainer(forKey: .records), result: [CloudRecord] = []
        while !values.isAtEnd {
            let next = try values.superDecoder()
            let probe = try next.container(keyedBy: Probe.self)
            let name = try probe.decode(String.self, forKey: .kind)
            if RecordKind(rawValue: name) != nil { result.append(try CloudRecord(from: next)) }
        }
        records = result
    }
}

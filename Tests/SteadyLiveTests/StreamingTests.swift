import Foundation
import Testing
@testable import SteadyLive
import SteadyCore

@Test func sseHandlesCommentsMultilineAndTerminalFrames() {
    var parser = SSEParser()
    #expect(parser.consume(": heartbeat") == nil)
    #expect(parser.consume("event: delta") == nil)
    #expect(parser.consume("data: first") == nil)
    #expect(parser.consume("data: second") == nil)
    let frame = parser.consume("")
    #expect(frame?.event == "delta"); #expect(frame?.data == "first\nsecond")
    #expect(parser.consume("") == nil)
}
@Test func fabricatedEvidenceAndChangedVersionsAreRejected() throws {
    var s = DemoData.summaries()[0]; s.metadata.source = .healthKit; s.metadata.revision = 2
    var evidence = EvidenceReference(summaryID: s.id, dayKey: s.dayKey, metric: "步数", value: "\(s.steps!)步", source: .healthKit)
    evidence.summaryVersion = 2
    try CloudCoachService.validateEvidence([evidence], summaries: [s])
    evidence.value = "999999步"
    #expect(throws: (any Error).self) { try CloudCoachService.validateEvidence([evidence], summaries: [s]) }
    evidence.value = "\(s.steps!)步"; evidence.summaryVersion = 1
    #expect(throws: (any Error).self) { try CloudCoachService.validateEvidence([evidence], summaries: [s]) }
}

@Test func byteStreamPreservesBlankFramesAndChineseText() throws {
    var decoder = SSELineDecoder(), parser = SSEParser()
    var frames: [String] = []
    for byte in "event: delta\r\ndata: {\"text\":\"你好\"}\r\n\r\nevent: complete\ndata: {}\n\n".utf8 {
        if let line = try decoder.consume(byte), let frame = parser.consume(line) { frames.append(frame.event) }
    }
    #expect(frames == ["delta", "complete"])
}

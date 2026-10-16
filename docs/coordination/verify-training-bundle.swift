import Foundation

// Isolated smoke check for the production loader; this does not validate SwiftPM
// resource packaging or native UI. Arguments: candidate directory, scratch directory.
@main struct VerifyTrainingBundle {
    static func main() throws {
        let source = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
        let scratch = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
        let fixture = scratch.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.copyItem(at: source, to: fixture)
        defer { try? FileManager.default.removeItem(at: fixture) }
        let courseURL = fixture.appendingPathComponent("tanchengyi-abs.json")
        let manifestURL = fixture.appendingPathComponent("abs-animations.json")
        let courseData = try Data(contentsOf: courseURL)
        let manifestData = try Data(contentsOf: manifestURL)
        func load() throws -> AnimatedTrainingCollection {
            try AnimatedTrainingCollection.load(directory: fixture,
                courseName: courseURL.lastPathComponent, manifestName: manifestURL.lastPathComponent,
                requiredResources: ["abs-renderer.js"])
        }
        let bundle = try load()
        precondition(bundle.collection.lessons.count == 10 && bundle.animations.count == 10)
        precondition(bundle.collection.lessons.allSatisfy { $0.frames.isEmpty })
        for animation in bundle.animations.values {
            for (index, step) in animation.steps.enumerated() {
                precondition(animation.stepIndex(at: step.previewSeconds) == index)
                precondition(animation.stepIndex(at: step.startSeconds) == index)
            }
            precondition(animation.stepIndex(at: animation.durationSeconds) == animation.steps.count - 1)
            precondition(animation.stepIndex(at: -.infinity) == nil)
            precondition(animation.stepIndex(at: .nan) == nil)
            precondition(bundle.artworkURL(for: animation.lessonID) != nil)
        }
        func rejectManifest(_ change: (inout [String: Any]) -> Void) throws {
            var json = try JSONSerialization.jsonObject(with: manifestData) as! [String: Any]
            change(&json)
            try JSONSerialization.data(withJSONObject: json).write(to: manifestURL)
            do { _ = try load(); fatalError("Invalid manifest accepted") }
            catch { }
            try manifestData.write(to: manifestURL)
        }
        try rejectManifest { $0["collectionID"] = "wrong-course" }
        try rejectManifest { $0["timeUnit"] = "milliseconds" }
        try rejectManifest {
            var entries = $0["animations"] as! [[String: Any]]
            entries.append(entries[0]); $0["animations"] = entries
        }
        try rejectManifest {
            var entries = $0["animations"] as! [[String: Any]]
            entries.removeLast(); $0["animations"] = entries
        }
        try rejectManifest {
            var entries = $0["animations"] as! [[String: Any]]
            entries[0]["resource"] = "../outside.html"; $0["animations"] = entries
        }
        try rejectManifest {
            var entries = $0["animations"] as! [[String: Any]]
            var steps = entries[0]["steps"] as! [[String: Any]]
            steps[1]["startSeconds"] = 0.7
            entries[0]["steps"] = steps; $0["animations"] = entries
        }
        try rejectManifest {
            var entries = $0["animations"] as! [[String: Any]]
            entries[0]["durationSeconds"] = 99; $0["animations"] = entries
        }
        let artwork = bundle.artworkURL(for: "abs-warmup-marching")!
        let artworkData = try Data(contentsOf: artwork)
        try FileManager.default.removeItem(at: artwork)
        do { _ = try load(); fatalError("Missing artwork accepted") } catch { }
        try artworkData.write(to: artwork)
        let renderer = fixture.appendingPathComponent("abs-renderer.js")
        let rendererData = try Data(contentsOf: renderer)
        try FileManager.default.removeItem(at: renderer)
        do { _ = try load(); fatalError("Missing renderer accepted") } catch { }
        try rendererData.write(to: renderer)
        var course = try JSONSerialization.jsonObject(with: courseData) as! [String: Any]
        course["durationSeconds"] = 1
        try JSONSerialization.data(withJSONObject: course).write(to: courseURL)
        do { _ = try load(); fatalError("Out-of-range source accepted") } catch { }
        print("PASS: 10 animation-only lessons, step seeks, 10 invalid/missing-resource cases. Native bundle/UI not tested.")
    }
}

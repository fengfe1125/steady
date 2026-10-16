import SwiftUI
import SteadyCore

/// Text-only detail for a library movement. `add` is nil when opened from a saved move.
struct LibraryExerciseDetail: View {
    let entry: ExerciseLibrary.Entry
    let library: ExerciseLibrary
    var add: ((WorkoutMove) -> Void)?
    @State private var english = false

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 4) {
                    Text(entry.name).font(.title3.weight(.semibold))
                    Text(entry.englishName).font(.subheadline).foregroundStyle(SteadyTheme.secondary)
                }
                LabeledContent("部位", value: library.label(entry.bodyPart))
                LabeledContent("器材", value: library.label(entry.equipment))
                LabeledContent("默认记录", value: entry.metric.title + (entry.perSide ? " · 左右分别" : ""))
            }
            Section("练到的肌群") {
                MuscleMapPanel(target: [entry.target], secondary: entry.secondaryMuscles, label: library.label)
                    .accessibilityIdentifier("libraryMuscleMap")
            }
            Section {
                ForEach(Array((english ? entry.englishSteps : entry.steps).enumerated()), id: \.offset) { index, step in
                    HStack(alignment: .firstTextBaseline, spacing: 10) {
                        Text("\(index + 1)").font(.footnote.monospacedDigit()).foregroundStyle(SteadyTheme.secondary)
                        Text(step)
                    }
                }
                Toggle("显示英文原文", isOn: $english).accessibilityIdentifier("libraryEnglishSteps")
            } header: { Text("动作步骤") } footer: {
                Text("此动作暂无 Steady 动画教学。中文名与步骤为机器翻译，尚未人工审核；如有疑问请以英文原文为准，并只在能舒适完成时练习。")
            }
            if let add {
                Section {
                    Button("添加到训练") { add(WorkoutMove(library: entry)) }
                        .frame(maxWidth: .infinity).accessibilityIdentifier("addLibraryMove")
                }
            }
            Section {
                NavigationLink("来源与许可") { ExerciseLibrarySourceView(source: library.source) }
                if let map = MuscleMapArtwork.shared {
                    NavigationLink("肌肉图来源与许可") { MuscleMapSourceView(source: map.source) }
                }
            }
        }.navigationTitle("动作说明").navigationBarTitleDisplayMode(.inline).journalSurface()
    }
}

struct ExerciseLibrarySourceView: View {
    let source: ExerciseLibrary.Source
    var body: some View {
        List {
            Section {
                Text(source.title)
                Text(source.scope).font(.footnote)
                Text(source.translation).font(.footnote)
                LabeledContent("版本", value: String(source.commit.prefix(12))).font(.footnote.monospaced())
            }
            Section("\(source.license) 许可") {
                Text(source.licenseText).font(.caption.monospaced()).textSelection(.enabled)
            }
        }.navigationTitle("来源与许可").navigationBarTitleDisplayMode(.inline).journalSurface()
    }
}

struct MuscleMapSourceView: View {
    let source: MuscleMapArtwork.Source
    var body: some View {
        List {
            Section {
                Text(source.title)
                Text(source.scope).font(.footnote)
                LabeledContent("版本", value: "\(source.tag) · \(source.commit.prefix(12))").font(.footnote.monospaced())
            }
            Section("\(source.license) 许可") {
                Text(source.licenseText).font(.caption.monospaced()).textSelection(.enabled)
            }
        }.navigationTitle("肌肉图来源").navigationBarTitleDisplayMode(.inline).journalSurface()
    }
}

/// The library half of the move picker: filters plus rows that open the detail page.
struct LibraryMoveSection: View {
    let library: ExerciseLibrary
    let search: String
    var add: (WorkoutMove) -> Void
    @State private var bodyPart = ""
    @State private var equipment = ""

    var body: some View {
        let matches = library.search(search, bodyPart: bodyPart.isEmpty ? nil : bodyPart, equipment: equipment.isEmpty ? nil : equipment)
        Section {
            Picker("部位", selection: $bodyPart) {
                Text("全部部位").tag("")
                ForEach(library.bodyParts) { Text($0.name).tag($0.id) }
            }.accessibilityIdentifier("libraryBodyPart")
            Picker("器材", selection: $equipment) {
                Text("全部器材").tag("")
                ForEach(library.equipment) { Text($0.name).tag($0.id) }
            }.accessibilityIdentifier("libraryEquipment")
            Text("动作库只有文字说明，没有 Steady 动画教学，也不会用于 AI 计划。目录里已有的动作请在“审核目录”中选择。")
                .font(.footnote).foregroundStyle(.secondary)
        }
        Section("动作库（\(matches.count)）") {
            if matches.isEmpty { Text("没有符合条件的动作，可以换个关键词或添加自定义动作。").foregroundStyle(.secondary) }
            ForEach(matches) { entry in
                NavigationLink { LibraryExerciseDetail(entry: entry, library: library, add: add) } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(entry.name)
                        Text("\(library.label(entry.equipment)) · \(library.label(entry.target)) · \(entry.englishName)")
                            .font(.caption).foregroundStyle(.secondary).lineLimit(1)
                    }
                }.accessibilityIdentifier("libraryMove_\(entry.id)")
            }
        }
    }
}

/// Resolves a saved `library:` identity without blocking the editor on the first library read.
struct LibraryMoveDetailLoader: View {
    let identity: String
    @State private var library: ExerciseLibrary?
    @State private var loaded = false
    var body: some View {
        Group {
            if let library, let entry = library.entry(identity: identity) {
                LibraryExerciseDetail(entry: entry, library: library)
            } else if loaded {
                ContentUnavailableView("这个动作的说明暂时无法打开", systemImage: "book.closed", description: Text("训练记录仍然保留。"))
            } else { ProgressView() }
        }.task {
            library = await Task.detached { ExerciseLibrary.shared }.value
            loaded = true
        }
    }
}

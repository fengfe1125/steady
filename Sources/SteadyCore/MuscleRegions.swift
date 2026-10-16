import Foundation

/// Maps the exercise library's muscle IDs (`tools/exercise-library/vocab.json`)
/// to body-map regions. Every library ID is either mapped or listed in
/// `unmapped` with a reason; `MuscleMapTests` fails when a new ID appears in neither.
public enum MuscleRegions {
    public static let regions: [String: [String]] = [
        "abs": ["abs"],
        "abdominals": ["abs"],
        "lower abs": ["lower-abs"],
        "obliques": ["obliques"],
        "core": ["abs", "obliques"],
        "pectorals": ["chest"],
        "chest": ["chest"],
        "upper chest": ["upper-chest"],
        "serratus anterior": ["serratus"],
        "delts": ["deltoids"],
        "deltoids": ["deltoids"],
        "shoulders": ["deltoids"],
        "rear deltoids": ["rear-deltoid"],
        "rotator cuff": ["rotator-cuff"],
        "biceps": ["biceps"],
        "brachialis": ["biceps"],
        "triceps": ["triceps"],
        "forearms": ["forearm"],
        "wrists": ["forearm"],
        "wrist flexors": ["forearm"],
        "wrist extensors": ["forearm"],
        "grip muscles": ["forearm", "hands"],
        "hands": ["hands"],
        "upper back": ["upper-back", "rhomboids"],
        "back": ["upper-back", "lower-back"],
        "lats": ["upper-back"],
        "latissimus dorsi": ["upper-back"],
        "traps": ["trapezius"],
        "trapezius": ["trapezius"],
        "rhomboids": ["rhomboids"],
        "levator scapulae": ["neck"],
        "lower back": ["lower-back"],
        "spine": ["lower-back"],
        "sternocleidomastoid": ["neck"],
        "glutes": ["gluteal"],
        "hip flexors": ["hip-flexors"],
        "quads": ["quadriceps"],
        "quadriceps": ["quadriceps"],
        "hamstrings": ["hamstring"],
        "adductors": ["adductors"],
        "inner thighs": ["adductors"],
        "groin": ["adductors"],
        "abductors": ["gluteal"],
        "calves": ["calves"],
        "soleus": ["calves"],
        "shins": ["tibialis"],
        "ankles": ["ankles"],
        "ankle stabilizers": ["ankles"],
        "feet": ["feet"],
    ]

    /// IDs drawn on a neighbouring region because MuscleMap has no outline of their own.
    public static let approximate: [String: String] = [
        "brachialis": "肱肌位于肱二头肌深层，图中以肱二头肌表示",
        "wrists": "手腕动作由前臂肌群完成，图中以前臂表示",
        "levator scapulae": "肩胛提肌位于颈后侧，图中以颈部表示",
        "spine": "竖脊肌沿脊柱分布，图中以下背表示",
        "groin": "腹股沟区域以内收肌表示",
        "abductors": "髋外展肌（臀中肌、臀小肌）以臀部表示",
        "soleus": "比目鱼肌位于腓肠肌深层，图中以小腿表示",
    ]

    /// IDs with no place on the body map, shown only as text.
    public static let unmapped: [String: String] = [
        "cardiovascular system": "心肺不是单块肌肉，图中不显示",
    ]

    /// Regions for the given muscles; target wins where a region is both.
    public static func highlights(target: [String], secondary: [String]) -> [String: MuscleEmphasis] {
        var result: [String: MuscleEmphasis] = [:]
        for id in secondary { for region in regions[id] ?? [] { result[region] = .secondary } }
        for id in target { for region in regions[id] ?? [] { result[region] = .target } }
        return result
    }
}

import Foundation

/// Stable teaching IDs stay separate from editable workout names and persisted plans.
public enum EquipmentLessonID: String, CaseIterable, Identifiable, Sendable {
    case seatedChestPress = "seated-chest-press"
    case latPulldown = "lat-pulldown"
    case seatedCableRow = "seated-cable-row"
    case seatedLegPress = "seated-leg-press"
    case seatedShoulderPress = "seated-shoulder-press"
    case seatedLegExtension = "seated-leg-extension"
    case seatedAbdominalCrunch = "seated-abdominal-crunch"
    case dumbbellGobletSquat = "dumbbell-goblet-squat"
    case singleArmDumbbellRow = "single-arm-dumbbell-row"
    case seatedDumbbellShoulderPress = "seated-dumbbell-shoulder-press"
    case seatedLegCurl = "seated-leg-curl"
    case preacherBicepsCurl = "preacher-biceps-curl"
    case seatedPecFly = "seated-pec-fly"
    case seatedHipAbduction = "seated-hip-abduction"
        #if STEADY_LEGACY_ARM_PROTOTYPE
    case cableTricepsPushdown = "arm-cable-pushdown"
        #endif
        #if STEADY_LEGACY_ARM_PROTOTYPE
    case seatedCableBicepsCurl = "arm-seated-cable-curl"
        #endif
        #if STEADY_LEGACY_ARM_PROTOTYPE
    case lyingBarbellTricepsExtension = "arm-lying-barbell-extension"
        #endif
        #if STEADY_LEGACY_ARM_PROTOTYPE
    case standingBarbellBicepsCurl = "arm-standing-barbell-curl"
        #endif

    public var id: String { rawValue }
    public var title: String {
        switch self {
        case .seatedChestPress: "坐姿推胸"
        case .latPulldown: "高位下拉"
        case .seatedCableRow: "坐姿划船"
        case .seatedLegPress: "坐姿腿举"
        case .seatedShoulderPress: "坐姿器械推肩"
        case .seatedLegExtension: "坐姿腿屈伸"
        case .seatedAbdominalCrunch: "坐姿器械卷腹"
        case .dumbbellGobletSquat: "哑铃高脚杯深蹲"
        case .singleArmDumbbellRow: "单臂哑铃划船"
        case .seatedDumbbellShoulderPress: "坐姿哑铃推肩"
        case .seatedLegCurl: "坐姿腿弯举"
        case .preacherBicepsCurl: "器械弯举"
        case .seatedPecFly: "蝴蝶机夹胸"
        case .seatedHipAbduction: "坐姿髋外展"
        #if STEADY_LEGACY_ARM_PROTOTYPE
        case .cableTricepsPushdown: "绳索臂屈伸"
        #endif
        #if STEADY_LEGACY_ARM_PROTOTYPE
        case .seatedCableBicepsCurl: "坐姿绳索弯举"
        #endif
        #if STEADY_LEGACY_ARM_PROTOTYPE
        case .lyingBarbellTricepsExtension: "仰卧杠铃臂屈伸"
        #endif
        #if STEADY_LEGACY_ARM_PROTOTYPE
        case .standingBarbellBicepsCurl: "站姿杠铃弯举"
        #endif
        }
    }

    public var aliases: Set<String> {
        switch self {
        case .seatedChestPress: ["坐姿推胸", "坐姿器械推胸", "器械推胸", "坐姿推胸机", "seated chest press", "machine chest press", "chest press machine"]
        case .latPulldown: ["高位下拉", "正握高位下拉", "lat pulldown", "lat pull-down"]
        case .seatedCableRow: ["坐姿划船", "坐姿绳索划船", "坐姿窄握划船", "seated cable row", "seated cable rows"]
        case .seatedLegPress: ["坐姿腿举", "配重式坐姿腿举", "seated leg press", "selectorized seated leg press"]
        case .seatedShoulderPress: ["坐姿器械推肩", "坐姿推肩机", "器械推肩", "seated machine shoulder press", "machine shoulder press"]
        case .seatedLegExtension: ["坐姿腿屈伸", "坐姿腿伸展", "坐姿器械腿屈伸", "seated leg extension", "selectorized leg extension"]
        case .seatedAbdominalCrunch: ["坐姿器械卷腹", "肩垫式器械卷腹", "seated machine abdominal crunch", "shoulder pad abdominal crunch"]
        case .dumbbellGobletSquat: ["哑铃高脚杯深蹲", "哑铃杯式深蹲", "dumbbell goblet squat"]
        case .singleArmDumbbellRow: ["单臂哑铃划船", "俯身单臂哑铃划船", "长凳支撑单臂哑铃划船", "single arm dumbbell row", "single-arm dumbbell row", "bench supported single arm dumbbell row"]
        case .seatedDumbbellShoulderPress: ["坐姿哑铃推肩", "坐姿哑铃肩推", "seated dumbbell shoulder press", "seated dumbbell overhead press"]
        case .seatedLegCurl: ["坐姿腿弯举", "坐姿器械腿弯举", "seated leg curl", "seated leg curl machine", "selectorized seated leg curl", "配重式坐姿腿弯举"]
        case .preacherBicepsCurl: ["器械弯举", "托臂式器械弯举", "器械牧师凳弯举", "machine preacher curl", "seated biceps curl"]
        case .seatedPecFly: ["蝴蝶机夹胸", "握把式蝴蝶机夹胸", "坐姿器械飞鸟", "seated pec fly machine", "handle pec deck fly", "竖握把蝴蝶机夹胸", "坐姿器械夹胸", "machine pec fly", "pec fly machine", "seated machine pec fly", "蝴蝶夹胸", "握把式蝴蝶夹胸", "器械夹胸", "selectorized pec fly"]
        case .seatedHipAbduction: ["坐姿髋外展", "髋外展机", "坐姿器械髋外展", "seated hip abduction machine", "hip abductor machine", "seated hip abduction", "hip abduction machine"]
        #if STEADY_LEGACY_ARM_PROTOTYPE
        case .cableTricepsPushdown: ["绳索臂屈伸", "直杆绳索下压", "cable triceps pushdown"]
        #endif
        #if STEADY_LEGACY_ARM_PROTOTYPE
        case .seatedCableBicepsCurl: ["坐姿绳索弯举", "坐姿低位绳索弯举", "seated cable biceps curl"]
        #endif
        #if STEADY_LEGACY_ARM_PROTOTYPE
        case .lyingBarbellTricepsExtension: ["仰卧杠铃臂屈伸", "仰卧曲杆臂屈伸", "lying barbell triceps extension"]
        #endif
        #if STEADY_LEGACY_ARM_PROTOTYPE
        case .standingBarbellBicepsCurl: ["站姿杠铃弯举", "站姿曲杆弯举", "standing barbell biceps curl"]
        #endif
        }
    }

    public var usesDumbbells: Bool {
        switch self {
        case .dumbbellGobletSquat, .singleArmDumbbellRow, .seatedDumbbellShoulderPress: true
        default: false
        }
    }

    public var isArmSupplement: Bool {
        switch self {
        #if STEADY_LEGACY_ARM_PROTOTYPE
        case .cableTricepsPushdown, .seatedCableBicepsCurl, .lyingBarbellTricepsExtension, .standingBarbellBicepsCurl: true
        #endif
        default: false
        }
    }

    /// Course movements have their own entry; the existing equipment library keeps its scope.
    public static var equipmentLibrary: [Self] { allCases.filter { !$0.isArmSupplement } }

    /// Only explicitly supported variants link to their matching lesson.
    public static func matching(exerciseName: String) -> Self? {
        let name = exerciseName.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return allCases.first { $0.aliases.contains(name) }
    }
}

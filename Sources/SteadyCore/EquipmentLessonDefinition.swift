import Foundation

public enum EquipmentViewMode: String, CaseIterable, Identifiable, Sendable {
    case motion, detail, mistakes
    public var id: String { rawValue }
    public var title: String {
        switch self { case .motion: "全身动作"; case .detail: "细节图解"; case .mistakes: "错误对照" }
    }
}

public struct EquipmentTiming: Codable, Equatable, Sendable {
    public let effortStart: Double
    public let effortEnd: Double
    public let returnStart: Double
    public let returnEnd: Double
    public let duration: Double
    public init(effortStart: Double = 600, effortEnd: Double = 2800, returnStart: Double = 3300, returnEnd: Double = 5700, duration: Double = 6000) {
        self.effortStart = effortStart; self.effortEnd = effortEnd
        self.returnStart = returnStart; self.returnEnd = returnEnd; self.duration = duration
    }
    public func progress(at time: Double) -> Double {
        if time < effortStart || time >= returnEnd { return 0 }
        if time < effortEnd { return (1 - cos(.pi * (time - effortStart) / (effortEnd - effortStart))) / 2 }
        if time < returnStart { return 1 }
        return (1 + cos(.pi * (time - returnStart) / (returnEnd - returnStart))) / 2
    }
    public func phase(at time: Double, effort: String, effortDetail: String = "配重上升", returnDetail: String = "配重下降") -> String {
        if time >= effortStart && time < effortEnd { return "\(effort) · \(effortDetail)" }
        if time >= effortEnd && time < returnStart { return "终点 · 保持控制" }
        if time >= returnStart && time < returnEnd { return "回位 · \(returnDetail)" }
        return "起始姿势"
    }
}

public struct EquipmentNote: Sendable {
    public let title: String
    public let detail: String
    public init(_ title: String, _ detail: String) { self.title = title; self.detail = detail }
}
public struct EquipmentStep: Sendable {
    public let name: String
    public let title: String
    public let text: String
    public let points: [String]
    public let question: String
    public let hint: String
    public let time: Double
    public let mode: EquipmentViewMode
}
public struct EquipmentReference: Sendable {
    public let title: String
    public let url: URL
    public init(_ title: String, _ url: String) { self.title = title; self.url = URL(string: url)! }
}

/// Tutorial content and timing are independent of editable exercise names and saved plans.
public struct EquipmentLessonDefinition: Sendable {
    public let id: EquipmentLessonID
    public let group: String
    public let resource: String
    public let machine: String
    public let subtitle: String
    public let viewLabel: String
    public let detailTitle: String
    public let detailCaption: String
    public let details: [EquipmentNote]
    public let comparison: [String]
    public let mistakes: [EquipmentNote]
    public let checks: [EquipmentNote]
    public let steps: [EquipmentStep]
    public let timing: EquipmentTiming
    public let references: [EquipmentReference]
    /// Visible structural cues help identify the demonstrated machine at a gym.
    public var structure: String {
        switch id {
        case .seatedChestPress: "低位转轴 · 弯曲运动臂 · 胸前握把"
        case .latPulldown: "高位滑轮 · 长横杆 · 压腿垫"
        case .seatedCableRow: "低位出绳口 · 窄握把 · 斜脚踏"
        case .seatedLegPress: "固定座椅 · 双连杆 · 大踏板"
        case .seatedShoulderPress: "靠背后转轴 · 弯曲推举臂 · 多位置握把"
        case .seatedLegExtension: "膝部转轴 · 前侧小腿滚垫 · 调节盘"
        case .seatedAbdominalCrunch: "弯曲联动臂 · 双肩垫 · 抬高脚踏"
        case .seatedPecFly: "顶部双转轴 · 下垂运动臂 · 竖握把"
        case .seatedLegCurl: "膝部转轴 · 大腿固定垫 · 后侧小腿滚垫"
        case .seatedHipAbduction: "外侧膝垫 · 座下旋转臂 · 随动脚踏"
        case .preacherBicepsCurl: "肘部对轴 · 斜托臂垫 · 联动握把"
        case .dumbbellGobletSquat: "固定式哑铃 · 双手托住上端 · 胸前持铃"
        case .singleArmDumbbellRow: "单只哑铃 · 同侧手膝支撑 · 平凳"
        case .seatedDumbbellShoulderPress: "两只哑铃 · 靠背凳 · 掌心朝前"
        #if STEADY_LEGACY_ARM_PROTOTYPE
        case .cableTricepsPushdown: "高位滑轮 · 短杆握把 · 站姿伸肘"
        #endif
        #if STEADY_LEGACY_ARM_PROTOTYPE
        case .seatedCableBicepsCurl: "低位滑轮 · 斜靠背凳 · 反握短杆"
        #endif
        #if STEADY_LEGACY_ARM_PROTOTYPE
        case .lyingBarbellTricepsExtension: "平凳 · 曲杆杠铃 · 上臂保持稳定"
        #endif
        #if STEADY_LEGACY_ARM_PROTOTYPE
        case .standingBarbellBicepsCurl: "曲杆杠铃 · 站稳 · 掌心向上"
        #endif
        }
    }
    /// Name the demonstrated structure without labelling free weights as machines.
    public var structureReference: String {
        if id.isArmSupplement { return "示范变式：" + subtitle }
        if id.usesDumbbells { return "示范变式：" + subtitle }
        if id == .preacherBicepsCurl { return "参考结构：Precor Resolute RSL0204" }
        if id == .seatedLegCurl { return "参考结构：Precor Resolute RSL0619" }
        let model: String
        switch id {
        case .seatedChestPress: model = "VSL001BP"
        case .latPulldown, .seatedCableRow: model = "VSL026BP"
        case .seatedLegPress: model = "VSL010BP"
        case .seatedShoulderPress: model = "VSL012BP"
        case .seatedLegExtension: model = "VSL005BP"
        case .seatedAbdominalCrunch: model = "VSL014BP"
        case .seatedPecFly: model = "VSL015BP"
        case .seatedHipAbduction: model = "VSL008BP"
        default: return subtitle
        }
        return "参考结构：Precor Vitality " + model
    }
    public var effort: String { steps[2].name }
    public var effortDetail: String {
        #if STEADY_LEGACY_ARM_PROTOTYPE
        if id == .lyingBarbellTricepsExtension || id == .standingBarbellBicepsCurl { return "杠铃上升" }
        #endif
        return id == .dumbbellGobletSquat ? "哑铃随身体下降" : id.usesDumbbells ? "哑铃上升" : "配重上升"
    }
    public var returnDetail: String {
        #if STEADY_LEGACY_ARM_PROTOTYPE
        if id == .lyingBarbellTricepsExtension || id == .standingBarbellBicepsCurl { return "杠铃下降" }
        #endif
        return id == .dumbbellGobletSquat ? "哑铃随身体上升" : id.usesDumbbells ? "哑铃下降" : "配重下降"
    }
    public func phase(at time: Double) -> String {
        timing.phase(at: time, effort: effort, effortDetail: effortDetail, returnDetail: returnDetail)
    }
    public var scope: String {
        if id.isArmSupplement {
            "本课动画为 Steady 自行绘制的动作示意。先用轻阻力确认姿势；出现疼痛或不适时停止。"
        } else if id.usesDumbbells {
            "本例为\(subtitle)的动作示意。先选能平稳控制的轻哑铃，在舒适范围内练习；出现疼痛或不适时停止。"
        } else {
            "本例为\(subtitle)的动作示意。其他型号请按机身说明调整；出现疼痛或不适时停止。"
        }
    }

    /// Preserve catalogue order while deriving every group from the available lessons.
    public static var groups: [String] {
        EquipmentLessonID.equipmentLibrary.reduce(into: []) { groups, id in
            let group = lesson(id).group
            if !groups.contains(group) { groups.append(group) }
        }
    }

    public static func lesson(_ id: EquipmentLessonID) -> Self {
        switch id {
        case .seatedChestPress: chest
        case .latPulldown: pulldown
        case .seatedCableRow: row
        case .seatedLegPress: legPress
        case .seatedShoulderPress: shoulderPress
        case .seatedLegExtension: legExtension
        case .seatedAbdominalCrunch: abdominalCrunch
        case .dumbbellGobletSquat: gobletSquat
        case .singleArmDumbbellRow: dumbbellRow
        case .seatedDumbbellShoulderPress: dumbbellShoulderPress
        case .seatedLegCurl: legCurl
        case .preacherBicepsCurl: bicepsCurl
        case .seatedPecFly: pecFly
        case .seatedHipAbduction: hipAbduction
        #if STEADY_LEGACY_ARM_PROTOTYPE
        case .cableTricepsPushdown: armCablePushdown
        #endif
        #if STEADY_LEGACY_ARM_PROTOTYPE
        case .seatedCableBicepsCurl: armSeatedCableCurl
        #endif
        #if STEADY_LEGACY_ARM_PROTOTYPE
        case .lyingBarbellTricepsExtension: armLyingBarbellExtension
        #endif
        #if STEADY_LEGACY_ARM_PROTOTYPE
        case .standingBarbellBicepsCurl: armStandingBarbellCurl
        #endif
        }
    }
    private static let optima = EquipmentReference("Precor · VSL026BP 下拉与低位划船结构", "https://static.precor.com/sell-sheet/all/VSL/VSL026BP-Pulldown-Seated-Row-CHS.pdf")
    private static let adjustmentHint = "先看机身图示；不清楚座椅、压垫或插销如何调节时，请现场工作人员演示。"
    private static let painHint = "出现疼痛或不适时停止；别为了跟上动画而硬做。"

    private static let bicepsCurl = Self(id: .preacherBicepsCurl, group: "手臂", resource: "BicepsCurlArtwork",
        machine: "斜托垫弯举器", subtitle: "Precor RSL0204 · 上臂贴斜托垫", viewLabel: "侧前方示意", detailTitle: "握法细节 · 上臂贴垫，手掌包住握把", detailCaption: "本例是斜托垫、联动握把的配重式弯举器。握把有角度，让手掌顺着握把自然朝上或略相向，手腕与前臂保持顺直。",
        details: [.init("上臂贴托垫，肘部对转轴", "调座椅，让上臂下侧贴住斜垫，肘部大致对准侧面转轴；不把腋窝硬压在垫子上。"), .init("四指和拇指都包住握把", "手掌从下方握住有角度的握把，左右对称，不只用指尖勾着。"), .init("肘部留在托垫，手腕不折起", "弯的是肘关节；不要抬起上臂，也不要靠折腕把握把卷上来。")],
        comparison: ["上臂留在斜托垫\n肘部固定、前臂弯起", "抬肘、离开托垫\n身体帮着借力"],
        mistakes: [.init("上臂离开托垫，肩膀跟着抬", "重新坐稳，把上臂放回垫面；用较轻阻力保持肘部位置。"), .init("折腕把握把卷起来", "手腕与前臂顺直，四指和拇指握稳，让肘关节带动前臂。"), .init("猛拉、锁肘或松手下落", "来回都控制，起点保留一点肘部弯曲；先了解本机拿起和放回握把的方法。")],
        checks: [.init("座椅高度与配重已确认", "上臂能自然贴垫，肘部大致对轴，双脚踩稳；不清楚拿放握把时先请人演示。"), .init("双手握稳，上臂留在托垫", "掌心顺着握把自然朝上或略相向，四指与拇指环抱，手腕顺直。"), .init("不抬肘、不晃身也能控制来回", "需要抬肩、挺身或折腕时，先减轻阻力。")],
        steps: [
            .init(name: "坐好", title: "上臂自然贴住斜托垫", text: "调座椅，让上臂下侧贴住垫子，肘部大致对准侧面的转轴。", points: ["双脚踩稳，上身靠近托垫，不用抬肩才能放好手臂。", "先按机身说明拿起握把；本型号拿放握把需要特别留意。"], question: "上臂和肘部有支撑，肩膀能放松。", hint: adjustmentHint, time: 0, mode: .motion),
            .init(name: "握稳", title: "从下方握住，拇指也绕过去", text: "双手各握一侧，手掌顺着有角度的握把自然朝上或略相向。", points: ["四指绕住握把，拇指从另一侧环抱，整只手贴稳。", "手腕与前臂顺直，上臂继续贴住斜托垫。"], question: "我是在握住握把，没有用折腕代替弯肘。", hint: "本例是联动握把器械；杠铃牧师凳、哑铃和拉索弯举需要各自的操作方法。", time: 0, mode: .detail),
            .init(name: "弯起", title: "肘部留在原位，前臂向上弯", text: "缓缓呼气，弯曲肘关节，把握把沿器材轨迹向上带起。", points: ["上臂不离开托垫，头和上身不跟着晃动。", "弯到舒适、能控制的位置，不折腕继续硬卷。"], question: "前臂在动，肘和上臂仍留在托垫上。", hint: "握把与前面的连杆一起运动；别把它当作可以自由提拉的拉索手柄。", time: 2400, mode: .motion),
            .init(name: "回位", title: "慢慢伸肘，不让握把掉下去", text: "手一直握稳，控制着伸展前臂，回到起点时仍留一点弯曲。", points: ["回程不突然松力、不顶死肘关节；练完继续握稳，按 RSL0204 的方式站起并控制着放低握把。", "握把到停靠位置后再松手；不知道怎样拿起或放低时，先请现场人员示范。"], question: "回程能放慢，上臂没有离开托垫。", hint: painHint, time: 4500, mode: .motion)
        ], timing: .init(), references: [.init("Precor RSL0204 · 实物与结构", "https://www.precor.com/en-US/products/RSL0204"), .init("Precor · 器械弯举实拍教学", "https://fast.wistia.com/embed/channel/p7wwev4weh?wchannelid=p7wwev4weh&wmediaid=dalxy2n2c0")])

    private static let chest = Self(id: .seatedChestPress, group: "胸部", resource: "ChestPressArtwork",
        machine: "配重式推胸器", subtitle: "低位转轴推胸器 · 竖握把", viewLabel: "斜侧面示意", detailTitle: "握法细节 · 握住整根握把", detailCaption: "本例两只手掌心相对。横握把器材请按机身图示确认握法。",
        details: [.init("四指弯曲，绕住握把", "手掌贴住握把，不是只用指尖勾住。"), .init("拇指从另一侧环抱", "与四指一起把握把握稳。"), .init("手腕与前臂顺直", "不向上折，也不向下塌。")],
        comparison: ["手腕顺直\n前臂到手腕不折弯", "手腕折起\n先重新握稳"],
        mistakes: [.init("肩膀耸起、身体离开靠背", "肩膀别往耳朵方向抬，不要挺腰借力。"), .init("肘关节顶到锁死", "手臂伸展到接近直，终点保留一点弯曲。"), .init("回位太快，配重猛地撞下", "控制着回到起点，来回都要稳稳控制。")],
        checks: [.init("我知道这台器材怎么调", "不会调座椅或配重插销，先请现场工作人员演示。"), .init("握把齐胸部，背靠稳、脚踩稳", "下背保持自然弧度，不为了推远而挺腰。"), .init("阻力能让我平稳控制来回", "需要猛推、挺腰才能动时，先减轻阻力。")],
        steps: [
            .init(name: "坐好", title: "握把与胸部中段齐平", text: "坐上去后先看握把高度；太高或太低，就调座椅。", points: ["背部有靠背支撑，双脚踩稳地面或器材脚踏。", "肩膀轻轻向后、向下，不要耸到耳朵旁。"], question: "握把在胸前，上身不用前倾就能握住。", hint: adjustmentHint, time: 0, mode: .motion),
            .init(name: "握稳", title: "四指与拇指都绕住", text: "本例使用竖握把，双手掌心相对。先看手部放大图。", points: ["四根手指弯曲绕住握把，拇指从另一侧环抱。", "手腕与前臂顺直，不向上折，也不向下塌。"], question: "手掌贴住握把，不是只用指尖勾着；手腕没有明显折角。", hint: "器材可能配横握把或多种握把，先按机身图示确认。", time: 0, mode: .detail),
            .init(name: "推出", title: "慢慢推，别把肘顶死", text: "控制着把握把向前推，同时缓缓呼气；身体仍贴靠靠背。", points: ["上身不晃、不挺腰借力，肩膀保持稳定。", "终点保留一点弯曲，不把肘关节顶死。"], question: "手在向前，身体没有跟着向前探。", hint: "肘部斜向身体两侧；斜侧面示意帮助看清握把与连杆；具体幅度按机身说明调整。", time: 2500, mode: .motion),
            .init(name: "回位", title: "控制着回来，不松手回弹", text: "缓慢弯曲手臂，让握把回到起始位置，继续握稳。", points: ["回程也要稳稳控制，避免配重快速撞下。", "回到起点，背、肩和双脚仍保持原来的位置。"], question: "不是把握把放开，让它自己弹回来。", hint: painHint, time: 4500, mode: .motion)
        ], timing: .init(), references: [.init("Precor · VSL001BP 低位转轴与握把结构", "https://static.precor.com/sell-sheet/all/VSL/VSL001BP-Chest-Press-CHS.pdf"), .init("ACE · 坐姿推胸", "https://www.acefitness.org/resources/everyone/exercise-library/188/seated-chest-press/"), .init("NASM · 器械推胸", "https://www.nasm.org/resource-center/exercise-library/chest-press-machine"), .init("Precor · VSL001BP 低转轴推胸器结构", "https://static.precor.com/sell-sheet/all/VSL/VSL001BP-Chest-Press-NA.pdf")])

    private static let pulldown = Self(id: .latPulldown, group: "背部", resource: "LatPulldownArtwork",
        machine: "高位滑轮下拉器", subtitle: "插销配重 · 长横杆与压腿垫", viewLabel: "斜侧面示意", detailTitle: "握法细节 · 四指和拇指包住横杆", detailCaption: "本例是正握、向前胸下拉。握距按机身指引调整，让下拉时肘部能自然靠近身体两侧。",
        details: [.init("手背朝自己，四指绕过横杆", "双手握在中间连接点两侧，左右对称；不要只挂住指尖。"), .init("拇指从另一侧包住", "拇指与四指一起环抱横杆；掌心贴住握把。"), .init("手腕顺直，压腿垫贴住大腿", "腕部不向后折；压垫贴住大腿上方，避免发力时被带离座椅。")],
        comparison: ["横杆到前胸\n肩膀远离耳朵", "拉到颈后\n不要这样模仿"],
        mistakes: [.init("耸肩、身体来回摆动", "轻微后倾后稳住上身；肩膀向下，不用大幅后仰拉动横杆。"), .init("把横杆拉到颈后", "本例横杆始终在头前，向前胸下拉。"), .init("松手让横杆猛地上弹", "手保持环握，慢慢伸展双臂，控制配重下降。")],
        checks: [.init("压腿垫和配重插销已调好", "压垫贴住大腿，插销完整插入所选配重孔。"), .init("横杆握稳，双脚踩稳", "双手左右对称，掌心与四指、拇指都包住横杆。"), .init("不摆动也能控制下拉和回位", "需要大幅后仰或猛拉时，先减轻阻力。")],
        steps: [
            .init(name: "调好", title: "先让压腿垫贴住大腿", text: "按机身说明调好座椅、压腿垫和配重，再坐稳。", points: ["双脚踩稳，压腿垫压住大腿上方。", "拿不到横杆时请工作人员协助，不攀爬器材。"], question: "轻轻用力时，臀部仍留在座椅上。", hint: adjustmentHint, time: 0, mode: .motion),
            .init(name: "握稳", title: "正握横杆，两侧对称", text: "双手握在连接点两侧，四指与拇指都绕住横杆。", points: ["手背朝自己，手腕与前臂顺直。", "按机身图示选择握距，肩部保持舒适。"], question: "整只手握住横杆，左右握距相同。", hint: "反握、窄握或独立手柄属于不同变式，本页只示范长横杆正握。", time: 0, mode: .detail),
            .init(name: "下拉", title: "肘部向下，横杆到前胸", text: "上身轻微后倾后保持稳定，缓缓呼气，把横杆拉向前胸。", points: ["肩膀远离耳朵，肘部向身体两侧下行。", "横杆靠近胸前即可，不撞胸，也不拉到颈后。"], question: "横杆始终在头前，上身没有来回摆动。", hint: "长横杆在头前移动；保持自然、轻微的后倾。", time: 2350, mode: .motion),
            .init(name: "回位", title: "慢慢伸臂，手一直握稳", text: "控制着让横杆上升，双臂逐渐伸展。", points: ["不要突然松手，让横杆把身体带起。", "回到起点，脚、臀部与压腿垫仍保持支撑。"], question: "配重平稳下降，上身没有跟着向上蹿。", hint: painHint, time: 4400, mode: .motion)
        ], timing: .init(effortEnd: 2600, returnStart: 3100), references: [optima])

    private static let row = Self(id: .seatedCableRow, group: "背部", resource: "CableRowArtwork",
        machine: "低位滑轮划船器", subtitle: "插销配重 · 窄握把与脚踏", viewLabel: "斜侧面示意", detailTitle: "握法细节 · 双手掌心相对", detailCaption: "本例使用窄握把。两只手分别握住一侧，钢索连接在中间；宽横杆握法需另外确认。",
        details: [.init("两只手各握一侧，掌心相对", "四指弯曲绕住握把，拇指从另一侧包住。"), .init("手腕与前臂顺直", "拉动时不要向内折腕，也不要只用指尖勾着。"), .init("中间连接钢索，双脚踩稳脚踏", "双手各握一侧；膝盖微弯，胸口抬起，不后仰借力。")],
        comparison: ["上身保持稳定\n握把拉向腹部", "弓背、后仰借力\n先减轻阻力"],
        mistakes: [.init("弓背向前够握把", "保持背部自然位置，调整坐姿；够不到时先请工作人员帮助。"), .init("后仰借力，身体跟着钢索晃", "胸口抬起，上身稳住，让肘部向后移动。"), .init("猛拉或松手回弹", "平稳后拉和回程，始终握住握把，避免配重撞下。")],
        checks: [.init("脚踏、座椅和插销已确认", "脚踩稳脚踏，插销完整插入；先了解怎样安全拿起和放回握把。"), .init("掌心相对，背部自然", "双手握稳，膝盖微弯，胸口抬起，不弓背。"), .init("身体不晃也能控制来回", "需要大幅后仰时，先减轻阻力。")],
        steps: [
            .init(name: "坐稳", title: "脚踩脚踏，胸口抬起", text: "坐上座椅，双脚踩稳脚踏，膝盖保持自然微弯。", points: ["保持背部自然位置，头和胸口抬起。", "调整坐姿，让手能安全拿到握把，不弓背硬够。"], question: "臀部和双脚都有支撑，上身可以稳住。", hint: adjustmentHint, time: 0, mode: .motion),
            .init(name: "握稳", title: "双手掌心相对，环抱握把", text: "两只手各握窄握把的一侧，先看放大图。", points: ["四指与拇指都绕住握把，掌心贴稳。", "手腕与前臂连成自然直线。"], question: "两手相向握住两侧，钢索连接点在中间。", hint: "本例为低位滑轮窄握把；胸部支撑式划船和宽杆划船结构不同。", time: 0, mode: .detail),
            .init(name: "后拉", title: "肘部向后，握把靠近腹部", text: "缓缓呼气，把握把拉向腹部，上身保持原来的位置。", points: ["肘部靠近身体两侧向后，不耸肩。", "不挺腰或大幅后仰，把身体当成杠杆。"], question: "手和肘在动，头、胸口与臀部基本不动。", hint: "斜侧面图展示低位钢索；双手始终握在同一握把两侧。", time: 2400, mode: .motion),
            .init(name: "回位", title: "慢慢向前伸臂，不松手", text: "控制钢索拉力，让双臂逐渐向前伸展。", points: ["保持胸口抬起，不跟着握把弓背。", "回程平稳，避免配重撞击和钢索回弹。"], question: "手向前，但坐姿和脚踏接触没有变化。", hint: painHint, time: 4500, mode: .motion)
        ], timing: .init(effortEnd: 2700, returnStart: 3200), references: [optima])

    private static let shoulderPress = Self(id: .seatedShoulderPress, group: "肩部", resource: "ShoulderPressArtwork",
        machine: "配重式推肩器", subtitle: "后转轴推肩器 · 横握把与靠背", viewLabel: "侧面结构示意", detailTitle: "握法细节 · 手腕立在前臂上方", detailCaption: "本例选用横握把，手心朝前；四指与拇指完整环抱。肘部略在身体前方，远侧手臂以浅色显示。",
        details: [.init("四指与拇指包住握把", "手掌贴稳，双手左右对称；不是把握把放在指尖上。"), .init("手腕与前臂顺直", "手腕不向后折，前臂支撑握把；不要让握把压着折起的手腕。"), .init("握把齐肩或稍高，背靠稳", "按机身说明调座椅；双脚踩稳，肘部略在身体前方，不硬向后展开。")],
        comparison: ["腰背保持自然\n背与臀部贴靠", "挺腰、离开靠背\n先减轻阻力"],
        mistakes: [.init("挺腰、身体离开靠背", "背与臀部保持支撑，不为了推高而拱起腰。"), .init("折腕或把肘关节顶死", "握稳并保持腕部顺直，终点手臂接近直但不锁肘。"), .init("回位太低或突然松力", "慢慢回到舒适起点，不让握把猛地压下，也不硬拉到肩部不适。")],
        checks: [.init("握把高度与插销已确认", "起点握把齐肩或稍高，插销完整插入；不会调节时请工作人员演示。"), .init("双手握稳，背与双脚有支撑", "腕部顺直，肘部略在身体前方，腰背保持自然弧度。"), .init("不用挺腰，也能控制上下", "需要拱腰、猛推或无法慢慢回位时，先减轻阻力。")],
        steps: [
            .init(name: "坐好", title: "先把握把调到肩部附近", text: "调座椅和起始位置，让握把齐肩或稍高，背与臀部贴靠。", points: ["双脚踩稳地面或脚踏，下背保持自然弧度。", "肘部略在身体前方，不硬向后展开。"], question: "握住握把时，不用抬起臀部或拱腰。", hint: adjustmentHint, time: 0, mode: .motion),
            .init(name: "握稳", title: "手掌贴稳，拇指也绕住", text: "本例双手正握横握把，手心朝前，左右对称。", points: ["四指和拇指完整环抱握把，不只靠指尖支撑。", "手腕与前臂顺直，别向后折。"], question: "从侧面看，手腕没有折角；握把没有滑到指尖。", hint: "竖握把、挂片推肩和自由重量的结构不同，先确认机身图示。", time: 0, mode: .detail),
            .init(name: "上推", title: "平稳向上，腰背不跟着拱", text: "缓缓呼气，沿器材轨迹向上推，背和臀部仍贴靠。", points: ["头和上身保持稳定，不挺腰追着握把走。", "手臂接近伸直时停住，不把肘关节顶死。"], question: "握把向上移动，臀部和双脚仍留在原位。", hint: "握把与弯曲推举臂相连，绕靠背后方转轴上推；现场以机身轨迹和舒适范围为准。", time: 2450, mode: .motion),
            .init(name: "回位", title: "慢慢下降，回到舒适起点", text: "始终握稳，控制着弯曲双臂，让握把回到肩部附近。", points: ["不突然松力，让握把或配重猛地落下。", "不硬压到肩部不适的位置，腰背继续保持自然。"], question: "回程能放慢，配重不会猛地撞下。", hint: painHint, time: 4500, mode: .motion)
        ], timing: .init(), references: [.init("Precor · VSL012BP 推肩器结构", "https://static.precor.com/sell-sheet/all/VSL/VSL012BP-Shoulder-Press-NA.pdf"), .init("ACE · 配重式坐姿推肩", "https://www.acefitness.org/resources/everyone/exercise-library/186/seated-shoulder-press/")])

    private static let legExtension = Self(id: .seatedLegExtension, group: "腿部", resource: "LegExtensionArtwork",
        machine: "配重式腿屈伸器", subtitle: "插销配重 · 小腿前侧滚垫", viewLabel: "斜侧面示意", detailTitle: "对齐细节 · 膝盖对转轴，滚垫在踝上", detailCaption: "本例为 Precor VSL005BP 类腿屈伸器。滚垫接触小腿前侧、脚踝上方；双手轻握座椅两侧握把，不把滚垫放在脚背。",
        details: [.init("膝盖侧面与器材转轴对齐", "调靠背，让膝关节大致对应侧面圆形转轴；不是只看座椅刻度。"), .init("滚垫贴住小腿前侧、脚踝上方", "调滚垫位置，让它贴稳小腿下端，不压在脚背或膝盖上。"), .init("背与臀部贴靠，双手轻握侧把", "大腿留在座椅上，小腿围绕膝盖抬起；不要拉握把抬起身体。")],
        comparison: ["滚垫在脚踝上方\n贴住小腿前侧", "滚垫压在脚背\n先重新调节"],
        mistakes: [.init("膝盖没有对上转轴", "先调靠背和坐姿，让膝盖侧面大致对应器材转轴。"), .init("滚垫压脚背，或猛踢借力", "滚垫在脚踝上方的小腿前侧；慢慢抬起，不甩腿。"), .init("臀部抬起、锁膝或回位撞重", "身体贴靠，终点不顶死膝盖，回程也要平稳控制。")],
        checks: [.init("膝盖已对齐转轴，插销插稳", "按机身说明调靠背和起始角度；不清楚时请现场工作人员演示。"), .init("滚垫在脚踝上方，身体坐稳", "垫在小腿前侧，背和臀部贴靠，双手轻握侧把。"), .init("小腿能缓慢抬起和放下", "需要甩腿、抬臀或拉起身体时，先减轻阻力。")],
        steps: [
            .init(name: "对齐", title: "膝盖侧面，对准圆形转轴", text: "坐稳后调靠背，让膝盖侧面大致对齐器材的转轴。", points: ["背和臀部贴靠，大腿稳定放在座椅上。", "按机身说明选择配重和舒适的起始角度。"], question: "从侧面看，膝盖与圆形转轴在相近位置。", hint: adjustmentHint, time: 0, mode: .motion),
            .init(name: "垫放好", title: "滚垫贴小腿前侧，避开脚背", text: "把滚垫调到脚踝上方的小腿下端，双手轻握座椅侧把。", points: ["滚垫不压脚背，也不靠近膝盖。", "手只帮助稳住身体，不把臀部拉离座椅。"], question: "小腿前侧贴住滚垫，脚背没有被压住。", hint: "腿弯举器的垫位和发力方向不同，本页只示范坐姿腿屈伸。", time: 0, mode: .detail),
            .init(name: "抬起", title: "慢慢伸膝，把小腿抬起来", text: "缓缓呼气，小腿沿滚垫轨迹向前上方抬起，大腿保持稳定。", points: ["不猛踢、不甩腿，背与臀部保持贴靠。", "接近伸直时停住，不用力把膝盖顶死。"], question: "动的是小腿，身体没有从座椅上抬起。", hint: "示意角度用于看清运动方向，现场按机身指引与舒适范围调整。", time: 2450, mode: .motion),
            .init(name: "回位", title: "慢慢弯膝，不直接放下", text: "控制阻力，让小腿逐渐回到起始角度。", points: ["滚垫继续贴住小腿，双脚不乱晃。", "配重平稳下降，背与臀部仍贴靠座椅。"], question: "回程可以放慢，配重没有撞击。", hint: painHint, time: 4500, mode: .motion)
        ], timing: .init(), references: [.init("Precor · VSL005BP 对齐与滚垫结构", "https://static.precor.com/sell-sheet/all/VSL/VSL005BP-Leg-Extension-NA.pdf")])

    private static let abdominalCrunch = Self(id: .seatedAbdominalCrunch, group: "核心", resource: "AbdominalCrunchArtwork",
        machine: "肩垫式配重卷腹器", subtitle: "插销配重 · 肩垫与抬高脚踏", viewLabel: "斜侧面示意", detailTitle: "接触细节 · 肩垫贴肩，手握把，脚踩稳", detailCaption: "本例为 Precor VSL014BP 类自动适应肩垫的卷腹器。肩垫接触肩部，手握上方握把，双脚踩抬高的脚踏；不是把垫压在脖子上。",
        details: [.init("肩部贴住两侧肩垫", "先坐稳，让肩垫自然贴合肩部；垫不要压住脖子。"), .init("四指和拇指环抱握把", "双手各握一侧，手腕顺直；手帮助稳定，不靠手臂猛拉。"), .init("双脚踩脚踏，臀部留在座椅", "身体缓慢卷曲，让胸口靠近骨盆；头随上身移动，不单独猛低头。")],
        comparison: ["胸口向骨盆靠近\n颈部跟随上身", "只低头、拉握把\n先减轻阻力"],
        mistakes: [.init("用手猛拉，只把头低下去", "动作来自躯干缓慢卷曲，头跟随上身；不要拉握把或甩头借力。"), .init("肩垫压脖子、臀部离座", "重新坐稳并确认肩垫接触肩部；双脚有支撑，臀部留在座椅。"), .init("一口气砸下，回位过度后仰", "卷下和回程都慢慢控制，回到舒适起点，不硬向后挺。")],
        checks: [.init("我确认了肩垫、握把和脚踏", "本例肩垫自动适应；接触位置不合适时，先请现场工作人员检查。"), .init("手握稳、脚踩稳、臀部留座", "垫贴肩部而不压脖子，手腕顺直，头随上身移动。"), .init("不用猛拉也能控制卷下和回程", "需要甩头、猛拉或抬臀时，先减轻阻力。")],
        steps: [
            .init(name: "坐稳", title: "先坐稳，把双脚放在脚踏上", text: "按机身说明选择配重，坐上座椅，双脚踩稳抬高的脚踏。", points: ["臀部留在座椅，让肩部接触两侧肩垫。", "本例肩垫自动适应，先确认它没有压住脖子。"], question: "手还没发力时，臀部、双脚和肩垫已有稳定接触。", hint: "其他卷腹器可能需要调座椅或胸垫，按现场机身说明使用。", time: 0, mode: .motion),
            .init(name: "贴稳", title: "肩垫贴肩，双手完整环握", text: "双手各握一侧上方握把，四指和拇指都绕住。", points: ["手腕顺直，手只帮助稳定，不用手把头往下拉。", "肩垫接触肩部，头和脖子保持自然。"], question: "垫没有压住脖子，双脚一直有支撑。", hint: "本例是肩垫式坐姿卷腹，绳索卷腹、仰卧起坐或双功能腹背器的结构不同。", time: 0, mode: .detail),
            .init(name: "卷下", title: "胸口缓慢靠近骨盆", text: "缓缓呼气，让躯干逐渐卷曲，肩垫沿器材轨迹向前下方移动。", points: ["臀部留在座椅，双脚踩稳，不靠手臂猛拉。", "头跟随上身，不单独甩头或把下巴猛压向胸口。"], question: "胸口与骨盆之间的距离变小，不是只低头。", hint: "斜侧面示意强调上身卷曲与双肩垫接触，幅度按机身指引和舒适范围。", time: 2400, mode: .motion),
            .init(name: "回位", title: "慢慢展开，回到自然坐姿", text: "控制阻力，逐渐回到起始姿势，双手继续握稳。", points: ["不要突然松力，让配重猛地撞下。", "不向后过度挺腰，臀部和双脚保持原位。"], question: "能把回程放慢，肩垫没有把身体猛地带回。", hint: painHint, time: 4500, mode: .motion)
        ], timing: .init(), references: [.init("Precor · VSL014BP 肩垫与脚踏结构", "https://static.precor.com/sell-sheet/all/VSL/VSL014BP-Abdominal-NA.pdf")])

    private static let legPress = Self(id: .seatedLegPress, group: "腿部", resource: "LegPressArtwork",
        machine: "配重式坐姿腿举器", subtitle: "固定座椅 · 联动踏板与插销配重", viewLabel: "斜侧面示意", detailTitle: "脚位细节 · 脚跟贴稳，膝盖顺着脚尖", detailCaption: "本例采用 Precor VSL010BP 类固定座椅、联动踏板结构。脚掌与脚跟贴住踏板，膝盖顺着脚尖方向；手轻握座椅两侧握把。",
        details: [.init("双脚对称放稳，脚跟贴住", "按机身说明放好双脚，整个脚底接触踏板；不要只用前脚掌蹬。"), .init("膝盖顺着脚尖方向", "从正面看，膝盖不向内夹；双脚不要在动作中移动。"), .init("背与臀部贴靠，手轻握侧握把", "座椅提供支撑；不用手拉身体起身，腰背不卷起。")],
        comparison: ["脚跟贴稳\n膝盖顺着脚尖", "脚跟抬起、膝盖内扣\n先重新放好脚"],
        mistakes: [.init("脚跟抬起、膝盖向内夹", "整个脚底贴稳踏板，膝盖顺着脚尖方向移动。"), .init("蹬到膝盖顶死", "伸展到接近直，保留一点弯曲，不锁住膝盖。"), .init("回得过深，臀部离座或腰背卷起", "只回到仍能贴靠座椅的位置，避免大腿挤向胸口。")],
        checks: [.init("座椅距离和插销已调好", "起始位置膝盖弯曲、脚跟贴稳；不会调节时请现场人员演示。"), .init("背、臀部与双脚都有支撑", "双脚对称，膝盖顺着脚尖，双手轻握两侧握把。"), .init("能缓慢蹬出，也能控制回位", "需要顶死膝盖或抬起臀部时，先减轻阻力、调整座椅。")],
        steps: [
            .init(name: "调好", title: "调座椅，让背和臀部贴稳", text: "按机身说明调好座椅距离与配重，坐稳再放脚。", points: ["背部和臀部贴靠座椅，腰背保持自然。", "起点膝盖弯曲，但大腿不挤压胸口。"], question: "脚放上踏板后，脚跟贴稳，臀部仍在座椅上。", hint: "本例移动的是联动踏板；45°挂片腿举或滑动座椅机型的轨迹不同。", time: 0, mode: .motion),
            .init(name: "脚放稳", title: "整个脚底贴住，膝盖顺着脚尖", text: "双脚对称放在踏板上，按机身说明调整脚位。", points: ["脚跟与前脚掌都贴住，不踮脚。", "双手轻握座椅两侧握把，背与臀部保持支撑。"], question: "从正面看，双膝朝脚尖方向，没有向内夹。", hint: "图中脚位用于说明接触与方向，具体间距按机身指引和舒适范围调整。", time: 0, mode: .detail),
            .init(name: "蹬出", title: "慢慢蹬远，膝盖不顶死", text: "缓缓呼气，双腿平稳伸展，把踏板蹬远。", points: ["脚跟不离开踏板，背与臀部不离开座椅。", "接近伸直时保留一点弯曲，不锁膝盖。"], question: "踏板在移动，身体仍贴靠，双膝没有顶死。", hint: "本例踏板通过连杆平稳移动，并保持直立；选中的配重随发力上升。", time: 2500, mode: .motion),
            .init(name: "回位", title: "慢慢屈膝，回到可控位置", text: "控制着弯曲髋和膝，让踏板回到起点。", points: ["整个脚底一直贴住，膝盖顺着脚尖。", "在臀部仍贴座椅的位置停下，不让大腿挤到胸口。"], question: "配重平稳下降，脚跟、背部和臀部始终贴稳。", hint: painHint, time: 4500, mode: .motion)
        ], timing: .init(effortStart: 700), references: [.init("Precor · VSL010BP 结构与踏板", "https://static.precor.com/sell-sheet/all/VSL/VSL010BP-Leg-Press-Calf-Extension-NA.pdf"), .init("ACE · 坐姿腿举", "https://www.acefitness.org/resources/everyone/exercise-library/154/seated-leg-press/")])

    private static let freeWeightHint = "先用很轻的哑铃练习拿起和放回；不熟悉握法或站位时，请现场教练演示。"

    private static let gobletSquat = Self(id: .dumbbellGobletSquat, group: "腿部", resource: "GobletSquatArtwork",
        machine: "单只哑铃", subtitle: "自由重量 · 双手托住上端铃头", viewLabel: "斜侧面示意", detailTitle: "握法细节 · 双手托稳铃头", detailCaption: "本例使用一体固定式哑铃，竖直放在胸前。可调哑铃请先按产品说明确认锁定和握持方式。",
        details: [.init("两手托在上端铃头下方", "手掌从两侧承托铃头，不是只捏住边缘，也不是握下面的铃头。"), .init("手指包住两侧，哑铃竖直", "两只手一起托稳；保持靠近胸前，不向前平举。"), .init("整只脚踩稳，膝盖跟随脚尖", "双脚约肩宽，脚尖自然略向外；下蹲时脚跟仍接触地面。")],
        comparison: ["整只脚踩稳\n哑铃贴近胸前", "脚跟抬起、重心前冲\n减小下蹲幅度"],
        mistakes: [.init("脚跟离地，身体向前扑", "保留全脚掌支撑，只下到能稳住的深度，不照着图硬蹲到底。"), .init("膝盖向内夹、背部弓起", "膝盖朝脚尖方向，背部保持自然位置；控制不住时减轻重量。"), .init("把哑铃举离胸口或借反弹站起", "哑铃始终贴近胸前，慢慢下蹲，再平稳站起。")],
        checks: [.init("哑铃结构和握持方式已确认", "本例为固定式哑铃；铃头完整、双手能稳稳托住。"), .init("胸前托稳，全脚掌踩稳", "脚尖自然略向外，附近没有会绊倒的物品。"), .init("下蹲与站起都能保持控制", "先空手练习，再拿轻哑铃；脚跟不离地、膝盖不内夹。")],
        steps: [
            .init(name: "站稳", title: "先空手确认站位和深度", text: "双脚约肩宽，脚尖自然略向外，先试一次能控制的下蹲。", points: ["全脚掌踩稳，背部保持自然位置。", "以脚跟不离地、身体能稳住为准，不追求固定深度。"], question: "不拿哑铃时，我也能稳稳下蹲和站起。", hint: freeWeightHint, time: 0, mode: .motion),
            .init(name: "托稳", title: "两手托住上端铃头下方", text: "把单只固定式哑铃竖直托在胸前，让两只手一起承托上端铃头。", points: ["手指包住两侧，哑铃贴近胸前。", "肘部靠近身体，不把重量向前举远。"], question: "两只手都托稳，下面的铃头自然垂向地面。", hint: "可调哑铃的铃片或锁扣结构不同，先确认是否适合这种握法。", time: 0, mode: .detail),
            .init(name: "下蹲", title: "髋与膝一起弯，脚跟不抬", text: "慢慢弯曲髋和膝，让身体与胸前哑铃一起下降。", points: ["膝盖跟随脚尖方向，别向内夹。", "背部保持自然，只下到能平稳控制的位置。"], question: "哑铃仍在胸前，脚跟仍踩着地面。", hint: "侧面图展示上下变化；膝盖可以随动作自然前移，不必硬限制在脚尖后面。", time: 2500, mode: .motion),
            .init(name: "站起", title: "双脚踩地，平稳回到站姿", text: "缓缓呼气，双脚踩稳地面，让身体和哑铃一起上升。", points: ["站起时膝盖仍朝脚尖方向，不内夹。", "回到自然站姿，不猛顶膝盖或挺腰后仰。"], question: "我靠双腿平稳站起，没有在底部反弹。", hint: painHint, time: 4500, mode: .motion)
        ], timing: .init(), references: [.init("ACE · 哑铃高脚杯深蹲", "https://www.acefitness.org/resources/everyone/exercise-library/362/goblet-squat/"), .init("ACE · 深蹲深度与控制", "https://www.acefitness.org/resources/pros/expert-articles/7406/how-low-to-go-examining-squat-depth-from-a-safety-and-biomechanical-perspective/")])

    private static let dumbbellRow = Self(id: .singleArmDumbbellRow, group: "背部", resource: "DumbbellRowArtwork",
        machine: "单只哑铃与平凳", subtitle: "自由重量 · 同侧手与膝支撑平凳", viewLabel: "侧面示意 · 示范右侧", detailTitle: "握法细节 · 环握中间手柄", detailCaption: "本例左手与左膝支撑平凳，右脚踩地、右手握哑铃。完成一侧后安全放回哑铃，再换边。",
        details: [.init("四指和拇指包住中间手柄", "握在两端铃头之间，掌心朝向身体，不捏铃头，也不只用指尖勾着。"), .init("手腕与前臂顺直", "上拉时不折腕；让肘部向后，哑铃靠近身体侧面。"), .init("支撑手在肩下，支撑膝在髋下", "左手、左膝稳放平凳，右脚踩地；腰背保持自然，头与背部方向一致。")],
        comparison: ["腰背和髋保持稳定\n肘贴近身体向后", "抬肩、扭腰甩起来\n先减轻重量"],
        mistakes: [.init("上拉时把胸口扭向天花板", "胸口保持朝向地面，髋与腰背稳住，不靠转体抬起哑铃。"), .init("弓背、抬头或把肩膀耸起", "头与背部方向一致，肩膀远离耳朵；不要向下探肩去够地面。"), .init("哑铃猛拉猛放，手腕折起", "上拉和下放都慢慢控制，手腕顺直，整只手持续握稳。")],
        checks: [.init("平凳稳定，支撑位置已确认", "左手在肩下、左膝在髋下，右脚踩稳地面。"), .init("右手环握，腰背和头保持自然", "掌心朝向身体，手腕顺直，胸口朝向地面。"), .init("不转体也能控制上下与换边", "重量够轻，能缓慢下放；先安全放回哑铃再换侧。")],
        steps: [
            .init(name: "撑稳", title: "左手左膝上凳，右脚踩地", text: "用稳固的平凳支撑左手和左膝，右脚在旁边踩稳。", points: ["支撑手在肩下，支撑膝在髋下，躯干朝向地面。", "腰背保持自然，头与背部方向一致，不抬头找镜子。"], question: "拿起哑铃前，平凳和三处支撑已经稳定。", hint: freeWeightHint, time: 0, mode: .motion),
            .init(name: "握稳", title: "握中间手柄，掌心朝身体", text: "右手四指与拇指都包住手柄，手臂自然下垂。", points: ["手腕与前臂顺直，不只用指尖挂着。", "肩部保持稳定，不为了够低而向下探肩。"], question: "两端铃头在手的两侧，掌心朝身体。", hint: "这页只示范长凳支撑式单臂哑铃划船；站姿、胸部支撑和双臂变式另有站位。", time: 0, mode: .detail),
            .init(name: "上拉", title: "肘部贴近身体，向后带动", text: "缓缓呼气，把哑铃拉向身体侧面，让上臂向后。", points: ["胸口和髋不转动，不抬肩甩哑铃。", "拉到还能保持腰背稳定的位置，不强行拉得更高。"], question: "手与肘在移动，头、背部和支撑位置保持稳定。", hint: "侧面图强调肘部向后；哑铃从平凳外侧经过，不穿过凳面。", time: 2500, mode: .motion),
            .init(name: "下放", title: "慢慢伸臂，不丢掉控制", text: "平稳下放哑铃，让手臂回到自然下垂的位置。", points: ["继续保持背部自然，不跟着哑铃扭腰或探肩。", "完成一侧后，先安全放回哑铃再换边。"], question: "下放速度能控制，右手始终握住手柄。", hint: painHint, time: 4500, mode: .motion)
        ], timing: .init(), references: [.init("ACE · 平凳支撑单臂哑铃划船", "https://www.acefitness.org/resources/everyone/exercise-library/126/single-arm-row/")])

    private static let dumbbellShoulderPress = Self(id: .seatedDumbbellShoulderPress, group: "肩部", resource: "DumbbellShoulderPressArtwork",
        machine: "两只哑铃与靠背凳", subtitle: "自由重量 · 靠背支撑与掌心朝前", viewLabel: "斜侧面示意", detailTitle: "握法细节 · 手腕立在前臂上方", detailCaption: "本例坐在有靠背的训练凳上，双手掌心朝前，肘部略在身体前方。中立握、站姿和阿诺德推举属于不同变式。",
        details: [.init("四指与拇指包住中间手柄", "握在两端铃头之间，掌心朝前，两只手各握一只哑铃。"), .init("手腕与前臂顺直", "不要向后折腕，让前臂承托手中的重量。"), .init("背部和臀部贴靠，双脚踩稳", "哑铃起点在肩部附近，肘部略在身体前方；拿起和放回都要控制。")],
        comparison: ["背部和臀部贴靠\n两只哑铃平稳上推", "拱腰、离开靠背\n先减轻重量"],
        mistakes: [.init("为了举高而拱腰、抬起臀部", "背部与臀部留在靠背凳上，双脚踩稳，不用腰部借力。"), .init("折腕、双手乱晃或撞击铃头", "整只手握稳，手腕顺直；两只哑铃保持控制，不在头顶相撞。"), .init("回位太低或松力猛落", "慢慢回到肩部附近的舒适起点，不让哑铃砸向肩膀。")],
        checks: [.init("靠背凳稳固，知道怎样拿起放回", "先用很轻的哑铃；不熟悉起落方式时请教练现场协助。"), .init("两手环握，背部和双脚有支撑", "掌心朝前，手腕顺直，肘部略在身体前方。"), .init("不用拱腰，仍能控制上下", "需要猛推或无法慢慢回位时，先减轻重量；需要时请教练保护。")],
        steps: [
            .init(name: "坐稳", title: "靠背凳坐稳，双脚踩地", text: "选稳固、有靠背的训练凳，让背部与臀部贴靠，双脚踩稳。", points: ["腰背保持自然弧度，不向前探身或抬起臀部。", "先确认怎样安全把哑铃带到肩部和放回。"], question: "拿起哑铃前，我已经知道起落方式并能坐稳。", hint: freeWeightHint, time: 0, mode: .motion),
            .init(name: "握稳", title: "掌心朝前，哑铃在肩部附近", text: "双手各环握一只哑铃的中间手柄，把重量稳在肩部附近。", points: ["手腕与前臂顺直，四指和拇指都绕住。", "肘部略在身体前方，不硬向后展开。"], question: "两手各握一只哑铃，手腕没有明显折角。", hint: "正面图不显示全部前后关系；需要时请现场教练协助起落与保护。", time: 0, mode: .detail),
            .init(name: "上推", title: "双手平稳上推，不挺腰", text: "缓缓呼气，将两只哑铃一起向上推，上身保持支撑。", points: ["手臂接近伸直，不猛顶肘关节。", "哑铃之间留有间距，不撞铃头，不耸肩借力。"], question: "两只哑铃在升高，背与臀部仍贴靠凳子。", hint: "自由重量没有器械轨道，需要自己稳住方向；不能控制时先减轻重量。", time: 2500, mode: .motion),
            .init(name: "回位", title: "慢慢回到肩部附近", text: "缓慢弯曲双肘，控制哑铃回到舒适起点。", points: ["手腕保持顺直，背部与双脚仍有支撑。", "不顺着重力突然松手，结束后按已学会的方式安全放回。"], question: "下降速度能控制，哑铃没有砸向肩膀。", hint: painHint, time: 4500, mode: .motion)
        ], timing: .init(), references: [.init("ACE · 坐姿哑铃推肩", "https://www.acefitness.org/resources/everyone/exercise-library/45/seated-overhead-press/")])

    private static let pecFly = Self(id: .seatedPecFly, group: "胸部", resource: "PecFlyArtwork",
        machine: "握把式蝴蝶夹胸器", subtitle: "顶部转轴 · 双活动臂与竖握把", viewLabel: "斜侧面示意", detailTitle: "握法细节 · 包住竖握把，肘部微弯", detailCaption: "本例采用 Precor VSL015BP 类握把式夹胸结构。背靠长垫，双手握竖握把；肘垫式蝴蝶机的接触位置不同。",
        details: [.init("调座椅，让握把与胸部附近齐平", "背与臀部贴靠长垫，双脚踩稳；按机身图示选择夹胸起始位置。"), .init("四指与拇指环抱竖握把", "掌心相对，手腕与前臂顺直；不能只用指尖勾住。"), .init("手臂向胸前合拢，肘部留一点弯曲", "不是像推胸那样把肘逐渐伸直；双肩保持稳定，左右平稳合拢。")],
        comparison: ["肘部留一点弯曲\n双手稳稳环握", "锁肘、打开过远\n重新调起始位置"],
        mistakes: [.init("起始位置过于靠后，硬拉肩膀", "按机身图示调活动臂，选择肩部舒适的起点，不强行向后拉。"), .init("锁住肘关节或折腕", "肘部留一点弯曲，握把与手腕保持自然，不让手臂变成硬直杆。"), .init("耸肩、前倾或猛撞握把", "背与臀部保持支撑，平稳合拢与打开，不用身体摆动借力。")],
        checks: [.init("座椅、活动臂起点与插销已调好", "确认当前为夹胸握法；反向飞鸟和肘垫机型需要另行确认。"), .init("手环握、肘微弯、脚踩稳", "背与臀部贴靠长垫，手腕顺直，双肩不向耳朵耸起。"), .init("肩部舒适，也能慢慢打开", "需要猛拉、前倾或无法控制回程时，先减轻阻力。")],
        steps: [
            .init(name: "调好", title: "握把齐胸，起点别拉得太后", text: "按机身说明调座椅、活动臂起点与配重，背靠长垫坐稳。", points: ["双脚踩稳，背和臀部有支撑。", "本页用竖握把夹胸，不使用反向飞鸟的握位。"], question: "握住两侧把手时，肩部舒适，上身不用前倾。", hint: adjustmentHint, time: 0, mode: .motion),
            .init(name: "握稳", title: "四指与拇指都包住竖握把", text: "双手掌心相对，完整环抱握把，肘部留一点弯曲。", points: ["手腕与前臂顺直，掌心贴稳握把。", "不是把肘部放在垫上，也不锁住肘关节。"], question: "手掌贴住握把，手腕自然，肘部不是硬直的。", hint: "握把式和肘垫式蝴蝶机结构不同，先看现场机身说明。", time: 0, mode: .detail),
            .init(name: "合拢", title: "手臂沿弧线，平稳向胸前合拢", text: "缓缓呼气，把左右活动臂向胸前合拢，保持肘部轻微弯曲。", points: ["背贴靠垫，不用前倾、耸肩或伸肘借力。", "到可控终点即可，不把两只握把猛地撞在一起。"], question: "活动臂围绕顶部转轴移动，身体仍稳稳贴靠。", hint: "机身允许的活动范围与舒适范围决定终点，不强求握把相碰。", time: 2450, mode: .motion),
            .init(name: "回位", title: "慢慢打开，回到舒适起点", text: "继续握稳，把活动臂控制着向两侧打开。", points: ["肘部仍保留一点弯曲，不硬向后拉肩。", "配重平稳下降，背、臀部与双脚保持支撑。"], question: "打开的过程也能放慢，没有被活动臂猛地带回。", hint: painHint, time: 4500, mode: .motion)
        ], timing: .init(), references: [.init("Precor · VSL015BP 顶部转轴与握把", "https://static.precor.com/sell-sheet/all/VSL/VSL015BP-Rear-Delt-Pec-Fly-NA.pdf")])

    private static let legCurl = Self(id: .seatedLegCurl, group: "腿部", resource: "LegCurlArtwork",
        machine: "配重式坐姿腿弯举器", subtitle: "大腿固定垫 · 小腿后侧滚垫", viewLabel: "斜侧面示意", detailTitle: "对齐细节 · 上垫固定大腿，下垫托小腿", detailCaption: "本例采用 Precor RSL0619 类坐姿腿弯举。双手握大腿固定垫上方的竖把；膝盖对转轴，上垫贴大腿、下垫托住脚踝上方的小腿后侧；与腿屈伸的前侧滚垫不同。",
        details: [.init("膝盖侧面与圆形转轴对齐", "调靠背和坐姿，大腿留在座椅上，膝盖不要悬在转轴前后很远。"), .init("上垫固定大腿，下垫托小腿后侧", "大腿垫贴在膝盖上方并保持固定；脚踝上方的小腿后侧贴住下方滚垫。"), .init("双手握固定垫上方竖把，身体贴靠", "小腿向下、向座椅下方弯回；不抬起臀部，也不用脚背顶垫。")],
        comparison: ["上垫贴腿、下垫托后侧\n背与臀部贴靠", "上垫悬空、下垫在前侧\n先重新调节"],
        mistakes: [.init("膝盖未对转轴，大腿垫悬空", "重新调靠背和压垫，确认膝盖对轴、上垫贴腿后再开始。"), .init("把腿弯举当腿屈伸，垫放在前侧", "腿弯举的下垫托小腿后侧，发力时向下弯膝；不是向前踢。"), .init("抬臀、甩腿或松力回弹", "背与臀部贴靠座椅，双手只帮助稳定，弯回和回程都要可控。")],
        checks: [.init("膝盖对轴，起点与插销已调好", "按机身说明调整靠背、大腿垫、下滚垫和起始角度。"), .init("上垫贴腿，下垫托后侧", "滚垫位于脚踝上方，背与臀部贴靠，双手握稳大腿固定垫上方竖把。"), .init("不用抬臀，也能控制弯回与回程", "需要甩腿或被拉着突然伸直时，先减轻阻力。")],
        steps: [
            .init(name: "对齐", title: "先把膝盖对上圆形转轴", text: "坐稳后按机身说明调靠背、起始角度和配重。", points: ["背与臀部贴靠，膝盖侧面大致对应器材转轴。", "起点在舒适范围内，不把膝关节顶死。"], question: "膝盖在转轴附近，身体可以稳稳坐住。", hint: adjustmentHint, time: 0, mode: .motion),
            .init(name: "垫放好", title: "上垫固定大腿，下垫托小腿后侧", text: "上垫贴住膝盖上方的大腿，下垫托住脚踝上方的小腿后侧。", points: ["下垫不压脚背，也不放到小腿前侧。", "双手握大腿固定垫上方的竖把，身体贴靠支撑。"], question: "大腿有固定，小腿后侧有接触，臀部仍在座椅上。", hint: "俯卧腿弯举、站姿腿弯举和腿屈伸不是本页机型。", time: 0, mode: .detail),
            .init(name: "弯回", title: "小腿向下，平稳弯向座椅下方", text: "缓缓呼气，弯曲膝盖，让小腿带动下方滚垫向下、向后移动。", points: ["大腿、背与臀部保持稳定，不甩腿、不抬臀。", "在可控且舒适的终点停住，不强行弯到最大。"], question: "下方滚垫在动，上方压垫和身体保持支撑。", hint: "动画示范方向，起始角度和幅度按机身说明与舒适范围调整。", time: 2450, mode: .motion),
            .init(name: "回位", title: "慢慢伸回，不让滚垫猛弹", text: "控制阻力，让小腿逐渐回到起始位置，继续贴靠座椅。", points: ["上垫仍贴腿，下垫仍接触小腿后侧。", "接近起点时不锁膝，也不让配重撞下。"], question: "回程可以放慢，臀部没有离座。", hint: painHint, time: 4500, mode: .motion)
        ], timing: .init(), references: [.init("Precor · RSL0619 大腿固定垫与膝轴结构", "https://static.precor.com/sell-sheet/all/RSL/RSL0619-Seated-Leg-Curl-NA.pdf"), .init("NASM · 坐姿腿弯举动作", "https://www.nasm.org/resource-center/exercise-library/seated-leg-curl")])

    private static let hipAbduction = Self(id: .seatedHipAbduction, group: "臀部", resource: "HipAbductionArtwork",
        machine: "坐姿髋外展器", subtitle: "外展模式 · 大腿外侧靠垫与脚杆", viewLabel: "斜侧面示意", detailTitle: "接触细节 · 垫贴外侧，双脚踩稳", detailCaption: "本例采用 Precor VSL008BP 类内收/外展机的外展模式。垫贴大腿外侧，双脚踩脚杆；内收模式的垫位和发力方向不同。",
        details: [.init("先确认外展模式与起始宽度", "按机身说明调模式和起点；不是看到内收/外展机就直接坐下发力。"), .init("靠垫贴大腿外侧，脚踩稳脚杆", "两侧靠垫贴膝盖上方的大腿外侧，双脚选择适合身高的脚杆。"), .init("背与臀部贴靠，双腿平稳向外", "手轻握两侧把手，身体不晃动，也不靠猛张腿扩大幅度。")],
        comparison: ["垫贴大腿外侧\n双腿平稳向外", "垫放在大腿内侧\n不是本页外展模式"],
        mistakes: [.init("内收模式与外展模式混淆", "先按机身图示确认垫位与模式，本例只展示向外打开。"), .init("身体前倾、摇晃或猛地张腿", "背与臀部贴靠，手只帮助稳定，缓慢向外并控制回程。"), .init("脚离开脚杆，打开超过舒适幅度", "双脚有支撑，选择可控范围，不为了跟动画而强行打开。")],
        checks: [.init("已经确认外展模式、起点与插销", "不会切换模式或调靠垫时，请现场工作人员演示。"), .init("垫贴外侧，脚踩杆，背与臀部贴靠", "靠垫接触大腿外侧，双手轻握侧把，上身保持稳定。"), .init("能平稳打开，也能慢慢合回", "需要晃动上身、猛张腿或无法控制回程时，先减轻阻力。")],
        steps: [
            .init(name: "调好", title: "先确认外展模式，调好起点", text: "按机身说明设置外展模式、起始宽度与配重，再坐稳。", points: ["靠垫应贴大腿外侧，内收模式需另外调节。", "背和臀部贴靠，不会调时请工作人员演示。"], question: "机身图示、模式和靠垫方向都对应向外打开。", hint: adjustmentHint, time: 0, mode: .motion),
            .init(name: "贴稳", title: "大腿贴外侧垫，脚踩稳脚杆", text: "两侧靠垫贴住膝盖上方的大腿外侧，双脚选择合适的脚杆。", points: ["双手轻握侧把，背与臀部保持贴靠。", "双脚都有支撑，不把靠垫直接压在膝关节上。"], question: "垫贴外侧、脚踩稳，上身可以保持不晃。", hint: "双功能内收/外展机的模式切换方式不同，按现场机身说明确认。", time: 0, mode: .detail),
            .init(name: "打开", title: "双腿缓慢向外，上身保持稳定", text: "缓缓呼气，让两侧大腿推着靠垫向外打开。", points: ["不猛地张腿，不向前探或摇晃上身。", "在舒适可控的范围停下，不追求尽可能宽。"], question: "大腿和两侧活动臂在动，背、臀部与脚杆接触仍稳定。", hint: "动画用于看清模式和方向，现场幅度由机身指引与舒适范围决定。", time: 2450, mode: .motion),
            .init(name: "回位", title: "控制着合回，不让靠垫夹回", text: "慢慢让双腿与活动臂回到起始宽度。", points: ["两侧靠垫持续贴住大腿，双脚踩稳脚杆。", "配重平稳下降，不突然松力。"], question: "合回时身体不晃，脚没有离开支撑。", hint: painHint, time: 4500, mode: .motion)
        ], timing: .init(), references: [.init("Precor · VSL008BP 垫位、脚杆与模式", "https://static.precor.com/sell-sheet/all/VSL/VSL008BP-Inner-Outer-Thigh-NA.pdf")])
}

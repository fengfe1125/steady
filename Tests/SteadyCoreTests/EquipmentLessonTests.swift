import Testing
@testable import SteadyCore

struct EquipmentLessonTests {
    @Test(arguments: EquipmentLessonID.allCases)
    func exactMachineAliasesResolveToTheirOwnLesson(_ id: EquipmentLessonID) {
        for name in id.aliases {
            #expect(EquipmentLessonID.matching(exerciseName: " \(name.uppercased())\n") == id)
        }
    }
    @Test func unsupportedVariantsNeverGetAnUnrelatedTutorial() {
        for name in ["卧推", "哑铃推胸", "俯卧撑", "站姿推胸", "chest press", "incline machine chest press", "坐姿推胸变式", "反握高位下拉", "颈后下拉", "单臂下拉", "引体向上", "胸部支撑划船", "哑铃划船", "杠铃划船", "划船机", "45度腿举", "挂片腿举", "leg press", "史密斯深蹲", "", "高位下拉 3组", "哑铃推肩", "坐姿推肩", "站姿推举", "挂片推肩", "seated shoulder press", "俯卧腿弯举", "站姿腿弯举", "挂片腿屈伸", "仰卧起坐", "绳索卷腹", "器械卷腹", "腹背双功能器", "abdominal crunch", "壶铃高脚杯深蹲", "高脚杯深蹲", "杠铃深蹲", "goblet squat", "双臂哑铃划船", "站姿单臂划船", "chest supported dumbbell row", "站姿哑铃推肩", "阿诺德推举", "neutral grip dumbbell press", "哑铃弯举", "杠铃牧师凳弯举", "绳索弯举", "biceps curl", "反向蝴蝶机", "后束飞鸟", "肘垫式夹胸", "pec deck"] {
            #expect(EquipmentLessonID.matching(exerciseName: name) == nil)
        }
    }
    @Test func lessonNamesAndAliasesAreUnique() {
        #expect(Set(EquipmentLessonID.allCases.map(\.rawValue)).count == 14)
        let aliases = EquipmentLessonID.allCases.flatMap(\.aliases)
        #expect(Set(aliases).count == aliases.count)
    }
    @Test func catalogueIncludesEveryLessonExactlyOnce() {
        let visible = EquipmentLessonDefinition.groups.flatMap { group in
            EquipmentLessonID.allCases.filter { EquipmentLessonDefinition.lesson($0).group == group }
        }
        #expect(visible.count == EquipmentLessonID.allCases.count)
        #expect(Set(visible) == Set(EquipmentLessonID.allCases))
    }
    @Test(arguments: EquipmentLessonID.allCases)
    func completeBeginnerContentAndStepRouting(_ id: EquipmentLessonID) {
        let lesson = EquipmentLessonDefinition.lesson(id)
        #expect(lesson.id == id)
        #expect(!lesson.structure.isEmpty && !lesson.structureReference.isEmpty)
        if id.usesDumbbells {
            #expect(!lesson.structureReference.contains("Precor"))
            #expect(lesson.effortDetail.contains("哑铃") && lesson.returnDetail.contains("哑铃"))
        } else {
            #expect(lesson.structureReference.contains("Precor"))
        }
        #expect(lesson.steps.count == 4)
        #expect(lesson.details.count == 3 && lesson.mistakes.count == 3 && lesson.checks.count == 3)
        #expect(lesson.comparison.count == 2 && !lesson.references.isEmpty)
        #expect(lesson.steps[1].mode == .detail)
        #expect(lesson.steps[2].mode == .motion && lesson.steps[3].mode == .motion)
        for step in lesson.steps {
            #expect(step.points.count == 2)
            #expect(!step.question.isEmpty && !step.hint.isEmpty)
            #expect(step.time >= 0 && step.time <= lesson.timing.duration)
        }
        #expect(lesson.phase(at: lesson.steps[2].time) == "\(lesson.effort) · \(lesson.effortDetail)")
        #expect(lesson.phase(at: lesson.steps[3].time) == "回位 · \(lesson.returnDetail)")
    }
    @Test func dumbbellDirectionsDescribeTheActualWeightMovement() {
        let squat = EquipmentLessonDefinition.lesson(.dumbbellGobletSquat)
        #expect(squat.phase(at: 1700) == "下蹲 · 哑铃随身体下降")
        #expect(squat.phase(at: 4500) == "回位 · 哑铃随身体上升")
        #expect(squat.phase(at: 0) == "起始姿势")
        #expect(squat.phase(at: 3000) == "终点 · 保持控制")
        for id in [EquipmentLessonID.singleArmDumbbellRow, .seatedDumbbellShoulderPress] {
            let lesson = EquipmentLessonDefinition.lesson(id)
            #expect(lesson.phase(at: 1700) == "\(lesson.effort) · 哑铃上升")
            #expect(lesson.phase(at: 4500) == "回位 · 哑铃下降")
            #expect(!lesson.scope.contains("机身说明"))
        }
        #expect(EquipmentLessonDefinition.lesson(.seatedChestPress).phase(at: 1700) == "推出 · 配重上升")
    }
    @Test(arguments: EquipmentLessonID.allCases)
    func effortAndReturnAreContinuousAndMonotonic(_ id: EquipmentLessonID) {
        let t = EquipmentLessonDefinition.lesson(id).timing
        #expect(0 < t.effortStart && t.effortStart < t.effortEnd)
        #expect(t.effortEnd < t.returnStart && t.returnStart < t.returnEnd && t.returnEnd < t.duration)
        #expect(t.progress(at: 0) == 0 && t.progress(at: t.duration) == 0)
        #expect(t.progress(at: t.effortEnd) == 1 && t.progress(at: t.returnStart) == 1)
        var previous = 0.0
        for i in 0...100 {
            let value = t.progress(at: t.effortStart + (t.effortEnd - t.effortStart) * Double(i) / 100)
            #expect(value >= previous && value <= 1); previous = value
        }
        for i in 0...100 {
            let value = t.progress(at: t.returnStart + (t.returnEnd - t.returnStart) * Double(i) / 100)
            #expect(value <= previous && value >= 0); previous = value
        }
    }
}

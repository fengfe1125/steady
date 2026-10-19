import Foundation

public enum MovementConditionStatus: String, Codable, CaseIterable, Sendable {
    case ready, unsure, unable
    public var title: String { switch self { case .ready: "能完成"; case .unsure: "不确定"; case .unable: "不能完成" } }
}
public struct MovementConditionAnswer: Codable, Equatable, Sendable {
    public var conditionID: String
    public var version: Int
    public var status: MovementConditionStatus
    public init(conditionID: String, version: Int, status: MovementConditionStatus) {
        self.conditionID = conditionID; self.version = version; self.status = status
    }
}
public struct PlanGenerationContext: Codable, Equatable, Sendable {
    public var experience: String
    public var availableEquipmentIDs: [String]
    public var availableMinutes: Int
    public var movementConditions: [MovementConditionAnswer]? { didSet { movementConditionsWasMissing = false } }
    public var programKind: String? { didSet { programKindWasMissing = false } }
    public var rulesVersion: Int? { didSet { rulesVersionWasMissing = false } }
    var movementConditionsWasMissing = false, programKindWasMissing = false, rulesVersionWasMissing = false
    public init(experience: String, availableEquipmentIDs: [String], availableMinutes: Int) {
        self.experience = experience; self.availableEquipmentIDs = availableEquipmentIDs; self.availableMinutes = availableMinutes
    }
    public init(preferences: UserPreferences, programKind: String? = nil) throws {
        guard let equipment = preferences.availableEquipmentIDs else {
            throw ServiceError.invalidInput("请先确认本次可用的具体器械；没有器械可选择仅自重。")
        }
        guard preferences.limitations.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw ServiceError.invalidInput("存在运动限制，请先咨询专业人士，不自动生成训练方案。")
        }
        self.init(experience: preferences.experience, availableEquipmentIDs: equipment, availableMinutes: preferences.availableMinutes)
        if let programKind {
            self.programKind = programKind; rulesVersion = 2; movementConditions = preferences.movementConditions ?? []
        }
    }
    public static func == (lhs: Self, rhs: Self) -> Bool {
        lhs.experience == rhs.experience && lhs.availableEquipmentIDs == rhs.availableEquipmentIDs
            && lhs.availableMinutes == rhs.availableMinutes && lhs.movementConditions == rhs.movementConditions
            && lhs.programKind == rhs.programKind && lhs.rulesVersion == rhs.rulesVersion
    }
    private enum CodingKeys: String, CodingKey { case experience, availableEquipmentIDs, availableMinutes, movementConditions, programKind, rulesVersion }
    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        experience = try c.decode(String.self, forKey: .experience)
        availableEquipmentIDs = try c.decode([String].self, forKey: .availableEquipmentIDs)
        availableMinutes = try c.decode(Int.self, forKey: .availableMinutes)
        movementConditions = try c.decodeIfPresent([MovementConditionAnswer].self, forKey: .movementConditions)
        programKind = try c.decodeIfPresent(String.self, forKey: .programKind)
        rulesVersion = try c.decodeIfPresent(Int.self, forKey: .rulesVersion)
        movementConditionsWasMissing = !c.contains(.movementConditions); programKindWasMissing = !c.contains(.programKind); rulesVersionWasMissing = !c.contains(.rulesVersion)
    }
    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(experience, forKey: .experience); try c.encode(availableEquipmentIDs, forKey: .availableEquipmentIDs); try c.encode(availableMinutes, forKey: .availableMinutes)
        if !movementConditionsWasMissing { try c.encode(movementConditions, forKey: .movementConditions) }
        if !programKindWasMissing { try c.encode(programKind, forKey: .programKind) }
        if !rulesVersionWasMissing { try c.encode(rulesVersion, forKey: .rulesVersion) }
    }
}

// Preserve legacy omissions across offline upgrades; explicit assignments encode clears.
public extension Exercise {
    private enum CodingKeys: String, CodingKey { case id, name, prescription, catalogID, catalogVersion, templateID, role }
    init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(UUID.self, forKey: .id)
        name = try c.decode(String.self, forKey: .name)
        prescription = try c.decode(String.self, forKey: .prescription)
        catalogID = try c.decodeIfPresent(String.self, forKey: .catalogID)
        catalogVersion = try c.decodeIfPresent(Int.self, forKey: .catalogVersion)
        templateID = try c.decodeIfPresent(String.self, forKey: .templateID)
        role = try c.decodeIfPresent(String.self, forKey: .role)
        catalogIDWasMissing = !c.contains(.catalogID)
        catalogVersionWasMissing = !c.contains(.catalogVersion)
        templateIDWasMissing = !c.contains(.templateID)
        roleWasMissing = !c.contains(.role)
    }
    func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id); try c.encode(name, forKey: .name); try c.encode(prescription, forKey: .prescription)
        if !catalogIDWasMissing { try c.encode(catalogID, forKey: .catalogID) }
        if !catalogVersionWasMissing { try c.encode(catalogVersion, forKey: .catalogVersion) }
        if !templateIDWasMissing { try c.encode(templateID, forKey: .templateID) }
        if !roleWasMissing { try c.encode(role, forKey: .role) }
    }
    mutating func setCustomPrescription(_ value: String) {
        if prescription != value { prescription = value; templateID = nil }
    }
}

public extension TrainingPlan {
    private enum CodingKeys: String, CodingKey { case metadata, title, status, sessions, generationContext }
    init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        metadata = try c.decode(RecordMetadata.self, forKey: .metadata)
        title = try c.decode(String.self, forKey: .title)
        status = try c.decode(PlanStatus.self, forKey: .status)
        sessions = try c.decode([WorkoutSession].self, forKey: .sessions)
        generationContext = try c.decodeIfPresent(PlanGenerationContext.self, forKey: .generationContext)
        generationContextWasMissing = !c.contains(.generationContext)
    }
    func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(metadata, forKey: .metadata); try c.encode(title, forKey: .title); try c.encode(status, forKey: .status)
        try c.encode(sessions, forKey: .sessions)
        if !generationContextWasMissing { try c.encode(generationContext, forKey: .generationContext) }
    }
}

public extension UserPreferences {
    private enum CodingKeys: String, CodingKey {
        case metadata, goal, experience, equipment, availableEquipmentIDs, movementConditions, availableMinutes, limitations
        case healthRead, cloudSync, aiProcessing, onboardingComplete
    }
    init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        metadata = try c.decode(RecordMetadata.self, forKey: .metadata)
        goal = try c.decode(String.self, forKey: .goal)
        experience = try c.decode(String.self, forKey: .experience)
        equipment = try c.decode(String.self, forKey: .equipment)
        availableEquipmentIDs = try c.decodeIfPresent([String].self, forKey: .availableEquipmentIDs)
        movementConditions = try c.decodeIfPresent([MovementConditionAnswer].self, forKey: .movementConditions)
        movementConditionsWasMissing = !c.contains(.movementConditions)
        availableMinutes = try c.decode(Int.self, forKey: .availableMinutes)
        limitations = try c.decode(String.self, forKey: .limitations)
        healthRead = try c.decode(Bool.self, forKey: .healthRead)
        cloudSync = try c.decode(Bool.self, forKey: .cloudSync)
        aiProcessing = try c.decode(Bool.self, forKey: .aiProcessing)
        onboardingComplete = try c.decode(Bool.self, forKey: .onboardingComplete)
        availableEquipmentIDsWasMissing = !c.contains(.availableEquipmentIDs)
    }
    func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(metadata, forKey: .metadata); try c.encode(goal, forKey: .goal)
        try c.encode(experience, forKey: .experience); try c.encode(equipment, forKey: .equipment)
        if !availableEquipmentIDsWasMissing { try c.encode(availableEquipmentIDs, forKey: .availableEquipmentIDs) }
        if !movementConditionsWasMissing { try c.encode(movementConditions, forKey: .movementConditions) }
        try c.encode(availableMinutes, forKey: .availableMinutes); try c.encode(limitations, forKey: .limitations)
        try c.encode(healthRead, forKey: .healthRead); try c.encode(cloudSync, forKey: .cloudSync)
        try c.encode(aiProcessing, forKey: .aiProcessing); try c.encode(onboardingComplete, forKey: .onboardingComplete)
    }
}

// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "SteadyCore",
    platforms: [.iOS(.v18), .macOS(.v15)],
    products: [.library(name: "SteadyCore", targets: ["SteadyCore"]), .library(name: "SteadyLive", targets: ["SteadyLive"])],
    dependencies: [.package(url: "https://github.com/supabase/supabase-swift.git", exact: "2.55.2")],
    targets: [
        .target(name: "SteadyCore", resources: [.copy("Resources/TrainingCollections")]),
        .target(name: "SteadyLive", dependencies: ["SteadyCore", .product(name: "Supabase", package: "supabase-swift")]),
        .testTarget(name: "SteadyLiveTests", dependencies: ["SteadyLive", "SteadyCore"]),
        .testTarget(name: "SteadyCoreTests", dependencies: ["SteadyCore"]),
        // Compile the exact app state source on macOS for fast orchestration tests.
        // The iOS App still has one App target and compiles this file normally.
        .target(name: "SteadyAppState", dependencies: ["SteadyCore"], path: "Steady",
            exclude: ["WorkoutViews.swift", "WorkoutNotifications.swift", "LowerBodyConditions.swift", "ExerciseTeachingDestination.swift", "AnimatedTrainingViews.swift", "TrainingAnimationArtwork.swift", "Assets.xcassets", "Steady.entitlements", "DesignSystem.swift", "Plans.swift", "RootView.swift", "SettingsOnboarding.swift", "SteadyApp.swift", "TrendsCoach.swift", "SproutView.swift", "AccountViews.swift", "UIReviewView.swift", "Fonts", "CloudConfig.plist", "EquipmentLessons.swift", "TrainingCollections.swift", "EquipmentArtwork.swift", "ChestPressArtwork.html", "LatPulldownArtwork.html", "CableRowArtwork.html", "LegPressArtwork.html", "ShoulderPressArtwork.html", "LegExtensionArtwork.html", "AbdominalCrunchArtwork.html", "BicepsCurlArtwork.html", "PecFlyArtwork.html", "HipAbductionArtwork.html", "GobletSquatArtwork.html", "DumbbellRowArtwork.html", "DumbbellShoulderPressArtwork.html", "EquipmentArtworkRuntime.js", "EquipmentMachineRenderer.js", "LegCurlArtwork.html"],
            sources: ["AppModel.swift", "TrendData.swift", "WorkoutState.swift"]),
        .testTarget(name: "SteadyAppStateTests", dependencies: ["SteadyAppState", "SteadyCore"])
    ]
)

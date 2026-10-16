import Foundation
import UserNotifications

@MainActor enum WorkoutNotifications {
    static let key = "workoutRestNotifications"
    static func setEnabled(_ enabled: Bool) async -> Bool {
        if !enabled { UserDefaults.standard.set(false, forKey: key); cancel(); return false }
        do {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound])
            UserDefaults.standard.set(granted, forKey: key); return granted
        } catch { return false }
    }
    static func cancel() { UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["steady.workout.rest"]) }
    static func update(deadline: Date?) {
        cancel()
        guard UserDefaults.standard.bool(forKey: key), let deadline, deadline.timeIntervalSinceNow > 0 else { return }
        let content = UNMutableNotificationContent(); content.title = "休息结束"; content.body = "准备好后再开始下一组。"; content.sound = .default
        let request = UNNotificationRequest(identifier: "steady.workout.rest", content: content,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: max(1, deadline.timeIntervalSinceNow), repeats: false))
        UNUserNotificationCenter.current().add(request) { _ in }
    }
}

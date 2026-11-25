import UIKit
import UserNotifications

/// Receives the push token from iOS, and opens the right screen when a
/// notification is tapped.
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        Task { await Notifications.shared.resume() }
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Task { await Notifications.shared.didRegister(deviceToken: deviceToken) }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        Notifications.shared.didFailToRegister()
    }

    // These use completion handlers, not the async versions: UIKit asserts that
    // the tap's handler finishes on the main thread, and an async delegate
    // method finishes on a background one, which crashes the app.

    /// Show the banner even while the app is open.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
    }

    /// One New Title opens its Title; several open the schedule, where the app starts anyway.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let slug = response.notification.request.content.userInfo["titleSlug"] as? String
        nonisolated(unsafe) let done = completionHandler
        DispatchQueue.main.async {
            if let slug { UIApplication.shared.open(AppLink.title(slug: slug)) }
            done()
        }
    }
}

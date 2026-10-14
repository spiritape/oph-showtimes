import Observation
import UIKit
import UserNotifications

/// New Title Notifications for this install. The app asks for permission only
/// when the person turns them on, then registers its push token with the
/// watcher as a Subscriber (docs/adr/0003).
@MainActor @Observable
final class Notifications {
    static let shared = Notifications()
    static let watcherURL = URL(string: "https://oph-showtimes-watcher.spiritapes.workers.dev")!

    private(set) var isOn = UserDefaults.standard.bool(forKey: "notificationsOn") {
        didSet { UserDefaults.standard.set(isOn, forKey: "notificationsOn") }
    }
    private(set) var isBusy = false
    /// Something to tell the person after they flip the switch.
    var message: String?

    private var token: String? = UserDefaults.standard.string(forKey: "pushToken") {
        didSet { UserDefaults.standard.set(token, forKey: "pushToken") }
    }

    /// Debug builds get tokens from Apple's sandbox; TestFlight and App Store builds from production.
    private static var environment: String {
        #if DEBUG
        "sandbox"
        #else
        "production"
        #endif
    }

    /// Turning on finishes in `didRegister` once the watcher has the token.
    func toggle() async {
        guard !isBusy else { return }
        if isOn {
            isBusy = true
            if let token { try? await post("/unsubscribe", ["apns": ["token": token]]) }
            isOn = false
            isBusy = false
            message = "Notifications are off."
            return
        }
        let granted = (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound])) ?? false
        guard granted else {
            message = "Notifications are turned off for Playhouse. You can allow them in Settings."
            return
        }
        isBusy = true
        UIApplication.shared.registerForRemoteNotifications()
    }

    /// At launch: keep the watcher's copy of the token current, or switch off
    /// if the person has since turned notifications off in Settings.
    func resume() async {
        guard isOn else { return }
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        if settings.authorizationStatus == .denied {
            if let token { try? await post("/unsubscribe", ["apns": ["token": token]]) }
            isOn = false
        } else {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }

    func didRegister(deviceToken: Data) async {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        if let old = self.token, old != token { try? await post("/unsubscribe", ["apns": ["token": old]]) }
        self.token = token
        // Either the person just asked to turn on, or a launch is refreshing the token.
        let turningOn = isBusy
        guard turningOn || isOn else { return }
        defer { isBusy = false }
        do {
            try await post("/subscribe", ["apns": ["token": token, "environment": Self.environment]])
            isOn = true
            if turningOn { message = "You'll get a notification when a new film or live show is announced." }
        } catch {
            if turningOn { message = "Couldn't turn on notifications. Please try again." }
        }
    }

    func didFailToRegister() {
        guard isBusy else { return }
        isBusy = false
        message = "Couldn't turn on notifications. Please try again."
    }

    private func post(_ path: String, _ body: [String: [String: String]]) async throws {
        var request = URLRequest(url: Self.watcherURL.appending(path: path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (_, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
    }
}

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

    /// Show the banner even while the app is open.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }

    /// One New Title opens its Title; several open the schedule, where the app starts anyway.
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        guard let slug = response.notification.request.content.userInfo["titleSlug"] as? String else { return }
        await MainActor.run { UIApplication.shared.open(AppLink.title(slug: slug)) }
    }
}

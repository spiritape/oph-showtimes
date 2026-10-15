import SwiftUI

@main
struct PlayhouseApp: App {
    @UIApplicationDelegateAdaptor private var appDelegate: AppDelegate
    @State private var store = FeedStore()
    @AppStorage(Appearance.storageKey) private var appearance = Appearance.dark
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            ScheduleView()
                .environment(store)
                .environment(Notifications.shared)
                // Set on the windows rather than with preferredColorScheme, which
                // doesn't update open sheets or reliably return to the system setting.
                .onChange(of: appearance, initial: true) { _, appearance in appearance.apply() }
                .onChange(of: scenePhase, initial: true) { _, phase in
                    if phase == .active { Task { await store.refresh() } }
                }
        }
    }
}

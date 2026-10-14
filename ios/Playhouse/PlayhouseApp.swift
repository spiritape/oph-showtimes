import SwiftUI

@main
struct PlayhouseApp: App {
    @UIApplicationDelegateAdaptor private var appDelegate: AppDelegate
    @State private var store = FeedStore()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            ScheduleView()
                .environment(store)
                .environment(Notifications.shared)
                .onChange(of: scenePhase, initial: true) { _, phase in
                    if phase == .active { Task { await store.refresh() } }
                }
        }
    }
}

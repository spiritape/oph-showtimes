import SwiftUI

@main
struct PlayhouseApp: App {
    @State private var store = FeedStore()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            ScheduleView()
                .environment(store)
                .onChange(of: scenePhase, initial: true) { _, phase in
                    if phase == .active { Task { await store.refresh() } }
                }
        }
    }
}

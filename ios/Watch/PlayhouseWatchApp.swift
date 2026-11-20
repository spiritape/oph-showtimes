import SwiftUI
import WidgetKit

/// The Apple Watch app (docs/adr/0004): the upcoming schedule at a glance.
/// Tickets, calendars and Film Requests stay on the iPhone, reached by Handoff.
@main
struct PlayhouseWatchApp: App {
    @State private var store = WatchFeedStore()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            Group {
                #if DEBUG
                if CommandLine.arguments.contains("-complications") {
                    ComplicationGallery(feed: store.feed)
                } else {
                    WatchScheduleView()
                }
                #else
                WatchScheduleView()
                #endif
            }
            .environment(store)
            .onChange(of: scenePhase, initial: true) { _, phase in
                if phase == .active { Task { await store.refresh() } }
            }
        }
    }
}

/// The schedule on the watch: the watch's own saved Feed, refreshed from the site.
@MainActor @Observable
final class WatchFeedStore {
    private(set) var feed: Feed? = FeedCache.load()
    private(set) var isLoading = false
    /// The last refresh failed; what's showing (if anything) is the saved Feed.
    private(set) var failed = false

    func refresh() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            let (latest, data) = try await FeedCache.fetch()
            failed = false
            guard latest != feed else { return }
            feed = latest
            FeedCache.save(data)
            // The complications read the same saved Feed.
            WidgetCenter.shared.reloadAllTimelines()
        } catch {
            failed = true
        }
    }
}

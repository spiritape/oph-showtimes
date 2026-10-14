import Foundation
import Observation
import WidgetKit

/// Loads the Feed, keeping the last good copy (shared with the widgets) so the
/// schedule still shows offline.
@MainActor @Observable
final class FeedStore {
    private(set) var feed: Feed?
    private(set) var isLoading = false
    /// Set when the latest refresh failed; the saved Feed (if any) still shows.
    private(set) var error: String?

    private let cacheFile: URL
    private let session: URLSession

    init(cacheFile: URL = FeedCache.file, session: URLSession = .shared) {
        self.cacheFile = cacheFile
        self.session = session
        feed = FeedCache.load(from: cacheFile)
    }

    func refresh() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            let (latest, data) = try await FeedCache.fetch(session: session)
            let changed = latest.titles != feed?.titles
            feed = latest
            error = nil
            FeedCache.save(data, to: cacheFile)
            if changed { WidgetCenter.shared.reloadAllTimelines() }
        } catch {
            self.error = feed == nil ? "Couldn't load the schedule. Check your connection and pull to retry." : "Showing the last saved schedule."
        }
    }
}

import Foundation
import Observation

/// Loads the Feed, keeping the last good copy on disk so the schedule still
/// shows offline.
@MainActor @Observable
final class FeedStore {
    private(set) var feed: Feed?
    private(set) var isLoading = false
    /// Set when the latest refresh failed; the saved Feed (if any) still shows.
    private(set) var error: String?

    private let cacheFile: URL
    private let session: URLSession

    init(cacheFile: URL = FeedStore.defaultCacheFile, session: URLSession = .shared) {
        self.cacheFile = cacheFile
        self.session = session
        if let data = try? Data(contentsOf: cacheFile) {
            feed = try? Feed.decode(data)
        }
    }

    static var defaultCacheFile: URL {
        URL.applicationSupportDirectory.appending(path: "schedule.json")
    }

    func refresh() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            var request = URLRequest(url: Feed.url)
            request.cachePolicy = .reloadIgnoringLocalCacheData
            let (data, response) = try await session.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
            feed = try Feed.decode(data)
            error = nil
            try? FileManager.default.createDirectory(at: cacheFile.deletingLastPathComponent(), withIntermediateDirectories: true)
            try? data.write(to: cacheFile, options: .atomic)
        } catch {
            self.error = feed == nil ? "Couldn't load the schedule. Check your connection and pull to retry." : "Showing the last saved schedule."
        }
    }
}

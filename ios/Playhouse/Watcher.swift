import Foundation

/// The watcher (worker/), which keeps the Subscribers for New Title Notifications
/// and takes Film Requests.
enum Watcher {
    static let url = URL(string: "https://oph-showtimes-watcher.spiritapes.workers.dev")!

    /// Sends a JSON body to one of the watcher's endpoints. Anything but a 200 is an error.
    static func post(_ path: String, json body: Data) async throws {
        var request = URLRequest(url: url.appending(path: path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        let (_, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
    }
}

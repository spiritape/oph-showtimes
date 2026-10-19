import Foundation
import Observation

/// A film from TMDB, as found by search or remembered in "Your requests".
struct Film: Codable, Hashable, Identifiable, Sendable {
    var tmdbId: Int
    var title: String
    var year: String?
    var posterUrl: URL?
    var id: Int { tmdbId }
}

/// A film in the most requested list. How many asked for it stays private to the Playhouse.
struct RankedFilm: Decodable, Identifiable, Sendable {
    var tmdbId: Int
    var title: String
    var year: String?
    var posterUrl: URL?
    var id: Int { tmdbId }
    var film: Film { Film(tmdbId: tmdbId, title: title, year: year, posterUrl: posterUrl) }
}

/// Film Requests (see CONTEXT.md): searching films and requesting the ones
/// someone would like the Playhouse to show. Everyone sees the most requested
/// few; this install remembers its own requests to show in "Your requests".
@MainActor @Observable
final class FilmRequests {
    static let shared = FilmRequests()
    static let credit = "This product uses the TMDB API but is not endorsed or certified by TMDB."

    private(set) var results: [Film] = []
    /// The most requested films across everyone, most requested first.
    private(set) var top: [RankedFilm] = []
    private(set) var isSearching = false
    /// This install's requests, most recent first.
    private(set) var mine: [Film] {
        didSet { UserDefaults.standard.set(try? JSONEncoder().encode(mine), forKey: "filmRequests") }
    }
    /// Films with a request or withdrawal on its way to the watcher.
    private(set) var pending: Set<Int> = []
    var message: String?

    /// Counts this install once per film; random, and not tied to the person.
    private let installId: String

    init() {
        let defaults = UserDefaults.standard
        if let id = defaults.string(forKey: "installId") {
            installId = id
        } else {
            installId = UUID().uuidString
            defaults.set(installId, forKey: "installId")
        }
        mine = defaults.data(forKey: "filmRequests").flatMap { try? JSONDecoder().decode([Film].self, from: $0) } ?? []
    }

    func isRequested(_ film: Film) -> Bool { mine.contains { $0.tmdbId == film.tmdbId } }

    func loadTop() async {
        let url = Notifications.watcherURL.appending(path: "requests/top")
        guard let (data, response) = try? await URLSession.shared.data(from: url),
              (response as? HTTPURLResponse)?.statusCode == 200,
              let decoded = try? JSONDecoder().decode(TopResponse.self, from: data)
        else { return } // Keep what's showing; the list is a nice-to-have.
        top = decoded.films
    }

    func search(_ query: String) async {
        let query = query.trimmingCharacters(in: .whitespaces)
        guard query.count >= 2 else { results = []; return }
        isSearching = true
        defer { isSearching = false }
        var url = Notifications.watcherURL.appending(path: "films/search")
        url.append(queryItems: [URLQueryItem(name: "q", value: query)])
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
            results = try JSONDecoder().decode(SearchResponse.self, from: data).films
        } catch is CancellationError {
            // A newer search replaced this one.
        } catch {
            if !Task.isCancelled { message = "Couldn't search right now. Please try again." }
        }
    }

    func request(_ film: Film) async {
        guard !isRequested(film), !pending.contains(film.tmdbId) else { return }
        pending.insert(film.tmdbId)
        defer { pending.remove(film.tmdbId) }
        do {
            try await post("requests", film)
            mine.insert(film, at: 0)
            await loadTop()
        } catch {
            message = "Couldn't send your request. Please try again."
        }
    }

    func withdraw(_ film: Film) async {
        pending.insert(film.tmdbId)
        defer { pending.remove(film.tmdbId) }
        do {
            try await post("requests/withdraw", film)
            mine.removeAll { $0.tmdbId == film.tmdbId }
            await loadTop()
        } catch {
            message = "Couldn't withdraw your request. Please try again."
        }
    }

    private struct SearchResponse: Decodable { var films: [Film] }
    private struct TopResponse: Decodable { var films: [RankedFilm] }
    private struct RequestBody: Encodable { var installId: String; var tmdbId: Int }

    private func post(_ path: String, _ film: Film) async throws {
        var request = URLRequest(url: Notifications.watcherURL.appending(path: path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(RequestBody(installId: installId, tmdbId: film.tmdbId))
        let (_, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
    }
}

import Foundation

/// The schedule as published by the site's build at `api/v1/schedule.json`
/// (src/feed.ts). New fields may appear; existing ones won't change.
struct Feed: Codable, Equatable, Sendable {
    static let url = URL(string: "https://ojaishowtimes.com/api/v1/schedule.json")!

    var version: Int
    var generatedAt: Date
    var theater: Theater
    /// Titles with at least one upcoming Showtime, soonest first.
    var titles: [Title]

    static func decode(_ data: Data) throws -> Feed {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let text = try decoder.singleValueContainer().decode(String.self)
            if let date = (try? Date(text, strategy: .iso8601.year().month().day().time(includingFractionalSeconds: true)))
                ?? (try? Date(text, strategy: .iso8601)) {
                return date
            }
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Not an ISO date: \(text)"))
        }
        return try decoder.decode(Feed.self, from: data)
    }
}

struct Theater: Codable, Equatable, Sendable {
    var name: String
    var address: String
    var phone: String
    /// Showtimes are shown in the theater's time, wherever the phone is.
    var timeZone: String
}

/// A Film or Live Show: anything that has Showtimes.
struct Title: Codable, Equatable, Hashable, Identifiable, Sendable {
    enum Kind: String, Codable, Sendable { case film, liveShow }

    var key: String
    var slug: String
    var name: String
    var subtitle: String?
    var kind: Kind
    var categoryLabel: String
    var year: String?
    var director: String?
    var runtime: String?
    var rating: String?
    var synopsis: String?
    var imageUrl: URL?
    var thumbnailUrl: URL?
    var livestreamUrl: URL?
    /// The Title's page on the site, for sharing.
    var url: URL
    /// Upcoming only, sorted by start time.
    var showtimes: [Showtime]

    var id: String { key }
}

/// One scheduled occurrence of a Title.
struct Showtime: Codable, Equatable, Hashable, Identifiable, Sendable {
    struct Booking: Codable, Equatable, Hashable, Sendable {
        var label: String
        var url: URL
        var free: Bool
    }

    var id: String
    var startsAt: Date
    /// Estimated from the running time.
    var endsAt: Date
    var price: String?
    var booking: Booking?
}

/// A Showtime together with the Title it belongs to.
struct ScheduledShowtime: Identifiable, Hashable, Sendable {
    var title: Title
    var showtime: Showtime
    var id: String { showtime.id }
}

/// Which Titles the schedule shows, matching the site's filters.
enum ScheduleFilter: String, CaseIterable, Identifiable, Sendable {
    case everything, films, liveShows
    var id: Self { self }

    var label: String {
        switch self {
        case .everything: "Everything"
        case .films: "Films"
        case .liveShows: "Live shows"
        }
    }

    func includes(_ title: Title) -> Bool {
        switch self {
        case .everything: true
        case .films: title.kind == .film
        case .liveShows: title.kind == .liveShow
        }
    }
}

/// The Showtimes of one day, in the theater's time zone.
struct ScheduleDay: Identifiable, Sendable {
    var day: DateComponents
    var showtimes: [ScheduledShowtime]
    var id: String { "\(day.year!)-\(day.month!)-\(day.day!)" }
}

extension Feed {
    var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: theater.timeZone) ?? .current
        return calendar
    }

    /// Every Showtime still listed at `now`, soonest first. Like the site, a
    /// Showtime stays listed until 30 minutes after it starts.
    func listed(_ filter: ScheduleFilter = .everything, now: Date = .now) -> [ScheduledShowtime] {
        titles
            .filter(filter.includes)
            .flatMap { title in title.showtimes.map { ScheduledShowtime(title: title, showtime: $0) } }
            .filter { $0.showtime.startsAt > now.addingTimeInterval(-Showtime.listedAfterStart) }
            .sorted { $0.showtime.startsAt < $1.showtime.startsAt }
    }

    /// Listed Showtimes grouped by day in the theater's time zone.
    func days(_ filter: ScheduleFilter, now: Date = .now) -> [ScheduleDay] {
        let calendar = self.calendar
        var days: [ScheduleDay] = []
        for item in listed(filter, now: now) {
            let day = calendar.dateComponents([.year, .month, .day], from: item.showtime.startsAt)
            if days.last?.day == day {
                days[days.count - 1].showtimes.append(item)
            } else {
                days.append(ScheduleDay(day: day, showtimes: [item]))
            }
        }
        return days
    }
}

extension Showtime {
    /// How long a Showtime stays listed after it starts, like the site.
    static let listedAfterStart: TimeInterval = 30 * 60
}

extension Feed {
    /// "Today", "Tomorrow", or the weekday, in the theater's time zone.
    func dayLabel(_ date: Date, now: Date = .now, short: Bool = false) -> String {
        let calendar = self.calendar
        if calendar.isDate(date, inSameDayAs: now) { return "Today" }
        if let tomorrow = calendar.date(byAdding: .day, value: 1, to: now), calendar.isDate(date, inSameDayAs: tomorrow) {
            return "Tomorrow"
        }
        var style = short
            ? Date.FormatStyle.dateTime.weekday(.abbreviated).month(.abbreviated).day()
            : Date.FormatStyle.dateTime.weekday(.wide).month(.abbreviated).day()
        style.timeZone = calendar.timeZone
        return date.formatted(style)
    }

    /// "7:30 PM" in the theater's time zone.
    func timeLabel(_ date: Date) -> String {
        var style = Date.FormatStyle.dateTime.hour().minute()
        style.timeZone = calendar.timeZone
        return date.formatted(style)
    }
}

/// The last good Feed, saved where both the app and its widgets can read it.
enum FeedCache {
    static let appGroup = "group.com.ojaishowtimes.app"

    static var file: URL {
        let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)
            ?? URL.applicationSupportDirectory
        return container.appending(path: "schedule.json")
    }

    static func load(from file: URL = file) -> Feed? {
        (try? Data(contentsOf: file)).flatMap { try? Feed.decode($0) }
    }

    static func save(_ data: Data, to file: URL = file) {
        try? FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? data.write(to: file, options: .atomic)
    }

    /// Fetches the latest Feed, returning it with the raw data to save.
    static func fetch(session: URLSession = .shared) async throws -> (Feed, Data) {
        var request = URLRequest(url: Feed.url)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.timeoutInterval = 20
        let (data, response) = try await session.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
        return (try Feed.decode(data), data)
    }
}

/// Links into the app, e.g. from a widget: ojaiplayhouse://title/<slug>
enum AppLink {
    static let scheme = "ojaiplayhouse"

    static func title(_ title: Title) -> URL {
        URL(string: "\(scheme)://title/\(title.slug)")!
    }

    /// The Title slug a link points at, if any.
    static func titleSlug(_ url: URL) -> String? {
        guard url.scheme == scheme, url.host() == "title" else { return nil }
        return url.pathComponents.dropFirst().first
    }
}

extension Feed {
    /// When what's listed (or how it's labeled) changes without a new Feed: as
    /// each Showtime drops off the list, and at midnight when "Tomorrow" becomes "Today".
    func listChanges(after now: Date, within interval: TimeInterval) -> [Date] {
        let horizon = now.addingTimeInterval(interval)
        let dropOffs = listed(now: now).map { $0.showtime.startsAt.addingTimeInterval(Showtime.listedAfterStart) }
        let midnights = (1...2).compactMap { calendar.date(byAdding: .day, value: $0, to: calendar.startOfDay(for: now)) }
        return Set(dropOffs + midnights).filter { $0 > now && $0 <= horizon }.sorted()
    }
}

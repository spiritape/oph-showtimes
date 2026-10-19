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
    /// Titles that played in the last 60 days, most recent first, each with only
    /// its played Showtimes. Missing from Feeds saved before it was added.
    var past: [Title]?

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
    /// Missing from Feeds published before it was added.
    var soldOut: Bool?

    /// Sold out, going by the feed, or by the price text for older saved Feeds.
    var isSoldOut: Bool {
        soldOut ?? (price?.range(of: #"\bsold[\s-]*out\b"#, options: [.regularExpression, .caseInsensitive]) != nil)
    }

    /// The price as written, without the sold-out note (shown as a badge instead).
    var displayPrice: String? {
        let lines = (price ?? "")
            .split(separator: "\n")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { $0.range(of: #"^sold[\s-]*out\W*$"#, options: [.regularExpression, .caseInsensitive]) == nil && !$0.isEmpty }
        return lines.isEmpty ? nil : lines.joined(separator: " · ")
    }
}

/// A Showtime together with the Title it belongs to.
struct ScheduledShowtime: Identifiable, Hashable, Sendable {
    var title: Title
    var showtime: Showtime
    var id: String { showtime.id }
}

/// Which Titles the schedule shows, matching the site's filters.
enum ScheduleFilter: String, CaseIterable, Identifiable, Sendable {
    /// Past isn't a kind of Title: the schedule shows `Feed.pastDays` for it.
    case everything, films, liveShows, past
    var id: Self { self }

    var label: String {
        switch self {
        case .everything: "All"
        case .films: "Movies"
        case .liveShows: "Live Shows"
        case .past: "Past"
        }
    }

    func includes(_ title: Title) -> Bool {
        switch self {
        case .everything: true
        case .films: title.kind == .film
        case .liveShows: title.kind == .liveShow
        case .past: false
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
        if let yesterday = calendar.date(byAdding: .day, value: -1, to: now), calendar.isDate(date, inSameDayAs: yesterday) {
            return "Yesterday"
        }
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
        Self.title(slug: title.slug)
    }

    static func title(slug: String) -> URL {
        URL(string: "\(scheme)://title/\(slug)")!
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

extension Feed {
    /// What has played recently, most recent first, grouped by day in the
    /// theater's time zone. Adds Showtimes that dropped off the schedule since
    /// the Feed was published, so nothing goes missing between the two lists.
    func pastDays(now: Date = .now) -> [ScheduleDay] {
        let cutoff = now.addingTimeInterval(-Showtime.listedAfterStart)
        let dropped = titles.flatMap { title in
            title.showtimes.filter { $0.startsAt <= cutoff }.map { ScheduledShowtime(title: title, showtime: $0) }
        }
        let published = (past ?? []).flatMap { title in
            title.showtimes.map { ScheduledShowtime(title: title, showtime: $0) }
        }
        var seen = Set<String>()
        let played = (dropped + published)
            .filter { seen.insert($0.id).inserted }
            .sorted { $0.showtime.startsAt > $1.showtime.startsAt }
        let calendar = self.calendar
        var days: [ScheduleDay] = []
        for item in played {
            let day = calendar.dateComponents([.year, .month, .day], from: item.showtime.startsAt)
            if days.last?.day == day {
                days[days.count - 1].showtimes.append(item)
            } else {
                days.append(ScheduleDay(day: day, showtimes: [item]))
            }
        }
        return days
    }

    /// The Title to open from the Past list: the current one if it's still on
    /// the schedule, otherwise the past one without its played Showtimes.
    func titleToOpen(_ title: Title) -> Title {
        titles.first { $0.key == title.key } ?? { var finished = title; finished.showtimes = []; return finished }()
    }
}

extension Title {
    /// Whether a search matches this Title: every word must appear in its name,
    /// subtitle, category or director, ignoring case and accents.
    func matches(_ query: String) -> Bool {
        let words = query.split(whereSeparator: \.isWhitespace)
        guard !words.isEmpty else { return true }
        let haystack = [name, subtitle, categoryLabel, director].compactMap(\.self).joined(separator: " ")
        return words.allSatisfy { haystack.range(of: $0, options: [.caseInsensitive, .diacriticInsensitive]) != nil }
    }
}

extension [ScheduleDay] {
    /// Only the Showtimes whose Title matches the search, dropping days left empty.
    func matching(_ query: String) -> [ScheduleDay] {
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty else { return self }
        return compactMap { day in
            var day = day
            day.showtimes = day.showtimes.filter { $0.title.matches(query) }
            return day.showtimes.isEmpty ? nil : day
        }
    }
}


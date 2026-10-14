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

    /// Every Showtime still listed at `now` (until 30 minutes after it starts,
    /// like the site), grouped by day in the theater's time zone.
    func days(_ filter: ScheduleFilter, now: Date = .now) -> [ScheduleDay] {
        let cutoff = now.addingTimeInterval(-30 * 60)
        let listed = titles
            .filter(filter.includes)
            .flatMap { title in title.showtimes.map { ScheduledShowtime(title: title, showtime: $0) } }
            .filter { $0.showtime.startsAt > cutoff }
            .sorted { $0.showtime.startsAt < $1.showtime.startsAt }
        let calendar = self.calendar
        var days: [ScheduleDay] = []
        for item in listed {
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

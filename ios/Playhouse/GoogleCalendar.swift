import Foundation

/// Google Calendar's "new event" screen, prefilled with a Showtime, like the
/// website's link (src/showtime.ts googleCalendarUrl). Opens the Google
/// Calendar app if it's installed, otherwise the web page.
enum GoogleCalendar {
    static func url(for item: ScheduledShowtime, theater: Theater) -> URL {
        let showtime = item.showtime
        let details = [
            showtime.isSoldOut ? "Sold out" : nil,
            showtime.displayPrice,
            showtime.booking.map { "\($0.label): \($0.url.absoluteString)" },
            item.title.url.absoluteString,
        ].compactMap(\.self).joined(separator: "\n")
        var components = URLComponents(string: "https://calendar.google.com/calendar/render")!
        components.queryItems = [
            URLQueryItem(name: "action", value: "TEMPLATE"),
            URLQueryItem(name: "text", value: item.title.name),
            URLQueryItem(name: "dates", value: "\(stamp(showtime.startsAt))/\(stamp(showtime.endsAt))"),
            URLQueryItem(name: "location", value: "\(theater.name), \(theater.address)"),
            URLQueryItem(name: "details", value: details),
        ]
        return components.url!
    }

    /// UTC in the compact form calendars use, e.g. 20260929T020000Z. The "Z"
    /// matters: without it Google reads the time in the viewer's own zone.
    static func stamp(_ date: Date) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = .gmt
        let c = calendar.dateComponents([.year, .month, .day, .hour, .minute, .second], from: date)
        return String(format: "%04d%02d%02dT%02d%02d%02dZ", c.year!, c.month!, c.day!, c.hour!, c.minute!, c.second!)
    }
}

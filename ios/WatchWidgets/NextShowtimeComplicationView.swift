import SwiftUI
import WidgetKit

// Shared by the complications and, in debug builds, the watch app's gallery
// of them (simulators can't add complications to a watch face from the command line).

struct NextShowtimeEntry: TimelineEntry {
    var date: Date
    var feed: Feed?

    var next: ScheduledShowtime? { feed?.listed(now: date).first }
}

struct NextShowtimeComplicationView: View {
    let entry: NextShowtimeEntry
    let family: WidgetFamily

    var body: some View {
        if let feed = entry.feed, let next = entry.next {
            showing(next, feed: feed).widgetURL(AppLink.title(next.title))
        } else {
            empty
        }
    }

    @ViewBuilder private func showing(_ item: ScheduledShowtime, feed: Feed) -> some View {
        let start = item.showtime.startsAt
        let day = feed.dayLabel(start, now: entry.date, short: true)
        let time = feed.timeLabel(start)
        switch family {
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 0) {
                Text("\(day) · \(time)").font(.headline).widgetAccentable()
                Text(item.title.name).lineLimit(2)
                if item.showtime.isSoldOut {
                    Text("Sold out").foregroundStyle(.secondary)
                } else {
                    Text(item.title.categoryLabel).foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        case .accessoryInline:
            Text("\(time) \(item.title.name)")
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: -2) {
                    Text(weekday(start, feed: feed))
                        .font(.system(size: 11, weight: .semibold))
                        .widgetAccentable()
                    Text(clock(time).digits)
                        .font(.system(size: 17, weight: .semibold))
                        .minimumScaleFactor(0.6)
                    if let period = clock(time).period {
                        Text(period).font(.system(size: 10, weight: .medium))
                    }
                }
                .padding(4)
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("\(item.title.name), \(day) at \(time)")
        default: // accessoryCorner
            ZStack {
                AccessoryWidgetBackground()
                kindSymbol(item.title).font(.system(size: 20, weight: .semibold)).widgetAccentable()
            }
            .widgetLabel { Text("\(time) \(item.title.name)") }
        }
    }

    @ViewBuilder private var empty: some View {
        let message = entry.feed == nil ? "Open Playhouse to load the schedule." : "Nothing scheduled right now."
        switch family {
        case .accessoryRectangular:
            VStack(alignment: .leading) {
                Text("Ojai Playhouse").font(.headline).widgetAccentable()
                Text(message).foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        case .accessoryInline:
            Text("Ojai Playhouse")
        default:
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: "film").font(.system(size: 20, weight: .semibold))
            }
            .accessibilityLabel(message)
        }
    }

    private func kindSymbol(_ title: Title) -> Image {
        Image(systemName: title.kind == .film ? "film" : "theatermasks")
    }

    /// "SAT", in the theater's time zone.
    private func weekday(_ date: Date, feed: Feed) -> String {
        var style = Date.FormatStyle.dateTime.weekday(.abbreviated)
        style.timeZone = feed.calendar.timeZone
        return date.formatted(style).uppercased()
    }

    /// "7:00 PM" split into "7:00" and "PM" (no period in 24-hour locales).
    private func clock(_ time: String) -> (digits: String, period: String?) {
        let parts = time.split(whereSeparator: \.isWhitespace).map(String.init)
        return parts.count > 1 ? (parts.dropLast().joined(separator: " "), parts.last) : (time, nil)
    }
}

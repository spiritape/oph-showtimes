import SwiftUI
import WidgetKit

@main
struct PlayhouseComplications: WidgetBundle {
    var body: some Widget {
        NextShowtimeComplication()
    }
}

/// The next listed Showtime, on a watch face or in the Smart Stack.
struct NextShowtimeComplication: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "NextShowtime", provider: NextShowtimeProvider()) { entry in
            NextShowtimeFamilyView(entry: entry)
                .containerBackground(.background, for: .widget)
        }
        .configurationDisplayName("Next at the Playhouse")
        .description("The next Showtime at the Ojai Playhouse.")
        .supportedFamilies([.accessoryRectangular, .accessoryInline, .accessoryCircular, .accessoryCorner])
    }
}

struct NextShowtimeProvider: TimelineProvider {
    func placeholder(in context: Context) -> NextShowtimeEntry {
        NextShowtimeEntry(date: .now, feed: FeedCache.load())
    }

    func getSnapshot(in context: Context, completion: @escaping @Sendable (NextShowtimeEntry) -> Void) {
        completion(NextShowtimeEntry(date: .now, feed: FeedCache.load()))
    }

    func getTimeline(in context: Context, completion: @escaping @Sendable (Timeline<NextShowtimeEntry>) -> Void) {
        Task {
            let now = Date.now
            // The watch's saved Feed, refreshed if the site can be reached.
            var feed = FeedCache.load()
            if let (latest, data) = try? await FeedCache.fetch() {
                feed = latest
                FeedCache.save(data)
            }
            // A new entry each time the next Showtime drops off the list, or the day changes.
            let dates = [now] + (feed?.listChanges(after: now, within: 24 * 60 * 60) ?? [])
            let entries = dates.map { NextShowtimeEntry(date: $0, feed: feed) }
            completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(60 * 60))))
        }
    }
}

/// Reads the family from WidgetKit; the watch app's debug gallery passes it directly.
struct NextShowtimeFamilyView: View {
    @Environment(\.widgetFamily) private var family
    let entry: NextShowtimeEntry

    var body: some View {
        NextShowtimeComplicationView(entry: entry, family: family)
    }
}

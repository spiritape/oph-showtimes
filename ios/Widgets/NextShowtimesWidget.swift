import SwiftUI
import WidgetKit

@main
struct PlayhouseWidgets: WidgetBundle {
    var body: some Widget {
        NextShowtimesWidget()
    }
}

/// The next upcoming Showtimes, whatever day they're on.
struct NextShowtimesWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "NextShowtimes", provider: NextShowtimesProvider()) { entry in
            NextShowtimesView(entry: entry)
                .containerBackground(.background, for: .widget)
        }
        .configurationDisplayName("Next at the Playhouse")
        .description("The next Showtimes at the Ojai Playhouse.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryInline])
    }
}

struct NextShowtimesEntry: TimelineEntry {
    var date: Date
    var feed: Feed?
    /// Thumbnails by Title key, downloaded ahead because widgets can't load images themselves.
    var thumbnails: [String: Data] = [:]

    var upcoming: [ScheduledShowtime] { feed?.listed(now: date) ?? [] }
}

struct NextShowtimesProvider: TimelineProvider {
    /// How many Showtimes the largest widget shows.
    static let shown = 3

    func placeholder(in context: Context) -> NextShowtimesEntry {
        NextShowtimesEntry(date: .now, feed: FeedCache.load())
    }

    func getSnapshot(in context: Context, completion: @escaping @Sendable (NextShowtimesEntry) -> Void) {
        completion(NextShowtimesEntry(date: .now, feed: FeedCache.load()))
    }

    func getTimeline(in context: Context, completion: @escaping @Sendable (Timeline<NextShowtimesEntry>) -> Void) {
        let includeImages = !context.family.isAccessory
        Task {
            completion(await Self.timeline(now: .now, includeImages: includeImages))
        }
    }

    static func timeline(now: Date, includeImages: Bool) async -> Timeline<NextShowtimesEntry> {
        var feed = FeedCache.load()
        if let (latest, data) = try? await FeedCache.fetch() {
            feed = latest
            FeedCache.save(data)
        }
        var thumbnails: [String: Data] = [:]
        if includeImages, let feed {
            thumbnails = await downloadThumbnails(for: feed.listed(now: now).prefix(shown + 2).map(\.title))
        }
        let dates = [now] + (feed?.listChanges(after: now, within: 24 * 60 * 60) ?? [])
        let entries = dates.map { NextShowtimesEntry(date: $0, feed: feed, thumbnails: thumbnails) }
        return Timeline(entries: entries, policy: .after(now.addingTimeInterval(60 * 60)))
    }

    private static func downloadThumbnails(for titles: [Title]) async -> [String: Data] {
        await withTaskGroup(of: (String, Data?).self) { group in
            for title in Set(titles) {
                guard let url = title.thumbnailUrl ?? title.imageUrl else { continue }
                group.addTask { (title.key, try? await URLSession.shared.data(from: url).0) }
            }
            var result: [String: Data] = [:]
            for await (key, data) in group { result[key] = data }
            return result
        }
    }
}

private extension WidgetFamily {
    var isAccessory: Bool { [.accessoryRectangular, .accessoryInline, .accessoryCircular].contains(self) }
}

struct NextShowtimesView: View {
    @Environment(\.widgetFamily) private var family
    let entry: NextShowtimesEntry

    var body: some View {
        let upcoming = entry.upcoming
        if let feed = entry.feed, let next = upcoming.first {
            switch family {
            case .systemMedium: medium(Array(upcoming.prefix(NextShowtimesProvider.shown)), feed: feed)
            case .accessoryRectangular: rectangular(next, feed: feed)
            case .accessoryInline: Text("\(feed.timeLabel(next.showtime.startsAt)) \(next.title.name)")
            default: small(next, feed: feed)
            }
        } else {
            Text(entry.feed == nil ? "Open the app to load the schedule." : "Nothing scheduled right now.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private func when(_ item: ScheduledShowtime, feed: Feed) -> String {
        "\(feed.dayLabel(item.showtime.startsAt, now: entry.date, short: true)) · \(feed.timeLabel(item.showtime.startsAt))"
    }

    private func small(_ item: ScheduledShowtime, feed: Feed) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            thumbnail(item.title)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            Text(when(item, feed: feed))
                .font(.caption.weight(.semibold))
                .foregroundStyle(Color("AccentColor"))
            Text(item.title.name)
                .font(.subheadline.weight(.semibold))
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .widgetURL(AppLink.title(item.title))
    }

    private func medium(_ items: [ScheduledShowtime], feed: Feed) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Ojai Playhouse").font(.caption.weight(.semibold)).foregroundStyle(.secondary)
            ForEach(items) { item in
                Link(destination: AppLink.title(item.title)) {
                    HStack(spacing: 10) {
                        thumbnail(item.title).frame(width: 48, height: 32)
                        VStack(alignment: .leading, spacing: 0) {
                            Text(item.title.name).font(.subheadline.weight(.semibold)).lineLimit(1)
                            Text(when(item, feed: feed)).font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer(minLength: 0)
                    }
                }
            }
            Spacer(minLength: 0)
        }
    }

    private func rectangular(_ item: ScheduledShowtime, feed: Feed) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(when(item, feed: feed)).font(.headline).widgetAccentable()
            Text(item.title.name).lineLimit(1)
            Text(item.title.categoryLabel).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .widgetURL(AppLink.title(item.title))
    }

    @ViewBuilder private func thumbnail(_ title: Title) -> some View {
        if let data = entry.thumbnails[title.key], let image = UIImage(data: data) {
            Color.clear.overlay {
                Image(uiImage: image).resizable().aspectRatio(contentMode: .fill)
            }
            .clipShape(.rect(cornerRadius: 6))
        } else {
            RoundedRectangle(cornerRadius: 6).fill(.quaternary)
        }
    }
}

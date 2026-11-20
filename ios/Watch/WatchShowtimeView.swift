import SwiftUI

/// One Showtime: what it is and when, its other upcoming Showtimes, and a Handoff
/// to the iPhone app for tickets and the calendar.
struct WatchShowtimeView: View {
    @Environment(WatchFeedStore.self) private var store
    let item: ScheduledShowtime

    var body: some View {
        let title = item.title
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                if let url = title.thumbnailUrl ?? title.imageUrl {
                    AsyncImage(url: url) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color.secondary.opacity(0.2)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 96)
                    .clipShape(.rect(cornerRadius: 10))
                    .accessibilityHidden(true)
                }

                Text(title.name).font(.headline)
                if let feed = store.feed {
                    Text(when(item.showtime, feed: feed))
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.accentColor)
                }
                Text(details(title))
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                HStack(spacing: 6) {
                    WatchBookingBadge(showtime: item.showtime)
                    if let price = item.showtime.displayPrice { Text(price).foregroundStyle(.secondary) }
                }
                .font(.footnote)

                // Handoff: the Title shows at the bottom of the iPhone's App Switcher.
                Label("For tickets, open the App Switcher on your iPhone and tap Playhouse.", systemImage: "iphone")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding(.top, 4)

                let others = title.showtimes.filter { $0.id != item.showtime.id && !$0.hasPlayed() }
                if let feed = store.feed, !others.isEmpty {
                    Text("Also showing").font(.headline).padding(.top, 4)
                    ForEach(others) { showtime in
                        HStack(spacing: 6) {
                            Text(when(showtime, feed: feed))
                            WatchBookingBadge(showtime: showtime)
                        }
                        .font(.footnote)
                    }
                }

                if let synopsis = title.synopsis, !synopsis.isEmpty {
                    Text(synopsis).font(.footnote).padding(.top, 4)
                }
            }
        }
        .navigationTitle(title.categoryLabel)
        .userActivity(AppLink.handoffActivity) { activity in
            activity.title = title.name
            activity.userInfo = ["slug": title.slug]
            // Opens the site's page if the iPhone app can't take it.
            activity.webpageURL = title.url
            activity.isEligibleForHandoff = true
        }
    }

    private func when(_ showtime: Showtime, feed: Feed) -> String {
        "\(feed.dayLabel(showtime.startsAt, short: true)) · \(feed.timeLabel(showtime.startsAt))"
    }

    private func details(_ title: Title) -> String {
        var parts = [title.year, title.runtime, title.rating].compactMap(\.self)
        if let director = title.director { parts.insert("Dir. \(director)", at: 0) }
        return parts.joined(separator: " · ")
    }
}

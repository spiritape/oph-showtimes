import SwiftUI

/// Every listed Showtime, grouped by day, soonest first.
struct WatchScheduleView: View {
    @Environment(WatchFeedStore.self) private var store
    @State private var path: [ScheduledShowtime] = []
    /// A Title a complication linked to, opened once the Feed has it.
    @State private var linkedSlug: String?

    var body: some View {
        NavigationStack(path: $path) {
            content
                .navigationTitle("Playhouse")
                .navigationDestination(for: ScheduledShowtime.self) { WatchShowtimeView(item: $0) }
        }
        .onOpenURL { url in
            linkedSlug = AppLink.titleSlug(url)
            openLinkedTitle()
        }
        .onChange(of: store.feed) { openLinkedTitle() }
        #if DEBUG
        // For screenshots, which can't tap: simctl launch <watch> <bundle id> -openTitle <slug>
        .task {
            let arguments = CommandLine.arguments
            if let index = arguments.firstIndex(of: "-openTitle"), arguments.indices.contains(index + 1) {
                linkedSlug = arguments[index + 1]
                openLinkedTitle()
            }
        }
        #endif
    }

    /// Opens the linked Title's next Showtime.
    private func openLinkedTitle() {
        guard let slug = linkedSlug, let item = store.feed?.listed().first(where: { $0.title.slug == slug }) else { return }
        linkedSlug = nil
        path = [item]
    }

    @ViewBuilder private var content: some View {
        if let feed = store.feed {
            let now = Date.now
            let days = feed.days(.everything, now: now)
            if days.isEmpty {
                ContentUnavailableView("Nothing scheduled right now", systemImage: "calendar")
            } else {
                List {
                    ForEach(days) { day in
                        Section(feed.dayLabel(day.showtimes[0].showtime.startsAt, now: now, short: true)) {
                            ForEach(day.showtimes) { item in
                                NavigationLink(value: item) { WatchShowtimeRow(item: item, feed: feed) }
                            }
                        }
                    }
                }
            }
        } else if store.failed {
            ContentUnavailableView {
                Label("Couldn't load the schedule", systemImage: "wifi.exclamationmark")
            } actions: {
                Button("Try Again") { Task { await store.refresh() } }
            }
        } else {
            ProgressView()
        }
    }
}

struct WatchShowtimeRow: View {
    let item: ScheduledShowtime
    let feed: Feed

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(feed.timeLabel(item.showtime.startsAt))
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Color.accentColor)
            Text(item.title.name)
                .font(.headline)
                .lineLimit(3)
            HStack(spacing: 6) {
                Text(item.title.categoryLabel).foregroundStyle(.secondary)
                WatchBookingBadge(showtime: item.showtime)
            }
            .font(.footnote)
        }
        .padding(.vertical, 2)
    }
}

/// "Sold out" or "Free", like the iPhone app's badge. Showtimes with neither show nothing.
struct WatchBookingBadge: View {
    let showtime: Showtime

    var body: some View {
        if showtime.isSoldOut {
            Text("Sold out").foregroundStyle(.red)
        } else if showtime.booking?.free == true {
            Text("Free").foregroundStyle(.green)
        }
    }
}

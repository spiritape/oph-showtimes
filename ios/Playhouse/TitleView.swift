import SwiftUI

struct TitleView: View {
    @Environment(FeedStore.self) private var store
    let title: Title
    @State private var calendarItem: ScheduledShowtime?

    private var feed: Feed? { store.feed }
    private var timeZone: TimeZone { feed?.calendar.timeZone ?? .current }

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 12) {
                    if title.imageUrl != nil {
                        Poster(url: title.imageUrl).frame(maxWidth: 220)
                    }
                    Text(title.name).font(.title.bold())
                    if let subtitle = title.subtitle {
                        Text(subtitle).font(.title3).foregroundStyle(.secondary)
                    }
                    Text(details).font(.subheadline).foregroundStyle(.secondary)
                    if let synopsis = title.synopsis {
                        Text(synopsis)
                    }
                    if let livestream = title.livestreamUrl {
                        Link("Watch the livestream", destination: livestream)
                    }
                }
                .listRowSeparator(.hidden)
            }
            Section("Showtimes") {
                ForEach(title.showtimes) { showtime in
                    showtimeRow(showtime)
                }
            }
        }
        .listStyle(.plain)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ShareLink(item: title.url, subject: Text(title.name))
        }
        .sheet(item: $calendarItem) { item in
            AddToCalendarSheet(item: item, theater: feed?.theater)
                .ignoresSafeArea()
        }
    }

    private var details: String {
        [title.categoryLabel, title.year, title.director.map { "Dir. \($0)" }, title.runtime, title.rating]
            .compactMap(\.self)
            .joined(separator: " · ")
    }

    private func showtimeRow(_ showtime: Showtime) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(dateLabel(showtime.startsAt)).font(.headline)
                if let price = showtime.price {
                    Text(price).font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()
            Button {
                calendarItem = ScheduledShowtime(title: title, showtime: showtime)
            } label: {
                Image(systemName: "calendar.badge.plus")
            }
            .buttonStyle(.borderless)
            .accessibilityLabel("Add to Calendar")
            if let booking = showtime.booking {
                Link(booking.label, destination: booking.url)
                    .buttonStyle(.borderedProminent)
            }
        }
    }

    private func dateLabel(_ date: Date) -> String {
        var style = Date.FormatStyle.dateTime.weekday(.abbreviated).month(.abbreviated).day().hour().minute()
        style.timeZone = timeZone
        return date.formatted(style)
    }
}

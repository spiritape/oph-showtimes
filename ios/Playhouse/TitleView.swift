import SwiftUI

struct TitleView: View {
    @Environment(FeedStore.self) private var store
    let title: Title
    @State private var calendarItem: ScheduledShowtime?
    @State private var ticketPage: TicketPage?

    private var feed: Feed? { store.feed }
    private var timeZone: TimeZone { feed?.calendar.timeZone ?? .current }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                header
                if let synopsis = title.synopsis {
                    Text(synopsis)
                        .font(.body)
                        .lineSpacing(3)
                        .frame(maxWidth: 560, alignment: .leading)
                }
                if let livestream = title.livestreamUrl {
                    Button("Watch the livestream", systemImage: "dot.radiowaves.left.and.right") {
                        ticketPage = TicketPage(url: livestream)
                    }
                    .buttonStyle(.bordered)
                }
                showtimes
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ShareLink(item: title.url, subject: Text(title.name))
        }
        .sheet(item: $calendarItem) { item in
            AddToCalendarSheet(item: item, theater: feed?.theater)
                .ignoresSafeArea()
        }
        .sheet(item: $ticketPage) { page in
            TicketPageView(url: page.url)
                .ignoresSafeArea()
        }
    }

    /// The poster, then the name and details, centered.
    private var header: some View {
        VStack(spacing: 10) {
            if title.imageUrl != nil {
                Poster(url: title.imageUrl)
                    .frame(maxWidth: 560)
                    .shadow(color: .black.opacity(0.25), radius: 12, y: 6)
                    .padding(.bottom, 8)
            }
            Text(title.categoryLabel.uppercased())
                .font(.caption.weight(.semibold))
                .tracking(1.2)
                .foregroundStyle(Color.accentColor)
            Text(title.name)
                .font(.largeTitle.bold())
                .multilineTextAlignment(.center)
            if let subtitle = title.subtitle {
                Text(subtitle)
                    .font(.title3)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            if !facts.isEmpty {
                Text(facts)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 8)
    }

    private var facts: String {
        [title.year, title.director.map { "Dir. \($0)" }, title.runtime, title.rating]
            .compactMap(\.self)
            .joined(separator: " · ")
    }

    private var showtimes: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Showtimes").font(.title2.bold())
            if title.showtimes.isEmpty {
                Text("Nothing scheduled right now.").foregroundStyle(.secondary)
            }
            ForEach(title.showtimes) { showtime in
                showtimeCard(showtime)
            }
        }
        .frame(maxWidth: 560)
    }

    /// A date block, the time and price, Add to Calendar, and a full-width
    /// Tickets/RSVP button.
    private func showtimeCard(_ showtime: Showtime) -> some View {
        VStack(spacing: 14) {
            HStack(spacing: 14) {
                VStack(spacing: 0) {
                    Text(format(showtime.startsAt, .dateTime.weekday(.abbreviated)).uppercased())
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Color.accentColor)
                    Text(format(showtime.startsAt, .dateTime.day()))
                        .font(.title2.bold())
                    Text(format(showtime.startsAt, .dateTime.month(.abbreviated)).uppercased())
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
                .frame(width: 56, height: 64)
                .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 3) {
                    Text(format(showtime.startsAt, .dateTime.hour().minute())).font(.headline)
                    if let price = showtime.price {
                        Text(price).font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                Spacer(minLength: 0)
                Button {
                    calendarItem = ScheduledShowtime(title: title, showtime: showtime)
                } label: {
                    Image(systemName: "calendar.badge.plus").font(.title3)
                }
                .buttonStyle(.borderless)
                .accessibilityLabel("Add to Calendar")
            }
            if let booking = showtime.booking {
                Button {
                    ticketPage = TicketPage(url: booking.url)
                } label: {
                    Text(booking.free ? "RSVP · Free" : booking.label)
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 4)
                }
                .buttonStyle(.borderedProminent)
                .buttonBorderShape(.capsule)
            }
        }
        .padding(14)
        .background(Color(.secondarySystemBackground), in: .rect(cornerRadius: 18))
    }

    /// Formats a date in the theater's time zone.
    private func format(_ date: Date, _ style: Date.FormatStyle) -> String {
        var style = style
        style.timeZone = timeZone
        return date.formatted(style)
    }
}

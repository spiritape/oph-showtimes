import SwiftUI

struct TitleView: View {
    @Environment(FeedStore.self) private var store
    let title: Title
    @State private var calendarItem: ScheduledShowtime?
    @State private var inviteItem: ScheduledShowtime?
    @State private var ticketPage: TicketPage?
    @Environment(\.openURL) private var openURL
    /// The date block grows with the text size.
    @ScaledMetric(relativeTo: .title2) private var dateBlockWidth = 56

    private var feed: Feed? { store.feed }
    private var timeZone: TimeZone { feed?.calendar.timeZone ?? .current }

    var body: some View {
        ScrollView {
            // Showtimes come straight after the name, so tickets are close to the top;
            // the synopsis follows.
            VStack(spacing: 20) {
                header
                showtimes
                if let livestream = title.livestreamUrl {
                    Button("Watch the livestream", systemImage: "dot.radiowaves.left.and.right") {
                        ticketPage = TicketPage(url: livestream)
                    }
                    .buttonStyle(.bordered)
                }
                about
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
        .background(Color.appBackground)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ShareLink(item: title.url, subject: Text(title.name))
        }
        .sheet(item: $calendarItem) { item in
            AddToCalendarSheet(item: item, theater: feed?.theater)
                .ignoresSafeArea()
        }
        .sheet(item: $inviteItem) { item in
            AddToCalendarSheet(item: item, theater: feed?.theater, invite: true)
                .ignoresSafeArea()
        }
        .sheet(item: $ticketPage) { page in
            TicketPageView(url: page.url)
                .ignoresSafeArea()
        }
    }

    /// The Playhouse's still, then the name and details, centered.
    private var header: some View {
        VStack(spacing: 8) {
            if title.imageUrl != nil {
                Poster(url: title.imageUrl)
                    .frame(maxWidth: 560)
                    .shadow(color: .black.opacity(0.25), radius: 12, y: 6)
                    .padding(.bottom, 6)
            }
            Text(title.name)
                .font(.title.bold())
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
            if let starring = title.starring {
                Text("Starring \(starring)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            // What the Playhouse set in bold: special guests, introductions, notices.
            if !title.highlights.isEmpty {
                VStack(spacing: 6) {
                    ForEach(Array(title.highlights.enumerated()), id: \.offset) { _, line in
                        Text(line)
                            .font(.callout.weight(.semibold))
                            .multilineTextAlignment(.center)
                    }
                }
                .padding(.top, 6)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 8)
    }

    /// The rest of what the Playhouse wrote, in its order, then a link to its own page.
    @ViewBuilder private var about: some View {
        let paragraphs = title.writeUp
        if !paragraphs.isEmpty || title.sourceUrl != nil {
            VStack(alignment: .leading, spacing: 12) {
                if !paragraphs.isEmpty {
                    Text("About").font(.title2.bold())
                }
                ForEach(Array(paragraphs.enumerated()), id: \.offset) { _, paragraph in
                    Text(paragraph)
                        .lineSpacing(3)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                if let sourceUrl = title.sourceUrl {
                    Button {
                        ticketPage = TicketPage(url: sourceUrl)
                    } label: {
                        Label("More on ojaiplayhouse.com", systemImage: "safari")
                            .font(.subheadline)
                    }
                    .buttonStyle(.borderless)
                    .padding(.top, 4)
                }
            }
            .frame(maxWidth: 560, alignment: .leading)
        }
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
                .frame(width: dateBlockWidth)
                .padding(.vertical, 8)
                .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 3) {
                    // Side by side when they fit, stacked at large text sizes.
                    ViewThatFits(in: .horizontal) {
                        HStack(spacing: 8) { timeAndBadge(showtime) }
                        VStack(alignment: .leading, spacing: 4) { timeAndBadge(showtime) }
                    }
                    if let price = showtime.displayPrice {
                        Text(price).font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                Spacer(minLength: 0)
                Menu {
                    Button("Apple Calendar", systemImage: "calendar") {
                        calendarItem = ScheduledShowtime(title: title, showtime: showtime)
                    }
                    if let theater = feed?.theater {
                        Button("Google Calendar", systemImage: "globe") {
                            openURL(GoogleCalendar.url(for: ScheduledShowtime(title: title, showtime: showtime), theater: theater))
                        }
                    }
                } label: {
                    // In color: a blue calendar with a green plus.
                    Image(systemName: "calendar.badge.plus")
                        .font(.title2)
                        .symbolRenderingMode(.palette)
                        .foregroundStyle(Color.softGreen, Color.softBlue)
                }
                .menuStyle(.button)
                .buttonStyle(.borderless)
                .accessibilityLabel("Add to Calendar")
            }
            let invites = !showtime.hasPlayed(now: .now) && !showtime.isSoldOut
            if showtime.booking != nil || invites {
                // Side by side; stacked when the text is too large to fit.
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 10) { bookingButtons(showtime, invites: invites) }
                    VStack(spacing: 10) { bookingButtons(showtime, invites: invites) }
                }
            }
        }
        .padding(14)
        .background(Color.appSurface, in: .rect(cornerRadius: 18))
    }

    /// Tickets/RSVP, then Invite a friend.
    @ViewBuilder private func bookingButtons(_ showtime: Showtime, invites: Bool) -> some View {
        if let booking = showtime.booking {
            Button {
                ticketPage = TicketPage(url: booking.url)
            } label: {
                Text(bookingLabel(showtime, booking))
                    .font(.headline)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 4)
            }
            // Sold out: still opens the ticket page, in case seats come back.
            .buttonStyle(BookingButtonStyle(soldOut: showtime.isSoldOut, free: booking.free))
            .buttonBorderShape(.capsule)
        }
        if invites { inviteButton(showtime, fills: showtime.booking == nil) }
    }

    /// A calendar invite for this Showtime: Apple's or Google's new-event screen,
    /// with notes written to the friend, who is added there as an invitee/guest.
    private func inviteButton(_ showtime: Showtime, fills: Bool) -> some View {
        let item = ScheduledShowtime(title: title, showtime: showtime)
        return Menu {
            Section("Send a calendar invite") {
                Button("Apple Calendar", systemImage: "calendar") { inviteItem = item }
                if let theater = feed?.theater {
                    Button("Google Calendar", systemImage: "globe") {
                        openURL(GoogleCalendar.url(for: item, theater: theater, invite: true))
                    }
                }
            }
        } label: {
            Label("Invite a friend", systemImage: "person.badge.plus")
                .font(.headline)
                .lineLimit(1)
                .frame(maxWidth: fills ? .infinity : nil)
                .padding(.vertical, 4)
        }
        .menuStyle(.button)
        .buttonStyle(.bordered)
        .buttonBorderShape(.capsule)
        // White in dark mode (black in light), so Tickets stays the one colored button.
        .tint(.primary)
        .accessibilityLabel("Invite a friend")
        .accessibilityHint("Sends a calendar invite with Apple or Google Calendar")
    }

    private func bookingLabel(_ showtime: Showtime, _ booking: Showtime.Booking) -> String {
        if showtime.isSoldOut { return "Sold Out · Check for Seats" }
        return booking.free ? "RSVP · Free" : booking.label
    }

    @ViewBuilder private func timeAndBadge(_ showtime: Showtime) -> some View {
        Text(format(showtime.startsAt, .dateTime.hour().minute())).font(.headline).fixedSize()
        BookingBadge(showtime: showtime, kind: title.kind)
    }

    /// Formats a date in the theater's time zone.
    private func format(_ date: Date, _ style: Date.FormatStyle) -> String {
        var style = style
        style.timeZone = timeZone
        return date.formatted(style)
    }
}

/// The prominent Tickets/RSVP button (green for a free RSVP, matching the Free
/// badge), or a quieter grey one when sold out.
private struct BookingButtonStyle: PrimitiveButtonStyle {
    let soldOut: Bool
    let free: Bool

    func makeBody(configuration: Configuration) -> some View {
        if soldOut {
            Button(role: nil, action: configuration.trigger) { configuration.label }
                .buttonStyle(.bordered)
                .tint(.secondary)
        } else {
            Button(role: nil, action: configuration.trigger) { configuration.label }
                .buttonStyle(.borderedProminent)
                .tint(free ? .softGreen : .softBlue)
        }
    }
}


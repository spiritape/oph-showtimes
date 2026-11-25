import SwiftUI

/// One Showtime on a Title page: a date block, the time and price, Add to
/// Calendar, and a full-width Tickets/RSVP button.
struct ShowtimeCard: View {
    let title: Title
    let showtime: Showtime
    let theater: Theater?
    /// Showtimes are shown in the theater's time.
    let timeZone: TimeZone
    /// Opens a ticket or RSVP page inside the app.
    let openPage: (URL) -> Void
    /// Opens Apple's New Event screen for this Showtime.
    let addToCalendar: (ScheduledShowtime) -> Void
    @Environment(\.openURL) private var openURL
    /// The date block grows with the text size.
    @ScaledMetric(relativeTo: .title2) private var dateBlockWidth = 56

    var body: some View {
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
                        HStack(spacing: 8) { timeAndBadge }
                        VStack(alignment: .leading, spacing: 4) { timeAndBadge }
                    }
                    if let price = showtime.displayPrice {
                        Text(price).font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                Spacer(minLength: 0)
                Menu {
                    Button("Apple Calendar", systemImage: "calendar") {
                        addToCalendar(ScheduledShowtime(title: title, showtime: showtime))
                    }
                    if let theater {
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
                    HStack(spacing: 10) { bookingButtons(invites: invites) }
                    VStack(spacing: 10) { bookingButtons(invites: invites) }
                }
            }
        }
        .padding(14)
        .background(Color.appSurface, in: .rect(cornerRadius: 18))
    }

    /// Tickets/RSVP, then Invite a friend.
    @ViewBuilder private func bookingButtons(invites: Bool) -> some View {
        if let booking = showtime.booking {
            Button {
                openPage(booking.url)
            } label: {
                Text(booking.buttonLabel(soldOut: showtime.isSoldOut))
                    .font(.headline)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 4)
            }
            // Sold out: still opens the ticket page, in case seats come back.
            .buttonStyle(BookingButtonStyle(soldOut: showtime.isSoldOut, free: booking.free))
            .buttonBorderShape(.capsule)
        }
        if invites { inviteButton(fills: showtime.booking == nil) }
    }

    /// Shares the Title's own ojaiplayhouse.com page by text, email or any app,
    /// with a line naming this Showtime.
    private func inviteButton(fills: Bool) -> some View {
        let when = format(showtime.startsAt, .dateTime.weekday(.wide).month(.abbreviated).day().hour().minute())
        return ShareLink(
            item: title.sourceUrl ?? title.url,
            subject: Text(title.name),
            message: Text("Want to see \(title.name) with me at the Ojai Playhouse? \(when)"),
            preview: SharePreview(title.name)
        ) {
            Label("Invite a friend", systemImage: "person.badge.plus")
                .font(.headline)
                .lineLimit(1)
                .frame(maxWidth: fills ? .infinity : nil)
                .padding(.vertical, 4)
        }
        .buttonStyle(.bordered)
        .buttonBorderShape(.capsule)
        // White in dark mode (black in light), so Tickets stays the one colored button.
        .tint(.primary)
        .accessibilityHint("Shares the Playhouse's page for this show by text or another app")
    }

    @ViewBuilder private var timeAndBadge: some View {
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

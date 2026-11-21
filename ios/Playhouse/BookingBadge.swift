import SwiftUI

/// Shows at a glance whether a Showtime is sold out, free (an RSVP) or needs
/// a ticket. Showtimes with no booking link and not sold out show nothing.
struct BookingBadge: View {
    let showtime: Showtime
    /// Free films are "Free Screening"; free live shows are "Free Event".
    let kind: Title.Kind
    /// For the schedule rows: Sold out and Free Screening, but no ticket icon, since
    /// the row's Tickets pill says that.
    var short = false

    private var freeLabel: String { kind == .film ? "Free Screening" : "Free Event" }

    var body: some View {
        if showtime.isSoldOut {
            Label("Sold out", systemImage: "ticket.fill")
                .font(.caption.weight(.semibold))
                .labelStyle(.titleAndIcon)
                .foregroundStyle(Color.red)
                .padding(.horizontal, 7)
                .padding(.vertical, 2)
                .background(Color.red.opacity(0.15), in: .capsule)
                .fixedSize()
                .accessibilityLabel("Sold out")
        } else if let booking = showtime.booking {
            if booking.free {
                Text(freeLabel)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color.softGreen)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 2)
                    .background(Color.softGreen.opacity(0.18), in: .capsule)
                    .fixedSize()
                    .accessibilityLabel(freeLabel)
                    .accessibilityHint("RSVP required")
            } else if !booking.free, !short {
                Image(systemName: "ticket.fill")
                    .font(.caption)
                    .foregroundStyle(Color.accentColor)
                    .accessibilityLabel("Ticketed")
            }
        }
    }
}

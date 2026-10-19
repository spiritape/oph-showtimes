import SwiftUI

/// Shows at a glance whether a Showtime is sold out, free (an RSVP) or needs
/// a ticket. Showtimes with no booking link and not sold out show nothing.
struct BookingBadge: View {
    let showtime: Showtime
    /// Free films are "Free Screening"; free live shows are "Free Event".
    let kind: Title.Kind

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
                Text(kind == .film ? "Free Screening" : "Free Event")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color.green)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 2)
                    .background(Color.green.opacity(0.15), in: .capsule)
                    .fixedSize()
                    .accessibilityHint("RSVP required")
            } else {
                Image(systemName: "ticket.fill")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .accessibilityLabel("Ticketed")
            }
        }
    }
}

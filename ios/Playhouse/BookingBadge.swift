import SwiftUI

/// Shows at a glance whether a Showtime is free (an RSVP) or needs a ticket.
/// Showtimes with no booking link show nothing.
struct BookingBadge: View {
    let booking: Showtime.Booking?

    var body: some View {
        if let booking {
            if booking.free {
                Label("Free", systemImage: "gift.fill")
                    .font(.caption.weight(.semibold))
                    .labelStyle(.titleAndIcon)
                    .foregroundStyle(Color.green)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 2)
                    .background(Color.green.opacity(0.15), in: .capsule)
                    .fixedSize()
                    .accessibilityLabel("Free, RSVP")
            } else {
                Image(systemName: "ticket.fill")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .accessibilityLabel("Ticketed")
            }
        }
    }
}

import Foundation

// The words the schedule rows and Title pages show for a Showtime, kept out of
// the views so tests can check them. The Android app mirrors them.

extension Showtime {
    /// The pill on a schedule row. Says what's behind the row: the Title's page,
    /// with its ticket or RSVP buttons when there are any.
    func rowLabel(played: Bool) -> String {
        guard !played, !isSoldOut, let booking else { return "Details" }
        // Free ones RSVP; the Free Screening (or Free Event) badge sits by the year.
        if booking.free { return "RSVP" }
        return "Tickets"
    }

    /// Needs a ticket and can still get one.
    func isTicketed(played: Bool) -> Bool {
        !played && !isSoldOut && booking.map { !$0.free } == true
    }

    /// Free and can still RSVP.
    func isFreeRSVP(played: Bool) -> Bool {
        !played && !isSoldOut && booking?.free == true
    }
}

extension Showtime.Booking {
    /// The Tickets/RSVP button on a Title page.
    func buttonLabel(soldOut: Bool) -> String {
        if soldOut { return "Sold Out · Check for Seats" }
        return free ? "RSVP · Free" : label
    }
}

extension Title {
    /// The line under the name on a Title page: year, director, running time and rating.
    var facts: String {
        [year, director.map { "Dir. \($0)" }, runtime, rating]
            .compactMap(\.self)
            .joined(separator: " · ")
    }
}

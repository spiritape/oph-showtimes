import SwiftUI

struct ShowtimeRow: View {
    let item: ScheduledShowtime
    let time: String
    var played = false
    @ScaledMetric(relativeTo: .headline) private var posterWidth = 52
    /// Grows with the text size, so the pill's label still fits.
    @ScaledMetric(relativeTo: .caption) private var buttonWidth = 84

    /// The poster, the name, director and year, and on the right the time over the Tickets /
    /// RSVP / Details pill.
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            RowPoster(title: item.title)
                .frame(width: posterWidth)
            VStack(alignment: .leading, spacing: 2) {
                Text(item.title.name)
                    .font(.headline)
                    // The category isn't shown on the row (the filters cover it), but VoiceOver still says it.
                    .accessibilityLabel(([item.title.name, item.title.categoryLabel, ticketed ? "ticketed" : nil, freeRSVP ? "free, RSVP required" : nil] as [String?]).compactMap(\.self).joined(separator: ", "))
                if let subtitle = item.title.subtitle {
                    Text(subtitle).font(.subheadline).foregroundStyle(.secondary)
                }
                // The director, in grey like the year.
                if let director = item.title.director {
                    Text(director)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                        .accessibilityLabel("Directed by \(director)")
                }
                HStack(spacing: 6) { yearAndBadge }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            // The time, with the pill under it.
            VStack(spacing: 6) {
                timeView
                openLabelView
            }
            .frame(width: buttonWidth)
        }
        .padding(.vertical, 4)
    }

    /// "7:00" and "PM", sized apart.
    private var timeParts: (String, String) {
        let parts = time.split(maxSplits: 1, whereSeparator: \.isWhitespace).map(String.init)
        return (parts.first ?? time, parts.count > 1 ? parts[1] : "")
    }

    /// The showtime above the pill: big digits, with a small grey AM/PM after them.
    private var timeView: some View {
        HStack(alignment: .firstTextBaseline, spacing: 2) {
            Text(timeParts.0).font(.title3.monospacedDigit().weight(.bold))
            Text(timeParts.1).font(.caption.weight(.bold)).foregroundStyle(.secondary)
        }
        .lineLimit(1)
        .minimumScaleFactor(0.8)
        .accessibilityElement(children: .combine)
    }

    /// Needs a ticket and can still get one: the Tickets label shows the ticket icon.
    private var ticketed: Bool { item.showtime.isTicketed(played: played) }

    /// Free and can still RSVP: the pill reads RSVP.
    private var freeRSVP: Bool { item.showtime.isFreeRSVP(played: played) }

    private var openLabelView: some View {
        // Green for a free RSVP, matching the Free badge.
        OpenTitleLabel(
            text: item.showtime.rowLabel(played: played),
            quiet: played || item.showtime.isSoldOut,
            free: item.showtime.booking?.free == true
        )
    }

    @ViewBuilder private var yearAndBadge: some View {
        // The film's year; the category is left to the filters above the list.
        if let year = item.title.year {
            Text(year)
                .font(.caption.monospacedDigit())
                .foregroundStyle(.secondary)
                .fixedSize()
                .accessibilityLabel("Released \(year)")
        }
        BookingBadge(showtime: item.showtime, kind: item.title.kind, short: true)
    }
}

/// The pill at the top right of a row, so it's plain that a row opens its Title.
/// Not a button itself: the whole row is the link.
private struct OpenTitleLabel: View {
    let text: String
    /// Grey instead of the accent, for sold-out and played Showtimes.
    let quiet: Bool
    /// Green instead of blue, for a free RSVP.
    var free = false

    private var fill: Color { quiet ? Color(.tertiarySystemFill) : free ? .softGreen : .softBlue }

    var body: some View {
        // "Free" over "Screening": one word per line, shrunk a little rather than hyphenated.
        Text(text.replacingOccurrences(of: " ", with: "\n"))
            .font(.footnote.weight(.semibold))
            .multilineTextAlignment(.center)
            // A single word never breaks; it shrinks instead.
            .lineLimit(text.contains(" ") ? 2 : 1)
            .minimumScaleFactor(0.6)
            .allowsTightening(true)
            .foregroundStyle(quiet ? Color.secondary : .white)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .frame(maxWidth: .infinity)
            .background(fill, in: .capsule)
            .accessibilityHidden(true)
    }
}

/// The film's TMDB poster in the schedule list, or the Playhouse's image cropped to the same shape.
struct RowPoster: View {
    let title: Title

    var body: some View {
        Color(.tertiarySystemFill)
            .aspectRatio(2 / 3, contentMode: .fit)
            .overlay {
                AsyncImage(url: title.posterUrl ?? title.thumbnailUrl ?? title.imageUrl) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Color.clear
                }
            }
            .clipShape(.rect(cornerRadius: 4))
    }
}

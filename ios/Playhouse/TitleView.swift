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
            if !title.facts.isEmpty {
                Text(title.facts)
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

    private var showtimes: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Showtimes").font(.title2.bold())
            if title.showtimes.isEmpty {
                Text("Nothing scheduled right now.").foregroundStyle(.secondary)
            }
            ForEach(title.showtimes) { showtime in
                ShowtimeCard(
                    title: title,
                    showtime: showtime,
                    theater: feed?.theater,
                    timeZone: timeZone,
                    openPage: { ticketPage = TicketPage(url: $0) },
                    addToCalendar: { calendarItem = $0 }
                )
            }
        }
        .frame(maxWidth: 560)
    }
}

/// A poster, or a plain placeholder while it loads or when there isn't one.
struct Poster: View {
    let url: URL?

    var body: some View {
        AsyncImage(url: url) { image in
            image.resizable().aspectRatio(contentMode: .fit)
        } placeholder: {
            RoundedRectangle(cornerRadius: 4).fill(.quaternary).aspectRatio(3 / 2, contentMode: .fit)
        }
        .clipShape(.rect(cornerRadius: 4))
    }
}

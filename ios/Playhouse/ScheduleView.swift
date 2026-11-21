import SwiftUI

struct ScheduleView: View {
    @Environment(FeedStore.self) private var store
    @State private var filter = ScheduleFilter.everything
    @State private var path: [Title] = []
    /// A Title a link asked for before the schedule had loaded.
    @State private var linkedSlug: String?
    @State private var showsSettings = false
    @State private var showsRequests = false
    @State private var query = ""
    /// Bumped by tapping the wordmark: scrolls the schedule back to today.
    @State private var backToToday = 0

    var body: some View {
        NavigationStack(path: $path) {
            content
                .navigationTitle("Schedule")
                .navigationBarTitleDisplayMode(.inline)
                .navigationDestination(for: Title.self) { TitleView(title: $0) }
                .toolbar {
                    ToolbarItem(placement: .principal) {
                        Button { backToToday += 1 } label: {
                            Wordmark().frame(height: 15)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Ojai Playhouse")
                        .accessibilityHint("Scrolls back to today")
                    }
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Request a Movie", systemImage: "popcorn") { showsRequests = true }
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Settings", systemImage: "gearshape") { showsSettings = true }
                    }
                    // The search field sits at the bottom of the screen, within thumb's reach.
                    DefaultToolbarItem(kind: .search, placement: .bottomBar)
                }
                .searchable(text: $query, prompt: "Search films and shows")
                .sheet(isPresented: $showsSettings) { SettingsView().appTextSize() }
                .sheet(isPresented: $showsRequests) { RequestFilmView().appTextSize() }
                .refreshable { await store.refresh() }
                // Pinned, so the filters are in reach wherever the list is scrolled.
                .safeAreaInset(edge: .top, spacing: 0) {
                    if store.feed != nil { FilterChips(selection: $filter) }
                }
        }
        .onOpenURL { url in
            linkedSlug = AppLink.titleSlug(url)
            openLinkedTitle()
        }
        // A Title handed off from the watch app.
        .onContinueUserActivity(AppLink.handoffActivity) { activity in
            linkedSlug = activity.userInfo?["slug"] as? String
            openLinkedTitle()
        }
        .onChange(of: store.feed) { openLinkedTitle() }
    }

    private func openLinkedTitle() {
        guard let slug = linkedSlug, let title = store.feed?.titles.first(where: { $0.slug == slug }) else { return }
        linkedSlug = nil
        path = [title]
    }

    @ViewBuilder private var content: some View {
        if let feed = store.feed {
            let now = Date.now
            let days = feed.timeline(filter, now: now).matching(query)
            let searching = !query.trimmingCharacters(in: .whitespaces).isEmpty
            // A fresh list for each filter (rather than animating every row from the
            // old filter to the new one, which drew rows over each other).
            ScheduleList(feed: feed, days: days, now: now, error: store.error,
                         emptyText: searching ? "No results for \u{201C}\(query)\u{201D}." : "Nothing scheduled right now.",
                         query: query, backToToday: backToToday)
                .id(filter)
        } else if let error = store.error {
            ContentUnavailableView {
                Label("No schedule", systemImage: "wifi.slash")
            } description: {
                Text(error)
            } actions: {
                Button("Try again") { Task { await store.refresh() } }
            }
        } else {
            ProgressView()
        }
    }
}

/// The schedule, oldest first, opening at today (or the next day with
/// Showtimes) so earlier days are a scroll up. Stays hidden until it's in
/// place, so it never shows the wrong part of the schedule first.
private struct ScheduleList: View {
    let feed: Feed
    let days: [ScheduleDay]
    let now: Date
    let error: String?
    let emptyText: String
    let query: String
    let backToToday: Int
    @State private var positioned = false

    private var firstUpcoming: String? {
        days.first { $0.showtimes.contains { !$0.showtime.hasPlayed(now: now) } }?.id
    }

    var body: some View {
        ScrollViewReader { proxy in
            List {
                if let error {
                    Text(error).font(.footnote).foregroundStyle(.secondary)
                }
                if days.isEmpty {
                    Text(emptyText).foregroundStyle(.secondary)
                }
                ForEach(days) { day in
                    let dayPlayed = day.showtimes.allSatisfy { $0.showtime.hasPlayed(now: now) }
                    Section {
                        ForEach(day.showtimes) { item in
                            let played = item.showtime.hasPlayed(now: now)
                            NavigationLink(value: played ? feed.titleToOpen(item.title) : item.title) {
                                ShowtimeRow(item: item, time: feed.timeLabel(item.showtime.startsAt), played: played)
                            }
                            // The row's own button says it opens; no chevron as well.
                            .navigationLinkIndicatorVisibility(.hidden)
                            // Already played: greyed, like the website's past list.
                            .opacity(played ? 0.45 : 1)
                            .listRowBackground(Color.appBackground)
                        }
                    } header: {
                        Text(feed.calendar.date(from: day.day).map { feed.dayLabel($0, now: now) } ?? "")
                            .foregroundStyle(dayPlayed ? Color.secondary : Color.accentColor)
                    }
                    .id(day.id)
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(Color.appBackground)
            .opacity(positioned ? 1 : 0)
            .onAppear {
                // Only the first time: coming back from a Title keeps the place in the list.
                guard !positioned else { return }
                Task { @MainActor in
                    if let firstUpcoming { proxy.scrollTo(firstUpcoming, anchor: .top) }
                    withAnimation(.easeOut(duration: 0.15)) { positioned = true }
                }
            }
            .onChange(of: query) {
                if let firstUpcoming { proxy.scrollTo(firstUpcoming, anchor: .top) }
            }
            .onChange(of: backToToday) {
                guard let firstUpcoming else { return }
                withAnimation(.snappy) { proxy.scrollTo(firstUpcoming, anchor: .top) }
            }
        }
    }
}

/// The Playhouse's own "OJAI PLAYHOUSE" lettering, in the accent blue.
struct Wordmark: View {
    var body: some View {
        Image("Wordmark")
            .resizable()
            .scaledToFit()
            .foregroundStyle(Color.accentColor)
            .accessibilityLabel("Ojai Playhouse")
    }
}

/// All / Movies / Live Shows / Free, pinned above the schedule. Scrolls
/// sideways when the screen is too narrow to fit them all.
struct FilterChips: View {
    @Binding var selection: ScheduleFilter
    /// Lets the highlight slide from one chip to the next.
    @Namespace private var highlight

    var body: some View {
        // Centered when they fit; otherwise a row that scrolls sideways.
        ViewThatFits(in: .horizontal) {
            chips.padding(.horizontal, 24).frame(maxWidth: .infinity)
            ScrollView(.horizontal, showsIndicators: false) {
                chips.padding(.horizontal, 24)
            }
        }
        .padding(.vertical, 6)
        .background(Color.appBackground)
        .sensoryFeedback(.selection, trigger: selection)
    }

    private var chips: some View {
        HStack(spacing: 6) {
            ForEach(ScheduleFilter.allCases) { filter in
                let selected = filter == selection
                Button(filter.label) {
                    withAnimation(.snappy(duration: 0.25)) { selection = filter }
                }
                .font(.footnote.weight(.semibold))
                .padding(.horizontal, 11)
                .padding(.vertical, 5)
                .foregroundStyle(selected ? Color.white : Color.primary)
                .background {
                    Capsule().fill(Color(.secondarySystemFill))
                    if selected {
                        // The Playhouse blue, like the Tickets buttons.
                        Capsule().fill(Color.playhouseBlue).matchedGeometryEffect(id: "selected", in: highlight)
                    }
                }
                .buttonStyle(.plain)
                .contentShape(.capsule)
                .accessibilityAddTraits(selected ? .isSelected : [])
            }
        }
        .fixedSize()
    }
}

struct ShowtimeRow: View {
    let item: ScheduledShowtime
    let time: String
    var played = false
    /// Grows with the text size so "12:00 PM" never wraps.
    @ScaledMetric(relativeTo: .subheadline) private var timeWidth = 72
    @ScaledMetric(relativeTo: .headline) private var posterWidth = 52

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(time)
                .font(.subheadline.monospacedDigit().weight(.semibold))
                .frame(width: timeWidth, alignment: .leading)
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
                HStack(spacing: 6) { yearAndBadge }
                // The open label sits in the row's lower-right corner, level with
                // the poster's bottom edge (or below the text, when that runs longer).
                Spacer(minLength: 6)
                openLabelView
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }
            .frame(maxHeight: .infinity, alignment: .top)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        // As tall as the taller of the poster and the text, so the label can reach the bottom.
        .fixedSize(horizontal: false, vertical: true)
        .padding(.vertical, 4)
    }

    /// Says what's behind the row: the Title's page, with its ticket or RSVP buttons when there are any.
    private var openLabel: String {
        guard !played, !item.showtime.isSoldOut, let booking = item.showtime.booking else { return "Details" }
        // Free ones say so here rather than in a badge: Free Screening for films,
        // Free Event for live shows.
        if booking.free { return item.title.kind == .film ? "Free Screening" : "Free Event" }
        return "Tickets"
    }

    /// Needs a ticket and can still get one: the Tickets label shows the ticket icon.
    private var ticketed: Bool {
        !played && !item.showtime.isSoldOut && item.showtime.booking.map { !$0.free } == true
    }

    /// Free and can still RSVP: the label reads Free Screening (or Free Event).
    private var freeRSVP: Bool {
        !played && !item.showtime.isSoldOut && item.showtime.booking?.free == true
    }

    private var openLabelView: some View {
        // Green for a free RSVP, matching the Free badge.
        OpenTitleLabel(
            text: openLabel,
            quiet: played || item.showtime.isSoldOut,
            free: item.showtime.booking?.free == true,
            systemImage: ticketed ? "ticket.fill" : nil
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

/// A small filled label at the end of the row, so it's plain that a row opens its Title.
/// Not a button itself: the whole row is the link.
private struct OpenTitleLabel: View {
    let text: String
    /// Grey instead of the accent, for sold-out and played Showtimes.
    let quiet: Bool
    /// Green instead of the Playhouse blue, for a free RSVP.
    var free = false
    /// An icon in front of the text: the ticket, on Tickets.
    var systemImage: String?

    /// A solid fill with a white label, like the Title page's buttons.
    private var fill: Color { free ? .rsvpGreen : .playhouseBlue }

    var body: some View {
        HStack(spacing: 2) {
            if let systemImage {
                Image(systemName: systemImage).padding(.trailing, 3)
            }
            Text(text)
            Image(systemName: "chevron.right").font(.caption2.weight(.bold))
        }
        .font(.caption.weight(.semibold))
        .foregroundStyle(quiet ? Color.secondary : Color.white)
        .padding(.leading, 9)
        .padding(.trailing, 7)
        .padding(.vertical, 3)
        .background(quiet ? Color(.tertiarySystemFill) : fill, in: .capsule)
        .fixedSize()
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

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
                        Button("By Popular Demand", systemImage: "popcorn") { showsRequests = true }
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
                                ShowtimeRow(item: item, time: feed.timeLabel(item.showtime.startsAt))
                            }
                            // Already played: greyed, like the website's past list.
                            .opacity(played ? 0.45 : 1)
                        }
                    } header: {
                        Text(feed.calendar.date(from: day.day).map { feed.dayLabel($0, now: now) } ?? "")
                            .foregroundStyle(dayPlayed ? Color.secondary : Color.accentColor)
                    }
                    .id(day.id)
                }
            }
            .listStyle(.plain)
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
        .background(.bar)
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
                        Capsule().fill(Color.accentColor).matchedGeometryEffect(id: "selected", in: highlight)
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
    /// Grows with the text size so "12:00 PM" never wraps.
    @ScaledMetric(relativeTo: .subheadline) private var timeWidth = 72

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(time)
                .font(.subheadline.monospacedDigit().weight(.semibold))
                .frame(width: timeWidth, alignment: .leading)
            Poster(url: item.title.thumbnailUrl ?? item.title.imageUrl)
                .frame(width: 48)
            VStack(alignment: .leading, spacing: 2) {
                Text(item.title.name).font(.headline)
                if let subtitle = item.title.subtitle {
                    Text(subtitle).font(.subheadline).foregroundStyle(.secondary)
                }
                // Side by side when they fit, stacked at large text sizes.
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 6) { categoryAndBadge }
                    VStack(alignment: .leading, spacing: 3) { categoryAndBadge }
                }
            }
        }
        .padding(.vertical, 2)
    }

    @ViewBuilder private var categoryAndBadge: some View {
        Text(item.title.categoryLabel).font(.caption).foregroundStyle(.secondary).fixedSize()
        BookingBadge(showtime: item.showtime, kind: item.title.kind)
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

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
                        // The Playhouse's stacked logo, trimmed to its edges and as tall as the bar allows.
                        Button { backToToday += 1 } label: {
                            Image("Logo")
                                .resizable()
                                .scaledToFit()
                                .foregroundStyle(Color.accentColor)
                                .frame(height: 44)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Ojai Playhouse")
                        .accessibilityHint("Scrolls back to today")
                    }
                    // Request and Settings are drawn like the filter chips, not the bar's larger glass buttons.
                    ToolbarItem(placement: .topBarLeading) {
                        Button { showsRequests = true } label: {
                            // Not a Label: the bar would show only its icon.
                            HStack(spacing: 5) {
                                Image(systemName: "popcorn")
                                Text("Request")
                            }
                            .padding(.horizontal, 13)
                                .chip()
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Request a Movie")
                    }
                    .sharedBackgroundVisibility(.hidden)
                    ToolbarItem(placement: .topBarTrailing) {
                        Button { showsSettings = true } label: {
                            // Not a Label: the bar would show only its icon.
                            HStack(spacing: 5) {
                                Image(systemName: "info.circle")
                                Text("Info")
                            }
                            .padding(.horizontal, 13)
                            .chip()
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Info and Settings")
                    }
                    .sharedBackgroundVisibility(.hidden)
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
                            .fontWeight(.bold)
                            .foregroundStyle(dayPlayed ? Color.secondary : Color.softBlue)
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

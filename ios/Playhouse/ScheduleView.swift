import SwiftUI

struct ScheduleView: View {
    @Environment(FeedStore.self) private var store
    @State private var filter = ScheduleFilter.everything
    @State private var path: [Title] = []
    /// A Title a link asked for before the schedule had loaded.
    @State private var linkedSlug: String?
    @State private var showsSettings = false
    @State private var showsRequests = false

    var body: some View {
        NavigationStack(path: $path) {
            content
                .navigationTitle("Schedule")
                .navigationBarTitleDisplayMode(.inline)
                .navigationDestination(for: Title.self) { TitleView(title: $0) }
                .toolbar {
                    ToolbarItem(placement: .principal) {
                        Wordmark().frame(height: 15)
                    }
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Request a movie", systemImage: "popcorn") { showsRequests = true }
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Settings", systemImage: "gearshape") { showsSettings = true }
                    }
                }
                .sheet(isPresented: $showsSettings) { SettingsView().appTextSize() }
                .sheet(isPresented: $showsRequests) { RequestFilmView().appTextSize() }
                .refreshable { await store.refresh() }
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
            let isPast = filter == .past
            let days = isPast ? feed.pastDays() : feed.days(filter)
            List {
                FilterChips(selection: $filter)
                    .listRowInsets(EdgeInsets())
                    .listRowSeparator(.hidden)
                if let error = store.error {
                    Text(error).font(.footnote).foregroundStyle(.secondary)
                }
                if days.isEmpty {
                    Text(isPast ? "Nothing has played recently." : "Nothing scheduled right now.").foregroundStyle(.secondary)
                }
                ForEach(days) { day in
                    Section(feed.calendar.date(from: day.day).map { feed.dayLabel($0) } ?? "") {
                        ForEach(day.showtimes) { item in
                            NavigationLink(value: isPast ? feed.titleToOpen(item.title) : item.title) {
                                ShowtimeRow(item: item, time: feed.timeLabel(item.showtime.startsAt))
                            }
                        }
                    }
                }
            }
            .listStyle(.plain)
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

/// Everything / Films / Live shows / Past, like the site's buttons. Scrolls
/// sideways when the screen is too narrow to fit them all.
struct FilterChips: View {
    @Binding var selection: ScheduleFilter

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(ScheduleFilter.allCases) { filter in
                    let selected = filter == selection
                    Button(filter.label) { selection = filter }
                        .font(.subheadline.weight(.medium))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 7)
                        .foregroundStyle(selected ? Color.white : Color.primary)
                        .background(selected ? Color.accentColor : Color(.secondarySystemFill), in: .capsule)
                        .accessibilityAddTraits(selected ? .isSelected : [])
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
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
                HStack(spacing: 6) {
                    Text(item.title.categoryLabel).font(.caption).foregroundStyle(.secondary)
                    BookingBadge(booking: item.showtime.booking)
                }
            }
        }
        .padding(.vertical, 2)
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

import SwiftUI

struct ScheduleView: View {
    @Environment(FeedStore.self) private var store
    @Environment(Notifications.self) private var notifications
    @State private var filter = ScheduleFilter.everything
    @State private var path: [Title] = []
    /// A Title a link asked for before the schedule had loaded.
    @State private var linkedSlug: String?

    var body: some View {
        NavigationStack(path: $path) {
            content
                .navigationTitle("Ojai Playhouse")
                .navigationDestination(for: Title.self) { TitleView(title: $0) }
                .toolbar {
                    ToolbarItem(placement: .principal) {
                        Picker("Show", selection: $filter) {
                            ForEach(ScheduleFilter.allCases) { Text($0.label).tag($0) }
                        }
                        .pickerStyle(.segmented)
                        .fixedSize()
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            Task { await notifications.toggle() }
                        } label: {
                            Image(systemName: notifications.isOn ? "bell.fill" : "bell")
                        }
                        .disabled(notifications.isBusy)
                        .accessibilityLabel(notifications.isOn ? "Turn off New Title Notifications" : "Notify me of new titles")
                    }
                }
                .alert(
                    notifications.message ?? "",
                    isPresented: Binding(get: { notifications.message != nil }, set: { if !$0 { notifications.message = nil } })
                ) {}
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
            let days = feed.days(filter)
            List {
                if let error = store.error {
                    Text(error).font(.footnote).foregroundStyle(.secondary)
                }
                if days.isEmpty {
                    Text("Nothing scheduled right now.").foregroundStyle(.secondary)
                }
                ForEach(days) { day in
                    Section(feed.calendar.date(from: day.day).map { feed.dayLabel($0) } ?? "") {
                        ForEach(day.showtimes) { item in
                            NavigationLink(value: item.title) {
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

struct ShowtimeRow: View {
    let item: ScheduledShowtime
    let time: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(time)
                .font(.subheadline.monospacedDigit().weight(.semibold))
                .frame(width: 72, alignment: .leading)
            Poster(url: item.title.thumbnailUrl ?? item.title.imageUrl)
                .frame(width: 48)
            VStack(alignment: .leading, spacing: 2) {
                Text(item.title.name).font(.headline)
                if let subtitle = item.title.subtitle {
                    Text(subtitle).font(.subheadline).foregroundStyle(.secondary)
                }
                Text(item.title.categoryLabel).font(.caption).foregroundStyle(.secondary)
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

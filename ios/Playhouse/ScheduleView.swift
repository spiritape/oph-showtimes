import SwiftUI

struct ScheduleView: View {
    @Environment(FeedStore.self) private var store
    @State private var filter = ScheduleFilter.everything

    var body: some View {
        NavigationStack {
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
                }
                .refreshable { await store.refresh() }
        }
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
                    Section(dayHeading(day, calendar: feed.calendar)) {
                        ForEach(day.showtimes) { item in
                            NavigationLink(value: item.title) {
                                ShowtimeRow(item: item, timeZone: feed.calendar.timeZone)
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

    private func dayHeading(_ day: ScheduleDay, calendar: Calendar) -> String {
        guard let date = calendar.date(from: day.day) else { return "" }
        if calendar.isDateInToday(date) { return "Today" }
        if calendar.isDateInTomorrow(date) { return "Tomorrow" }
        var style = Date.FormatStyle.dateTime.weekday(.wide).month(.abbreviated).day()
        style.timeZone = calendar.timeZone
        return date.formatted(style)
    }
}

struct ShowtimeRow: View {
    let item: ScheduledShowtime
    let timeZone: TimeZone

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(showtimeTime(item.showtime.startsAt, timeZone: timeZone))
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

/// "7:30 PM" in the theater's time zone.
func showtimeTime(_ date: Date, timeZone: TimeZone) -> String {
    var style = Date.FormatStyle.dateTime.hour().minute()
    style.timeZone = timeZone
    return date.formatted(style)
}

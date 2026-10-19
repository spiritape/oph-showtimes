import SwiftUI

/// "By Popular Demand": search for a film and request it. Shows this install's
/// own requests when the search is empty; nobody sees anyone else's.
struct RequestFilmView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var requests = FilmRequests.shared
    @State private var query = ""
    /// Most Requested starts closed; a tap opens it.
    @State private var showsTop = false
    @FocusState private var searchFocused: Bool

    var body: some View {
        NavigationStack {
            List {
                // Out of the way while searching, so results show above the keyboard.
                if !searchFocused && query.isEmpty { intro }
                Section { searchField }
                if query.trimmingCharacters(in: .whitespaces).count < 2 {
                    if !requests.mine.isEmpty {
                        Section("Your requests") {
                            ForEach(requests.mine) { film in
                                CompactFilmRow(film: film)
                                    .swipeActions {
                                    Button("Withdraw", role: .destructive) { Task { await requests.withdraw(film) } }
                                }
                            }
                        }
                    }
                    if !requests.top.isEmpty {
                        Section {
                            DisclosureGroup(isExpanded: $showsTop) {
                                ForEach(Array(requests.top.enumerated()), id: \.element.id) { index, ranked in
                                    FilmRow(film: ranked.film, rank: index + 1) {
                                        requestButton(ranked.film)
                                    }
                                }
                            } label: {
                                Label("Most Requested", systemImage: "chart.bar.fill")
                                    .font(.headline)
                                    .foregroundStyle(Color.accentColor)
                            }
                        }
                    }
                } else if requests.results.isEmpty {
                    Section {
                        if requests.isSearching {
                            ProgressView().frame(maxWidth: .infinity)
                        } else {
                            Text("No films found.").foregroundStyle(.secondary)
                        }
                    }
                } else {
                    Section {
                        ForEach(requests.results) { film in
                            FilmRow(film: film) { requestButton(film) }
                        }
                    }
                }
                Section {
                } footer: {
                    Text(FilmRequests.credit).font(.caption2)
                }
            }
            .scrollDismissesKeyboard(.immediately)
            .animation(.default, value: searchFocused)
            .task { await requests.loadTop() }
            .task(id: query) {
                // Wait for a pause in typing before searching.
                try? await Task.sleep(for: .milliseconds(350))
                guard !Task.isCancelled else { return }
                await requests.search(query)
            }
            .navigationTitle("By Popular Demand")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .alert(
                requests.message ?? "",
                isPresented: Binding(get: { requests.message != nil }, set: { if !$0 { requests.message = nil } })
            ) {}
        }
    }

    /// The search field, under the header so it reads as the answer to its question.
    private var searchField: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
            TextField("Search films", text: $query)
                .focused($searchFocused)
                .submitLabel(.search)
                .autocorrectionDisabled()
            if !query.isEmpty {
                Button("Clear search", systemImage: "xmark.circle.fill") { query = "" }
                    .labelStyle(.iconOnly)
                    .foregroundStyle(.secondary)
                    .buttonStyle(.borderless)
            }
        }
    }

    private var intro: some View {
        Section {
            VStack(spacing: 8) {
                Image(systemName: "popcorn").font(.largeTitle).foregroundStyle(Color.accentColor)
                Text("A movie you'd like to see on the big screen?").font(.headline).multilineTextAlignment(.center)
                Text("Search for a film and request it. The Playhouse sees how many people asked for each film.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
        }
    }

    @ViewBuilder private func requestButton(_ film: Film) -> some View {
        if requests.isRequested(film) {
            Image(systemName: "checkmark.circle.fill")
                .font(.title2)
                .foregroundStyle(Color.accentColor)
                .accessibilityLabel("Requested")
        } else if requests.pending.contains(film.tmdbId) {
            ProgressView()
        } else {
            Button("Request") { Task { await requests.request(film) } }
                .buttonStyle(.borderedProminent)
                .buttonBorderShape(.capsule)
                .font(.subheadline.weight(.semibold))
        }
    }
}

/// A tighter row for "Your requests": small poster, title and year on one line.
private struct CompactFilmRow: View {
    let film: Film

    var body: some View {
        HStack(spacing: 10) {
            AsyncImage(url: film.posterUrl) { image in
                image.resizable().aspectRatio(2 / 3, contentMode: .fill)
            } placeholder: {
                Rectangle().fill(.quaternary)
            }
            .frame(width: 32, height: 48)
            .clipShape(.rect(cornerRadius: 4))
            (Text(film.title).font(.subheadline.weight(.semibold))
                + Text(film.year.map { "  \($0)" } ?? "").font(.footnote).foregroundStyle(.secondary))
                .lineLimit(1)
            Spacer(minLength: 6)
            Image(systemName: "checkmark.circle.fill")
                .font(.subheadline)
                .foregroundStyle(Color.accentColor)
                .accessibilityLabel("Requested")
        }
    }
}

private struct FilmRow<Trailing: View>: View {
    let film: Film
    /// The place in the Most Requested list, if it's in it.
    var rank: Int? = nil
    @ViewBuilder let trailing: Trailing

    var body: some View {
        HStack(spacing: 12) {
            if let rank {
                Text("\(rank)")
                    .font(.title3.weight(.bold).monospacedDigit())
                    .foregroundStyle(Color.accentColor)
                    .frame(minWidth: 18)
            }
            AsyncImage(url: film.posterUrl) { image in
                image.resizable().aspectRatio(2 / 3, contentMode: .fill)
            } placeholder: {
                Rectangle().fill(.quaternary)
            }
            .frame(width: 46, height: 69)
            .clipShape(.rect(cornerRadius: 4))
            VStack(alignment: .leading, spacing: 2) {
                Text(film.title).font(.headline).lineLimit(2)
                if let year = film.year { Text(year).font(.subheadline).foregroundStyle(.secondary) }
            }
            Spacer(minLength: 8)
            trailing
        }
        .padding(.vertical, 2)
    }
}

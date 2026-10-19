import SwiftUI

/// "Request a movie": search for a film and request it. Shows this install's
/// own requests when the search is empty; nobody sees anyone else's.
struct RequestFilmView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var requests = FilmRequests.shared
    @State private var query = ""

    var body: some View {
        NavigationStack {
            List {
                if query.trimmingCharacters(in: .whitespaces).count < 2 {
                    intro
                    if !requests.top.isEmpty {
                        Section {
                            ForEach(Array(requests.top.enumerated()), id: \.element.id) { index, ranked in
                                FilmRow(film: ranked.film, rank: index + 1,
                                        detail: ranked.requests == 1 ? "1 request" : "\(ranked.requests) requests") {
                                    requestButton(ranked.film)
                                }
                            }
                        } header: {
                            Text("Most Requested").foregroundStyle(Color.accentColor)
                        }
                    }
                    if !requests.mine.isEmpty {
                        Section("Your requests") {
                            ForEach(requests.mine) { film in
                                FilmRow(film: film) {
                                    Image(systemName: "checkmark.circle.fill").foregroundStyle(Color.accentColor)
                                }
                                .swipeActions {
                                    Button("Withdraw", role: .destructive) { Task { await requests.withdraw(film) } }
                                }
                            }
                        }
                    }
                } else if requests.results.isEmpty && !requests.isSearching {
                    Text("No films found.").foregroundStyle(.secondary)
                } else {
                    ForEach(requests.results) { film in
                        FilmRow(film: film) { requestButton(film) }
                    }
                }
                Section {
                } footer: {
                    Text(FilmRequests.credit).font(.caption2)
                }
            }
            .overlay {
                if requests.isSearching && requests.results.isEmpty { ProgressView() }
            }
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search films")
            .task { await requests.loadTop() }
            .task(id: query) {
                // Wait for a pause in typing before searching.
                try? await Task.sleep(for: .milliseconds(350))
                guard !Task.isCancelled else { return }
                await requests.search(query)
            }
            .navigationTitle("Request a movie")
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

    private var intro: some View {
        Section {
            VStack(spacing: 8) {
                Image(systemName: "popcorn").font(.largeTitle).foregroundStyle(Color.accentColor)
                Text("What should the Playhouse show?").font(.headline)
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

private struct FilmRow<Trailing: View>: View {
    let film: Film
    /// The place in the Most Requested list, if it's in it.
    var rank: Int? = nil
    /// A line under the year, e.g. "12 requests".
    var detail: String? = nil
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
                if let detail { Text(detail).font(.caption.weight(.medium)).foregroundStyle(.secondary) }
            }
            Spacer(minLength: 8)
            trailing
        }
        .padding(.vertical, 2)
    }
}

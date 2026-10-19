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
    /// A film whose checkmark was tapped, waiting for "Withdraw" to be confirmed.
    @State private var confirmingWithdraw: Film?
    @State private var editMode = EditMode.inactive

    var body: some View {
        NavigationStack {
            List {
                // Out of the way while searching, so results show above the keyboard.
                if !searchFocused && query.isEmpty { intro }
                Section { searchField }
                if query.trimmingCharacters(in: .whitespaces).count < 2 {
                    if !requests.mine.isEmpty {
                        Section {
                            ForEach(requests.mine) { film in
                                CompactFilmRow(film: film) { confirmingWithdraw = film }
                            }
                            // Swipe left, or tap Edit for the red minus buttons.
                            .onDelete { offsets in
                                let films = offsets.map { requests.mine[$0] }
                                Task { for film in films { await requests.withdraw(film) } }
                            }
                        } header: {
                            HStack {
                                Text("Your requests")
                                Spacer()
                                Button(editMode.isEditing ? "Done" : "Edit") {
                                    withAnimation { editMode = editMode.isEditing ? .inactive : .active }
                                }
                                .font(.subheadline.weight(.semibold))
                                .textCase(nil)
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
            .environment(\.editMode, $editMode)
            // Leave Edit when there's nothing left to edit.
            .onChange(of: requests.mine.isEmpty) { _, empty in if empty { editMode = .inactive } }
            .confirmationDialog(
                confirmingWithdraw.map { "Withdraw your request for \($0.title)?" } ?? "",
                isPresented: Binding(get: { confirmingWithdraw != nil }, set: { if !$0 { confirmingWithdraw = nil } }),
                titleVisibility: .visible,
                presenting: confirmingWithdraw
            ) { film in
                Button("Withdraw Request", role: .destructive) { Task { await requests.withdraw(film) } }
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
            Button { confirmingWithdraw = film } label: {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title2)
                    .foregroundStyle(Color.accentColor)
            }
            .buttonStyle(.borderless)
            .accessibilityLabel("Requested")
            .accessibilityHint("Withdraws your request")
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
    /// Tapping the checkmark asks to withdraw the request.
    let onWithdraw: () -> Void

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
            Button(action: onWithdraw) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title3)
                    .foregroundStyle(Color.accentColor)
            }
            .buttonStyle(.borderless)
            .accessibilityLabel("Requested")
            .accessibilityHint("Withdraws your request")
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

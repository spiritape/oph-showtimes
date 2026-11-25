import SwiftUI

struct SettingsView: View {
    @Environment(Notifications.self) private var notifications
    @Environment(\.dismiss) private var dismiss
    @AppStorage(Appearance.storageKey) private var appearance = Appearance.dark

    var body: some View {
        NavigationStack {
            Form {
                Group {
                    Section {
                        VStack(spacing: 14) {
                            Image("Emblem")
                                .resizable()
                                .scaledToFit()
                                .frame(width: 44)
                                .foregroundStyle(Color.accentColor)
                            Wordmark().frame(height: 14)
                            Text("145 E Ojai Ave, Ojai · next to Libbey Park")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        NavigationLink {
                            PlayhouseInfoView()
                        } label: {
                            Label("Visiting the Playhouse", systemImage: "info.circle")
                        }
                        Link(destination: PlayhouseInfo.website) {
                            Label("ojaiplayhouse.com", systemImage: "safari")
                        }
                        Link(destination: PlayhouseInfo.phoneURL) {
                            Label(PlayhouseInfo.phone, systemImage: "phone")
                        }
                        .accessibilityLabel("Call the Playhouse, \(PlayhouseInfo.phone)")
                        Link(destination: PlayhouseInfo.emailURL) {
                            Label(PlayhouseInfo.email, systemImage: "envelope")
                        }
                        Menu {
                            Link(destination: PlayhouseInfo.directionsURL) {
                                Label("Apple Maps", systemImage: "map")
                            }
                            Link(destination: PlayhouseInfo.googleDirectionsURL) {
                                Label("Google Maps", systemImage: "globe")
                            }
                        } label: {
                            Label("Directions", systemImage: "map")
                        }
                    }

                    Section {
                        Toggle(isOn: Binding(get: { notifications.isOn }, set: { _ in Task { await notifications.toggle() } })) {
                            Label("New Title Notifications", systemImage: "bell")
                        }
                        .disabled(notifications.isBusy)
                    } footer: {
                        Text("Get a notification when a new film or live show is announced.")
                    }

                    Section {
                        Picker("Appearance", selection: $appearance) {
                            ForEach(Appearance.allCases) { Text($0.label).tag($0) }
                        }
                        .pickerStyle(.inline)
                        .labelsHidden()
                    } footer: {
                        Text("Widgets and notifications follow your iPhone's own setting.")
                    }

                    TextSizeSettings()

                    Section {
                        LabeledContent("Version", value: Self.version)
                        LabeledContent("App by", value: "Micah Van Hove")
                    } footer: {
                        // TMDB's terms ask for its logo and notice with the app's credits, less prominent than the Playhouse's own marks.
                        VStack(alignment: .leading, spacing: 8) {
                            Link(destination: TMDB.website) {
                                Image("TMDBLogo")
                                    .resizable()
                                    .scaledToFit()
                                    .frame(height: 9)
                            }
                            .accessibilityLabel("TMDB, The Movie Database")
                            Text(TMDB.credit)
                        }
                        .padding(.top, 4)
                    }
                }
                .listRowBackground(Color.appGroupedSurface)
            }
            .appGroupedBackground()
            .tint(Color.accentColor)
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .alert(
                notifications.message ?? "",
                isPresented: Binding(get: { notifications.message != nil }, set: { if !$0 { notifications.message = nil } })
            ) {}
        }
    }

    private static var version: String {
        let info = Bundle.main.infoDictionary
        let version = info?["CFBundleShortVersionString"] as? String ?? "?"
        let build = info?["CFBundleVersion"] as? String ?? "?"
        return "\(version) (\(build))"
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

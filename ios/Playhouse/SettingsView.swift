import SwiftUI

/// How the app looks. Dark unless the person chooses otherwise.
enum Appearance: String, CaseIterable, Identifiable {
    case dark, light, system
    var id: Self { self }

    static let storageKey = "appearance"

    var label: String {
        switch self {
        case .dark: "Dark"
        case .light: "Light"
        case .system: "Match System"
        }
    }

    /// Applies to every window of the app, including open sheets.
    @MainActor func apply() {
        let style: UIUserInterfaceStyle = switch self {
        case .dark: .dark
        case .light: .light
        case .system: .unspecified
        }
        for case let scene as UIWindowScene in UIApplication.shared.connectedScenes {
            for window in scene.windows { window.overrideUserInterfaceStyle = style }
        }
    }
}

struct SettingsView: View {
    @Environment(Notifications.self) private var notifications
    @Environment(\.dismiss) private var dismiss
    @AppStorage(Appearance.storageKey) private var appearance = Appearance.dark

    var body: some View {
        NavigationStack {
            Form {
                Group {
                    Section {
                        Picker("Appearance", selection: $appearance) {
                            ForEach(Appearance.allCases) { Text($0.label).tag($0) }
                        }
                        .pickerStyle(.inline)
                        .labelsHidden()
                    } header: {
                        Text("Appearance")
                    } footer: {
                        Text("Widgets and notifications follow your iPhone's own setting.")
                    }

                    TextSizeSettings()

                    Section {
                        Toggle(isOn: Binding(get: { notifications.isOn }, set: { _ in Task { await notifications.toggle() } })) {
                            Label("New Title Notifications", systemImage: "bell")
                        }
                        .disabled(notifications.isBusy)
                    } header: {
                        Text("Notifications")
                    } footer: {
                        Text("Get a notification when a new film or live show is announced.")
                    }

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
                        Link(destination: PlayhouseInfo.directionsURL) {
                            Label("Directions", systemImage: "map")
                        }
                        LabeledContent("Version", value: Self.version)
                        LabeledContent("App by", value: "Micah Van Hove")
                    } header: {
                        Text("About")
                    } footer: {
                        // TMDB's terms ask for its logo and notice here, less prominent than the Playhouse's own marks.
                        VStack(alignment: .leading, spacing: 8) {
                            Link(destination: FilmRequests.tmdbURL) {
                                Image("TMDBLogo")
                                    .resizable()
                                    .scaledToFit()
                                    .frame(height: 9)
                            }
                            .accessibilityLabel("TMDB, The Movie Database")
                            Text(FilmRequests.credit)
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

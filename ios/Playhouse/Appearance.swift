import UIKit

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

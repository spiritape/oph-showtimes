import SwiftUI
import UIKit

/// The app's dark look: the same violet-tinted near-black as the Film Requests page
/// (worker/requests.ts), with cards and grouped rows a shade lighter. Light mode keeps
/// the system colors.
extension Color {
    /// Behind the schedule and Title pages.
    static let appBackground = dynamic(dark: 0x111018, light: .systemBackground)
    /// Behind grouped lists (Settings, Request a Movie).
    static let appGroupedBackground = dynamic(dark: 0x111018, light: .systemGroupedBackground)
    /// Showtime cards on a Title page.
    static let appSurface = dynamic(dark: 0x1D1B28, light: .secondarySystemBackground)
    /// Rows of grouped lists.
    static let appGroupedSurface = dynamic(dark: 0x1D1B28, light: .secondarySystemGroupedBackground)
    /// The Ojai Playhouse's own blue (#0032E4, from its website and wordmark), for filled
    /// Tickets buttons in both modes. White on it reads at about 8:1. Blue text and icons
    /// use the accent color instead, which is lighter in dark mode so it shows on the dark background.
    static let playhouseBlue = Color(red: 0x00 / 255, green: 0x32 / 255, blue: 0xE4 / 255)
    /// Filled free-RSVP buttons: deeper than the system green so a white label stays
    /// readable (about 5:1).
    static let rsvpGreen = Color(red: 0.10, green: 0.50, blue: 0.22)

    private static func dynamic(dark hex: UInt32, light: UIColor) -> Color {
        let dark = UIColor(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
        return Color(UIColor { $0.userInterfaceStyle == .dark ? dark : light })
    }
}

extension View {
    /// A grouped List or Form on the app's background. Its rows take `.listRowBackground(.appGroupedSurface)`.
    func appGroupedBackground() -> some View {
        scrollContentBackground(.hidden).background(Color.appGroupedBackground)
    }
}

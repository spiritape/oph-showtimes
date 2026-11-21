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

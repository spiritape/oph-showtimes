import SwiftUI

/// The app's text size: the iPhone's own setting, or one chosen in Settings.
enum TextSize: String, CaseIterable, Identifiable {
    case system, small, standard, large, larger, largest
    var id: Self { self }

    static let storageKey = "textSize"
    /// Until someone chooses: the smallest size, which suits the dense schedule.
    static let defaultSize = TextSize.small
    /// The sizes the Settings slider steps through, smallest first.
    static let steps: [TextSize] = [.small, .standard, .large, .larger, .largest]

    var label: String {
        switch self {
        case .system: "Match iPhone"
        case .small: "Small"
        case .standard: "Default"
        case .large: "Large"
        case .larger: "Larger"
        case .largest: "Largest"
        }
    }

    /// The sizes allowed: one fixed size, or every size so the iPhone's own setting applies.
    var range: ClosedRange<DynamicTypeSize> {
        switch self {
        case .system: .xSmall ... .accessibility5
        case .small: .small ... .small
        case .standard: .large ... .large
        case .large: .xLarge ... .xLarge
        case .larger: .xxLarge ... .xxLarge
        case .largest: .xxxLarge ... .xxxLarge
        }
    }
}

/// Applies the text size chosen in Settings. Always the same modifier, so
/// changing it doesn't rebuild the screen (which would close open sheets).
private struct AppTextSize: ViewModifier {
    @AppStorage(TextSize.storageKey) private var size = TextSize.defaultSize
    func body(content: Content) -> some View { content.dynamicTypeSize(size.range) }
}

extension View {
    /// Use on the app and on each sheet: sheets don't inherit it.
    func appTextSize() -> some View { modifier(AppTextSize()) }
}

/// The Text Size section of Settings: a slider that's always there, and a
/// switch to follow the iPhone instead. Moving the slider switches that off.
struct TextSizeSettings: View {
    @AppStorage(TextSize.storageKey) private var size = TextSize.defaultSize
    /// What the iPhone itself is set to, shown on the slider while following it.
    @Environment(\.dynamicTypeSize) private var phoneSize

    /// The slider position: the chosen size, or the nearest one to the iPhone's.
    private var step: Int {
        if let index = TextSize.steps.firstIndex(of: size) { return index }
        return TextSize.steps.lastIndex { $0.range.lowerBound <= phoneSize } ?? 1
    }

    var body: some View {
        Section {
            HStack(spacing: 12) {
                Image(systemName: "textformat.size.smaller").accessibilityHidden(true)
                Slider(
                    value: Binding(
                        get: { Double(step) },
                        set: { size = TextSize.steps[Int($0.rounded())] }
                    ),
                    in: 0...Double(TextSize.steps.count - 1),
                    step: 1
                ) {
                    Text("Text Size")
                }
                .accessibilityValue(size == .system ? "Matching iPhone" : size.label)
                Image(systemName: "textformat.size.larger").font(.title3).accessibilityHidden(true)
            }
            Toggle("Match iPhone Setting", isOn: Binding(
                get: { size == .system },
                set: { size = $0 ? .system : TextSize.steps[step] }
            ))
        } header: {
            Text("Text Size")
        } footer: {
            Text(size == .system
                 ? "Following the text size in your iPhone's Display & Brightness settings. Move the slider to choose a size for this app."
                 : "\(size.label). Turn on Match iPhone Setting to follow your iPhone's text size again.")
        }
    }
}

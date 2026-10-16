import SwiftUI

/// The app's text size: the iPhone's own setting, or one chosen in Settings.
enum TextSize: String, CaseIterable, Identifiable {
    case system, small, standard, large, larger, largest
    var id: Self { self }

    static let storageKey = "textSize"
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
    @AppStorage(TextSize.storageKey) private var size = TextSize.system
    func body(content: Content) -> some View { content.dynamicTypeSize(size.range) }
}

extension View {
    /// Use on the app and on each sheet: sheets don't inherit it.
    func appTextSize() -> some View { modifier(AppTextSize()) }
}

/// The Text Size section of Settings: follow the iPhone, or pick a size.
struct TextSizeSettings: View {
    @AppStorage(TextSize.storageKey) private var size = TextSize.system

    var body: some View {
        Section {
            Toggle("Match iPhone Setting", isOn: Binding(
                get: { size == .system },
                set: { size = $0 ? .system : .standard }
            ))
            if size != .system {
                HStack(spacing: 12) {
                    Image(systemName: "textformat.size.smaller").accessibilityHidden(true)
                    Slider(
                        value: Binding(
                            get: { Double(TextSize.steps.firstIndex(of: size) ?? 1) },
                            set: { size = TextSize.steps[Int($0.rounded())] }
                        ),
                        in: 0...Double(TextSize.steps.count - 1),
                        step: 1
                    ) {
                        Text("Text Size")
                    }
                    .accessibilityValue(size.label)
                    Image(systemName: "textformat.size.larger").font(.title3).accessibilityHidden(true)
                }
                Text("\(size.label): Showtimes, titles and details appear at this size.")
                    .foregroundStyle(.secondary)
            }
        } header: {
            Text("Text Size")
        } footer: {
            if size == .system {
                Text("Uses the text size from your iPhone's Display & Brightness settings.")
            }
        }
    }
}

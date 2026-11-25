import SwiftUI

/// All / Movies / Live Shows / Free, pinned above the schedule. Scrolls
/// sideways when the screen is too narrow to fit them all.
struct FilterChips: View {
    @Binding var selection: ScheduleFilter
    /// Lets the highlight slide from one chip to the next.
    @Namespace private var highlight

    var body: some View {
        // Centered when they fit; otherwise a row that scrolls sideways.
        ViewThatFits(in: .horizontal) {
            chips.padding(.horizontal, 24).frame(maxWidth: .infinity)
            ScrollView(.horizontal, showsIndicators: false) {
                chips.padding(.horizontal, 24)
            }
        }
        // The chips' own tap margins add the rest of the space above and below.
        .padding(.vertical, 2)
        .background(Color.appBackground)
        .sensoryFeedback(.selection, trigger: selection)
    }

    private var chips: some View {
        HStack(spacing: 0) {
            ForEach(ScheduleFilter.allCases) { filter in
                let selected = filter == selection
                Button {
                    withAnimation(.snappy(duration: 0.25)) { selection = filter }
                } label: {
                    Text(filter.label)
                        .font(.footnote.weight(.semibold))
                        // As tall as the Tickets pills on the rows.
                        .padding(.horizontal, 13)
                        .padding(.vertical, 7)
                        .foregroundStyle(selected ? Color.white : Color.primary)
                        .background {
                            Capsule().fill(Color(.secondarySystemFill))
                            if selected {
                                // The lighter Playhouse blue, like the Tickets pills.
                                Capsule().fill(Color.softBlue).matchedGeometryEffect(id: "selected", in: highlight)
                            }
                        }
                        // A tap a little outside the chip still counts.
                        .padding(.horizontal, 3)
                        .padding(.vertical, 4)
                        .contentShape(.rect)
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(selected ? .isSelected : [])
            }
        }
        .fixedSize()
    }
}

/// The filter chips' look (FilterChips) for the bar's Request and Settings buttons:
/// footnote semibold on a grey capsule exactly a chip's height, with a little extra tap
/// margin around it. Round (a circle) unless the caller pads it wider.
private struct Chip: ViewModifier {
    /// A filter chip's height at the default text size: footnote text plus 7 above and below.
    @ScaledMetric(relativeTo: .footnote) private var height = 28

    func body(content: Content) -> some View {
        content
            .font(.footnote.weight(.semibold))
            // The bar draws its icons large; chips keep them text-sized.
            .imageScale(.medium)
            .foregroundStyle(Color.primary)
            .frame(minWidth: height, minHeight: height, maxHeight: height)
            // Its full width, even where the bar offers less.
            .fixedSize(horizontal: true, vertical: false)
            .background(Color(.secondarySystemFill), in: .capsule)
            .padding(.vertical, 4)
            .contentShape(.rect)
    }
}

extension View {
    func chip() -> some View { modifier(Chip()) }
}

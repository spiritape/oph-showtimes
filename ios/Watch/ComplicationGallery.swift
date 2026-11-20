#if DEBUG
import SwiftUI
import WidgetKit

/// Debug builds only: each complication size drawn in the app, at roughly its
/// size on a 46mm watch, for checking and screenshots. Corner labels only show on a real face.
/// simctl launch <watch> <bundle id> -complications
struct ComplicationGallery: View {
    let feed: Feed?

    var body: some View {
        let entry = NextShowtimeEntry(date: .now, feed: feed)
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                NextShowtimeComplicationView(entry: entry, family: .accessoryRectangular)
                    .frame(width: 184, height: 82, alignment: .leading)
                HStack(spacing: 16) {
                    NextShowtimeComplicationView(entry: entry, family: .accessoryCircular)
                        .frame(width: 52, height: 52)
                    NextShowtimeComplicationView(entry: entry, family: .accessoryCorner)
                        .frame(width: 52, height: 52)
                }
                NextShowtimeComplicationView(entry: entry, family: .accessoryInline)
                    .lineLimit(1)
                    .frame(width: 184, alignment: .leading)
            }
        }
    }
}
#endif

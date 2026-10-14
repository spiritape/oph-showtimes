import EventKit
import EventKitUI
import SwiftUI

/// Apple's own "New Event" screen, prefilled with the Showtime. The person
/// saves it themselves, so the app never asks for calendar access.
struct AddToCalendarSheet: UIViewControllerRepresentable {
    let item: ScheduledShowtime
    let theater: Theater?
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> EKEventEditViewController {
        let store = EKEventStore()
        let event = EKEvent(eventStore: store)
        event.title = item.title.name
        event.startDate = item.showtime.startsAt
        event.endDate = item.showtime.endsAt
        event.url = item.title.url
        if let theater {
            event.location = "\(theater.name), \(theater.address)"
            event.timeZone = TimeZone(identifier: theater.timeZone)
        }
        event.notes = [item.showtime.price, item.showtime.booking.map { "\($0.label): \($0.url.absoluteString)" }]
            .compactMap(\.self)
            .joined(separator: "\n")

        let controller = EKEventEditViewController()
        controller.eventStore = store
        controller.event = event
        controller.editViewDelegate = context.coordinator
        return controller
    }

    func updateUIViewController(_ controller: EKEventEditViewController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(dismiss: dismiss) }

    @MainActor final class Coordinator: NSObject, @preconcurrency EKEventEditViewDelegate {
        let dismiss: DismissAction
        init(dismiss: DismissAction) { self.dismiss = dismiss }

        func eventEditViewController(_ controller: EKEventEditViewController, didCompleteWith action: EKEventEditViewAction) {
            dismiss()
        }
    }
}

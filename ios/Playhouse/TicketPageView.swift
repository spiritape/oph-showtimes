import SafariServices
import SwiftUI

/// A ticket or RSVP page to open inside the app (Veezi, Eventbrite, TicketWeb…).
struct TicketPage: Identifiable {
    let url: URL
    var id: URL { url }
}

/// The provider's own page in Safari's in-app view, so buying a ticket
/// doesn't send people out of the app. Sign-ins and saved cards from Safari
/// work here too.
struct TicketPageView: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        let controller = SFSafariViewController(url: url)
        controller.preferredControlTintColor = UIColor(named: "AccentColor")
        controller.dismissButtonStyle = .done
        return controller
    }

    func updateUIViewController(_ controller: SFSafariViewController, context: Context) {}
}

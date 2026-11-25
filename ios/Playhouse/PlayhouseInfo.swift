import Foundation

/// The Playhouse's own visitor information, from https://www.ojaiplayhouse.com/info.
/// It rarely changes; when the Playhouse updates that page, update this too.
enum PlayhouseInfo {
    static let website = URL(string: "https://www.ojaiplayhouse.com")!
    static let phone = "805.646.1011"
    static let phoneURL = URL(string: "tel:8056461011")!
    static let email = "info@ojaiplayhouse.com"
    static let emailURL = URL(string: "mailto:info@ojaiplayhouse.com")!
    static let address = "145 E Ojai Ave, Ojai, CA 93023"
    static let directionsURL = URL(string: "https://maps.apple.com/?q=Ojai%20Playhouse&address=145%20E%20Ojai%20Ave,%20Ojai,%20CA%2093023")!
    /// Directions in the Google Maps app when it's installed, otherwise on the web.
    static let googleDirectionsURL = URL(string: "https://www.google.com/maps/dir/?api=1&destination=Ojai%20Playhouse,%20145%20E%20Ojai%20Ave,%20Ojai,%20CA%2093023")!
}

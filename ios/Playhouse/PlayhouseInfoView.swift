import SwiftUI

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

/// Box office, parking, policies and the rest, opened from Settings › About.
struct PlayhouseInfoView: View {
    var body: some View {
        Form {
            Group {
                section("Box Office", systemImage: "ticket") {
                    Text("107 S. Signal Street, directly behind the Playhouse and across from the Post Office and Libbey Park.")
                    Text("Opens 60 minutes before showtime. All tickets are held at will call and must be picked up at the box office before entering the Playhouse.")
                }
                section("About the Playhouse", systemImage: "building.columns") {
                    Text("Opened in 1914, the Ojai Playhouse is a historic 200-seat, single-screen movie theater at 145 E. Ojai Ave, next to Libbey Park. It screens digital and 35mm films, and curates music, comedy, variety and more.")
                }
                section("Parking", systemImage: "car") {
                    Text("On Ojai city streets, north and south of E. Ojai Avenue.")
                    Text("ADA parking is on E. Ojai Avenue and S. Signal Street.")
                }
                section("Food & Drink", systemImage: "cup.and.saucer") {
                    Text("Popcorn, candy, fountain soda, beer & wine, and specialty drinks.")
                }
                section("Accessibility", systemImage: "figure.roll") {
                    Text("The Ojai Playhouse is ADA accessible.")
                }
                section("Seating", systemImage: "chair") {
                    Text("Movies are general admission.")
                    Text("Music, comedy and other events may be general admission or reserved seating.")
                }
                section("Tickets", systemImage: "creditcard") {
                    Text("Sold on the Ojai Playhouse website. Prices vary by movie and event; see each one's details for pricing.")
                }
                section("Policies", systemImage: "list.bullet.clipboard") {
                    Text("All sales are final. No refunds or exchanges.")
                    Text("No late entry. Please arrive and be seated at least 15 minutes before the screening or performance.")
                    Text("Phones must be off inside the theater during the movie or performance.")
                    Text("No outside food, candy or drink.")
                    Text("No smoking or vaping.")
                    Text("Children 16 and under must be with an adult.")
                    Text("The Ojai Playhouse reserves the right to refuse service to anyone.")
                }
                section("Sustainability", systemImage: "leaf") {
                    Text("The Playhouse looks for green solutions across the theater's operations wherever it can.")
                }
            }
            .listRowBackground(Color.appGroupedSurface)
        }
        .appGroupedBackground()
        .navigationTitle("Visiting the Playhouse")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func section(_ title: String, systemImage: String, @ViewBuilder rows: () -> some View) -> some View {
        Section {
            rows()
        } header: {
            Label(title, systemImage: systemImage)
        }
    }
}

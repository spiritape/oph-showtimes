# The Apple Watch app reads the feed itself and hands everything else to the iPhone

We added an Apple Watch app with complications, shipped inside the iPhone app (`ios/Watch`, `ios/WatchWidgets`). The watch downloads `api/v1/schedule.json` on its own and saves it in its own copy of the App Group. We didn't relay the Feed from the phone over WatchConnectivity. App Groups don't span devices, and the complications have to refresh while the phone is out of reach. The watch only shows the schedule. Tickets, Add to Calendar and Film Requests stay on the iPhone, reached by Handoff (`AppLink.handoffActivity`). Ticket pages and typing a search don't work on a watch.

## Consequences

- The watch is another reader of the `v1` feed contract (ADR 0003), so the same no-breaking-changes rule covers it.
- Two more bundle IDs (`com.ojaishowtimes.app.watchkitapp` and `.watchkitapp.widgets`) and the App Group have to be re-registered when the app moves to the Playhouse's account.
- The App Store listing needs Apple Watch screenshots.

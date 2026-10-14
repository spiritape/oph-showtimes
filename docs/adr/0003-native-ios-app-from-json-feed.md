# A native SwiftUI iOS app reads a JSON feed published by the build

We want the schedule in the App Store, with native push, widgets and Apple Calendar. The website stays the primary product. We chose a native SwiftUI app (in `ios/`) over a wrapper of the site (Capacitor) and over a cross-platform app (Expo / React Native). A wrapper risks App Store rejection as "just a website" (guideline 4.2). In both other options, widgets and Live Activities would still need native Swift. The app doesn't parse the Source itself: the build publishes `/api/v1/schedule.json` from the same Titles it renders as HTML, so the site and the app can't disagree. Android is a separate, later decision.

## Consequences

- The feed is a public contract, and installed apps keep reading it long after a release. Breaking changes go to a new path (`/api/v2/…`) while `v1` keeps being published.
- The watcher sends New Title Notifications over two transports: Web Push for browser Subscribers and APNs for app Subscribers. App notifications show the first New Title's poster.
- The app starts on the maintainer's Apple developer account and will be transferred to the Playhouse. Apple doesn't transfer APNs keys, and the App Group has to be re-registered after a transfer. So the watcher reads the APNs key, key ID and team ID from secrets, and nothing tied to a team is hard-coded.

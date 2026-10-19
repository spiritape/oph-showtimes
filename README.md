# OPH Showtimes

An unofficial, fast, minimal schedule for the [Ojai Playhouse](https://www.ojaiplayhouse.com/), live at [ojaishowtimes.com](https://ojaishowtimes.com), with one-tap Google Calendar links and optional browser notifications for New Titles. New titles appear within a few minutes of the Playhouse announcing them. Not affiliated with the Playhouse.

See [CONTEXT.md](CONTEXT.md) for the vocabulary (Showtime, Title, Live Show…) and [docs/adr](docs/adr) for decisions.

## How it works

Two pieces ([ADR 0002](docs/adr/0002-cloudflare-watcher-for-fast-updates.md)):

**The watcher** (`worker/`, a Cloudflare Worker) reads the Playhouse homepage every 2 minutes. When the schedule changes, it starts the GitHub build. It also stores notification Subscribers and sends New Title Notifications for the build.

**The build** (`src/`, GitHub Actions `update.yml`) runs when the watcher starts it, and every hour as a fallback:

1. Reads the schedule from the homepage's embedded data ([ADR 0001](docs/adr/0001-read-schedule-from-nuxt-payload.md)).
2. Refuses to publish if the read looks broken, and opens an issue instead.
3. If the schedule changed, or the site hasn't been refreshed for 3 hours, builds static HTML, and the iOS app's JSON feed `api/v1/schedule.json` ([ADR 0003](docs/adr/0003-native-ios-app-from-json-feed.md)), into `dist/` and deploys it to Cloudflare Pages.
4. Commits `data/state.json`: the Titles seen recently, with their played Showtimes (for New Title detection, 60-day finished pages, the Past list and stable URLs) and a fingerprint of the published schedule.
5. Sends a New Title Notification through the watcher if any New Titles appeared. If most of the schedule looks new, it holds the notification back and opens an issue, because that usually means a misread.

Starting **Update schedule** by hand from the Actions tab always republishes. Tests run in a separate workflow on every push.

## Changing the look

The header, the buttons (Notify, filters, Tickets/RSVP), the schedule list's spacing and the footer's text and look come from `HEADER_STYLE` in [src/header-style.ts](src/header-style.ts). Change it there, or use the Header Editor: a live-preview page ([tools/header-editor.html](tools/header-editor.html), published as a private claude.ai artifact) whose Save button stores the same fields for Claude to copy into `HEADER_STYLE`. Web fonts load from Google Fonts only when one is chosen.

## Local development

```bash
npm install
npm test
SOURCE_FILE=test/fixtures/home.html npm run build   # or omit SOURCE_FILE to fetch live
node scripts/serve.mjs                               # http://localhost:8080
```

A local build writes `data/state.json`. Don't commit one built from the fixture.

## iOS app

`ios/` holds the native SwiftUI app ([ADR 0003](docs/adr/0003-native-ios-app-from-json-feed.md)), which reads the feed at `api/v1/schedule.json`. `ios/project.yml` is the source of truth for the Xcode project: after changing it, run `xcodegen` in `ios/` (`brew install xcodegen`), then open `ios/Playhouse.xcodeproj`. Run the app's tests with:

```bash
xcodebuild test -project ios/Playhouse.xcodeproj -scheme Playhouse -destination 'platform=iOS Simulator,name=iPhone 18 Pro'
```

To send a build to TestFlight, raise `CURRENT_PROJECT_VERSION` in [ios/project.yml](ios/project.yml) by one (App Store Connect refuses a build number it has seen), run `xcodegen` in `ios/`, then archive and upload. Xcode must be signed in to the Apple account under Settings → Accounts:

```bash
xcodebuild archive -project ios/Playhouse.xcodeproj -scheme Playhouse -configuration Release -destination generic/platform=iOS -archivePath ios/build/Playhouse.xcarchive -allowProvisioningUpdates
xcodebuild -exportArchive -archivePath ios/build/Playhouse.xcarchive -exportOptionsPlist ios/ExportOptions.plist -exportPath ios/build/export -allowProvisioningUpdates
```

The app's push notifications go through the watcher's APNs secrets (see [worker/wrangler.toml](worker/wrangler.toml)). To test them without messaging website Subscribers, run **Send test notification** with *Who gets it* set to `app`.

## Setup

1. **Cloudflare Pages**: a Pages project named `oph-showtimes` (Direct Upload), and an API token with *Cloudflare Pages: Edit*. The domain `ojaishowtimes.com` (registered with Cloudflare) and its `www.` are added under the project's *Custom domains*; pages send visitors from `www.` and the old `oph-showtimes.pages.dev` address to it.
2. **GitHub repo → Settings → Secrets and variables → Actions**:
   - Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `NOTIFY_SECRET`
   - Variables: `SITE_URL` (`https://ojaishowtimes.com`), `CONTACT_EMAIL`, `WATCHER_URL`, `VAPID_PUBLIC_KEY`
3. **Watcher**: `npm run deploy:watcher`, then set the secrets listed at the top of [worker/wrangler.toml](worker/wrangler.toml).

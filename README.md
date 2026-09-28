# OPH Showtimes

An unofficial, fast, minimal schedule for the [Ojai Playhouse](https://www.ojaiplayhouse.com/), with one-tap Google Calendar links and optional browser notifications for New Titles. New titles appear within a few minutes of the Playhouse announcing them. Not affiliated with the Playhouse.

See [CONTEXT.md](CONTEXT.md) for the vocabulary (Showtime, Title, Live Show…) and [docs/adr](docs/adr) for decisions.

## How it works

Two pieces ([ADR 0002](docs/adr/0002-cloudflare-watcher-for-fast-updates.md)):

**The watcher** (`worker/`, a Cloudflare Worker) reads the Playhouse homepage every 2 minutes. When the schedule changes, it starts the GitHub build. It also stores notification Subscribers and sends New Title Notifications for the build.

**The build** (`src/`, GitHub Actions `update.yml`) runs when the watcher starts it, and every hour as a fallback:

1. Reads the schedule from the homepage's embedded data ([ADR 0001](docs/adr/0001-read-schedule-from-nuxt-payload.md)).
2. Refuses to publish if the read looks broken, and opens an issue instead.
3. If the schedule changed, or the site hasn't been refreshed for 3 hours, builds static HTML into `dist/` and deploys it to Cloudflare Pages.
4. Commits `data/state.json`: the Titles seen recently (for New Title detection, 60-day finished pages and stable URLs) and a fingerprint of the published schedule.
5. Sends a New Title Notification through the watcher if any New Titles appeared. If most of the schedule looks new, it holds the notification back and opens an issue, because that usually means a misread.

Starting **Update schedule** by hand from the Actions tab always republishes. Tests run in a separate workflow on every push.

## Local development

```bash
npm install
npm test
SOURCE_FILE=test/fixtures/home.html npm run build   # or omit SOURCE_FILE to fetch live
node scripts/serve.mjs                               # http://localhost:8080
```

A local build writes `data/state.json`. Don't commit one built from the fixture.

## Setup

1. **Cloudflare Pages**: a Pages project named `oph-showtimes` (Direct Upload), and an API token with *Cloudflare Pages: Edit*.
2. **GitHub repo → Settings → Secrets and variables → Actions**:
   - Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `NOTIFY_SECRET`
   - Variables: `SITE_URL`, `CONTACT_EMAIL`, `WATCHER_URL`, `VAPID_PUBLIC_KEY`
3. **Watcher**: `npm run deploy:watcher`, then set the secrets listed at the top of [worker/wrangler.toml](worker/wrangler.toml).

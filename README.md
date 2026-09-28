# OPH Showtimes

An unofficial, fast, minimal schedule for the [Ojai Playhouse](https://www.ojaiplayhouse.com/), with calendar feeds. It picks up newly announced titles within about 15 minutes. Not affiliated with the Playhouse.

See [CONTEXT.md](CONTEXT.md) for the vocabulary (Showtime, Title, Calendar Feed…) and [docs/adr](docs/adr) for decisions.

## How it works

A GitHub Actions job checks the Playhouse every 15 minutes (GitHub's scheduler can run a few minutes late):

1. Fetches the Playhouse homepage and reads the schedule from its embedded data ([ADR 0001](docs/adr/0001-read-schedule-from-nuxt-payload.md)).
2. Refuses to publish if the read looks broken, and opens an issue instead.
3. If the schedule changed, or the site hasn't been refreshed for 3 hours, builds static HTML and `.ics` calendar feeds into `dist/` and deploys them to Cloudflare Pages. Otherwise it stops there.
4. After a deploy, commits `data/state.json`: the Titles seen recently (so finished Titles keep their page for 60 days and every Title keeps its URL) and a fingerprint of the published schedule.

Starting the workflow by hand from the Actions tab always republishes. Tests run in a separate workflow on every push.

## Local development

```bash
npm install
npm test
SOURCE_FILE=test/fixtures/home.html npm run build   # or omit SOURCE_FILE to fetch live
node scripts/serve.mjs                               # http://localhost:8080
```

A local build writes `data/state.json`. Don't commit one built from the fixture.

## Setup

1. **Cloudflare Pages**: create a Pages project named `oph-showtimes` (Direct Upload). Create an API token with the *Cloudflare Pages: Edit* permission.
2. **GitHub repo settings → Secrets and variables → Actions**:
   - Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
   - Variables: `SITE_URL` (e.g. `https://oph-showtimes.pages.dev`), `CONTACT_EMAIL` (sent to the Playhouse in the User-Agent)
3. Run the **Update schedule** workflow once by hand.

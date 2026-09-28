# OPH Showtimes

An unofficial, fast, minimal schedule for the [Ojai Playhouse](https://www.ojaiplayhouse.com/), with calendar feeds and email alerts when new titles are announced. Not affiliated with the Playhouse.

See [CONTEXT.md](CONTEXT.md) for the vocabulary (Showtime, Title, New Title Alert…) and [docs/adr](docs/adr) for decisions.

## How it works

A GitHub Actions job runs every 3 hours:

1. Fetches the Playhouse homepage and reads the schedule from its embedded data ([ADR 0001](docs/adr/0001-read-schedule-from-nuxt-payload.md)).
2. Refuses to publish or alert if the read looks broken, and opens an issue instead.
3. Builds static HTML and `.ics` calendar feeds into `dist/`, then deploys them to Cloudflare Pages.
4. Emails Subscribers through Buttondown if any new Titles appeared.
5. Commits `data/state.json`, the record of every Title seen so far.

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
2. **Buttondown**: create a newsletter and enable double opt-in. Copy your username and API key.
3. **GitHub repo settings → Secrets and variables → Actions**:
   - Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `BUTTONDOWN_API_KEY`
   - Variables: `SITE_URL` (e.g. `https://oph-showtimes.pages.dev`), `BUTTONDOWN_USERNAME`, `CONTACT_EMAIL` (sent to the Playhouse in the User-Agent)
4. Run the **Update schedule** workflow once by hand. The first run records every current Title and sends no email.

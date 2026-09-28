# Read the schedule from the Source's embedded page data

OPH Showtimes is unofficial, so we have no access to the Playhouse's Hygraph CMS API or its Veezi ticketing feed. The Source (ojaiplayhouse.com) is a server-rendered Nuxt site, and every page includes the full list of upcoming Showtimes as JSON in its `__NUXT_DATA__` script tag. We read that JSON instead of scraping the visible HTML or running a headless browser. It is structured and complete, and fetching it only takes a plain HTTP request. It is also an undocumented internal format that will break without warning when the Source is redeployed. That is why the build refuses to publish, and refuses to send alerts, when a read looks wrong (it fails, returns zero Showtimes, or returns less than half of the previous count).

## Considered Options

- **Hygraph content API or Veezi feed**: the best option, but it needs the Playhouse's cooperation. We should switch to it if they ever offer access.
- **Scraping the rendered HTML**: more fragile than the payload, and missing fields (synopsis, links).
- **Instagram**: no public API for other accounts, and scraping it requires logging in. It's out of scope. We only link to their profile.

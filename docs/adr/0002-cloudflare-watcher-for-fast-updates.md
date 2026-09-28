# A Cloudflare Worker watches the Source; GitHub still builds the site

GitHub Actions' scheduler is best-effort: runs start late (often 5–30 minutes) and are sometimes skipped, which made New Titles slow to appear. We added a small Cloudflare Worker that reads the Source every 2 minutes on Cloudflare's reliable cron. When the schedule's fingerprint changes, it starts the existing GitHub build through `workflow_dispatch`. We didn't move the build itself onto Cloudflare because that was a rewrite. The Worker also stores notification Subscribers in Workers KV and sends New Title Notifications (Web Push) when the build asks it to, so there is still no server of our own.

## Consequences

- There are two platforms to keep healthy. GitHub's hourly schedule stays on as a fallback in case the Worker stops.
- The Worker holds a fine-grained GitHub token that can only start this repo's workflows.
- Workers' free plan allows 50 outbound requests per invocation, so the build sends a New Title Notification in pages of Subscribers.
- Web Push reaches iPhones only after the site is added to the home screen (an Apple rule).

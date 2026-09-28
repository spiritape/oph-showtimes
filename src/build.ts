// Scheduled build: read the Source, publish the site into dist/, and queue a
// New Title Alert. Exits non-zero (publishing nothing) when the read looks wrong.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { checkForNewTitles, type SeenState } from "./alerts.ts";
import { ALERT_FILE, OUT, STATE_FILE } from "./build-paths.ts";
import { composeAlert } from "./email.ts";
import { guardRead } from "./guard.ts";
import { calendar } from "./ics.ts";
import { renderNotFound, renderSchedule, renderTitle, type SiteConfig } from "./render.ts";
import { buildSchedule } from "./schedule.ts";
import { fetchSource, readSource } from "./source.ts";


type State = { lastReadCount: number; seen: SeenState };

const config: SiteConfig = {
  siteUrl: (process.env.SITE_URL ?? "http://localhost:8080").replace(/\/$/, ""),
  buttondownUsername: process.env.BUTTONDOWN_USERNAME || null,
};
const contactEmail = process.env.CONTACT_EMAIL ?? "no contact configured";
const now = new Date();

const state: State | null = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : null;

let html = "";
try {
  html = process.env.SOURCE_FILE ? readFileSync(process.env.SOURCE_FILE, "utf8") : await fetchSource(contactEmail);
} catch (err) {
  html = "";
  console.error(err);
}
const read = guardRead(state?.lastReadCount ?? null, () => readSource(html));
if (!read.ok) {
  console.error(`::error::Not publishing: ${read.reason}`);
  process.exit(1);
}

const titles = buildSchedule(read.showtimes);
const { newTitles, seen } = checkForNewTitles(state?.seen ?? null, titles, now);

// Finished Titles keep their page for a while (see RETURNING_AFTER_DAYS).
const current = new Set(titles.map((t) => t.name));
const archived = Object.values(seen.titles)
  .map((e) => e.title)
  .filter((t) => !current.has(t.name) && !titles.some((c) => c.slug === t.slug));

const write = (path: string, content: string) => {
  mkdirSync(dirname(`${OUT}/${path}`), { recursive: true });
  writeFileSync(`${OUT}/${path}`, content);
};

rmSync(OUT, { recursive: true, force: true });
write("index.html", renderSchedule(titles, config, false));
write("films/index.html", renderSchedule(titles, config, true));
for (const t of [...titles, ...archived]) write(`t/${t.slug}/index.html`, renderTitle(t, config, now));

const items = titles.flatMap((title) => title.showtimes.map((showtime) => ({ title, showtime })));
write("calendar/all.ics", calendar("Ojai Playhouse (OPH Showtimes)", items, config.siteUrl, now));
write(
  "calendar/films.ics",
  calendar("Ojai Playhouse films (OPH Showtimes)", items.filter((i) => i.title.isFilm), config.siteUrl, now),
);
for (const item of items) write(`ics/${item.showtime.id}.ics`, calendar(item.title.name, [item], config.siteUrl, now));
write("_headers", "/*.ics\n  Content-Type: text/calendar; charset=utf-8\n/*\n  Cache-Control: public, max-age=300\n");
write("404.html", renderNotFound(config));

mkdirSync("data", { recursive: true });
writeFileSync(STATE_FILE, JSON.stringify({ lastReadCount: read.showtimes.length, seen } satisfies State, null, 1) + "\n");
if (newTitles.length) writeFileSync(ALERT_FILE, JSON.stringify(composeAlert(newTitles, config.siteUrl), null, 2));
else rmSync(ALERT_FILE, { force: true });

console.log(
  `Built ${titles.length} Titles (${read.showtimes.length} Showtimes, ${archived.length} archived). ` +
    (state ? `${newTitles.length} new: ${newTitles.map((t) => t.name).join(", ") || "none"}.` : "First run: no alert."),
);

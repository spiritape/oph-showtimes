// Scheduled build: read the Source, publish the site into dist/, and queue a
// New Title Alert. Exits non-zero (publishing nothing) when the read looks wrong.
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { checkForNewTitles, finishedTitles, knownSlugs, type SeenState } from "./alerts.ts";
import { calendarFeed } from "./calendar-feed.ts";
import { composeAlert } from "./email.ts";
import { guardAlert, guardRead } from "./guard.ts";
import { ALERT_FILE, OUT_DIR, STATE_FILE } from "./paths.ts";
import { renderNotFound, renderSchedule, renderTitle, type SiteConfig } from "./render.ts";
import { buildSchedule } from "./schedule.ts";
import { isListed } from "./showtime.ts";
import { fetchSource, readSource } from "./source.ts";

type BuildState = { lastReadCount: number; seen: SeenState };

const config: SiteConfig = {
  siteUrl: (process.env.SITE_URL || "http://localhost:8080").replace(/\/$/, ""),
  buttondownUsername: process.env.BUTTONDOWN_USERNAME || null,
};
const now = new Date();
const previous: BuildState | null = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : null;

/** Passes a value to later workflow steps when running in GitHub Actions. */
const setOutput = (name: string, value: string) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value.replace(/\n/g, " ")}\n`);
};

async function loadSourceHtml(): Promise<string> {
  if (process.env.SOURCE_FILE) return readFileSync(process.env.SOURCE_FILE, "utf8");
  const contactEmail = process.env.CONTACT_EMAIL;
  if (!contactEmail) throw new Error("CONTACT_EMAIL must be set: it goes in the User-Agent sent to the Source");
  return fetchSource(contactEmail);
}

let sourceHtml: string;
try {
  sourceHtml = await loadSourceHtml();
} catch (err) {
  console.error(`::error::Not publishing: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
const read = guardRead(previous?.lastReadCount ?? null, () => readSource(sourceHtml));
if (!read.ok) {
  console.error(`::error::Not publishing: ${read.reason}`);
  process.exit(1);
}

const titles = buildSchedule(read.showtimes, knownSlugs(previous?.seen ?? null));
const { newTitles, seen } = checkForNewTitles(previous?.seen ?? null, titles, now);
const finished = finishedTitles(seen, titles);

const write = (path: string, content: string) => {
  mkdirSync(dirname(`${OUT_DIR}/${path}`), { recursive: true });
  writeFileSync(`${OUT_DIR}/${path}`, content);
};

rmSync(OUT_DIR, { recursive: true, force: true });
write("index.html", renderSchedule(titles, config, { filmsOnly: false, now }));
write("films/index.html", renderSchedule(titles, config, { filmsOnly: true, now }));
for (const title of [...titles, ...finished]) write(`t/${title.slug}/index.html`, renderTitle(title, config, now));
write("404.html", renderNotFound(config));

const upcoming = titles.flatMap((title) =>
  title.showtimes.filter((s) => isListed(s, now)).map((showtime) => ({ title, showtime })),
);
write("calendar/all.ics", calendarFeed("Ojai Playhouse (OPH Showtimes)", upcoming, config.siteUrl, now));
const films = upcoming.filter((s) => s.title.isFilm);
write("calendar/films.ics", calendarFeed("Ojai Playhouse films (OPH Showtimes)", films, config.siteUrl, now));
for (const s of upcoming) write(`ics/${s.showtime.id}.ics`, calendarFeed(s.title.name, [s], config.siteUrl, now));
write("_headers", "/*.ics\n  Content-Type: text/calendar; charset=utf-8\n/*\n  Cache-Control: public, max-age=300\n");

mkdirSync(dirname(STATE_FILE), { recursive: true });
const state: BuildState = { lastReadCount: read.showtimes.length, seen };
writeFileSync(STATE_FILE, JSON.stringify(state, null, 1) + "\n");

rmSync(ALERT_FILE, { force: true });
const alertCheck = guardAlert(newTitles.length, titles.length);
if (newTitles.length && alertCheck.ok) {
  writeFileSync(ALERT_FILE, JSON.stringify(composeAlert(newTitles, config.siteUrl), null, 2));
} else if (!alertCheck.ok) {
  // Still publish and remember these Titles, but let a person decide about the email.
  console.warn(`::warning::Alert held back: ${alertCheck.reason}`);
  setOutput("alert_held", `${alertCheck.reason}: ${newTitles.map((t) => t.name).join(", ")}`);
}

console.log(
  `Built ${titles.length} Titles (${read.showtimes.length} Showtimes, ${finished.length} finished). ` +
    (previous ? `${newTitles.length} new: ${newTitles.map((t) => t.name).join(", ") || "none"}.` : "First run: no alert."),
);

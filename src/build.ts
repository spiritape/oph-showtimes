// Frequent check of the Source: publishes the site into dist/ when the
// schedule changed (or the site is due a refresh). Exits non-zero, publishing
// nothing, when the read looks wrong.
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { guardNotification, guardRead } from "./guard.ts";
import { composeNotification } from "./notification.ts";
import { NOTIFICATION_FILE, OUT_DIR, STATE_FILE } from "./paths.ts";
import { hashSchedule, shouldPublish, type LastPublish } from "./refresh.ts";
import { renderNotFound, renderPast, renderSchedule, renderTitle, SCHEDULE_PAGES, type SiteConfig } from "./render.ts";
import { buildSchedule } from "./schedule.ts";
import { findNewTitles, finishedTitles, knownSlugs, pastShowtimes, rememberTitles, type SeenTitles } from "./seen-titles.ts";
import { fetchSource, readSource } from "./source.ts";

type BuildState = { lastReadCount: number; lastPublish?: LastPublish; seen: SeenTitles };

const config: SiteConfig = {
  siteUrl: (process.env.SITE_URL || "http://localhost:8080").replace(/\/$/, ""),
  notifications:
    process.env.WATCHER_URL && process.env.VAPID_PUBLIC_KEY
      ? { watcherUrl: process.env.WATCHER_URL.replace(/\/$/, ""), vapidPublicKey: process.env.VAPID_PUBLIC_KEY }
      : null,
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

const scheduleHash = hashSchedule(read.showtimes);
if (!process.env.FORCE_PUBLISH && !shouldPublish(previous?.lastPublish ?? null, scheduleHash, now)) {
  console.log("Schedule unchanged since the last publish; nothing to do.");
  setOutput("publish", "false");
  process.exit(0);
}

const titles = buildSchedule(read.showtimes, knownSlugs(previous?.seen ?? null));
const newTitles = findNewTitles(previous?.seen ?? null, titles, now);
const seen = rememberTitles(previous?.seen ?? null, titles, now);
const finished = finishedTitles(seen, titles);
const past = pastShowtimes(seen, now);

const write = (path: string, content: string) => {
  mkdirSync(dirname(`${OUT_DIR}/${path}`), { recursive: true });
  writeFileSync(`${OUT_DIR}/${path}`, content);
};

rmSync(OUT_DIR, { recursive: true, force: true });
cpSync("public", OUT_DIR, { recursive: true });
for (const { filter, file } of SCHEDULE_PAGES) write(file, renderSchedule(titles, config, { filter, now, past }));
write("past/index.html", renderPast(past, config));
for (const title of [...titles, ...finished]) write(`t/${title.slug}/index.html`, renderTitle(title, config, now));
write("404.html", renderNotFound(config));

mkdirSync(dirname(STATE_FILE), { recursive: true });
const state: BuildState = {
  lastReadCount: read.showtimes.length,
  lastPublish: { scheduleHash, publishedAt: now.toISOString() },
  seen,
};
writeFileSync(STATE_FILE, JSON.stringify(state, null, 1) + "\n");
setOutput("publish", "true");

rmSync(NOTIFICATION_FILE, { force: true });
const notificationCheck = guardNotification(newTitles.length, titles.length);
if (newTitles.length && notificationCheck.ok) {
  writeFileSync(NOTIFICATION_FILE, JSON.stringify(composeNotification(newTitles, config.siteUrl), null, 2));
} else if (!notificationCheck.ok) {
  // Still publish and remember these Titles, but let a person decide.
  console.warn(`::warning::Notification held back: ${notificationCheck.reason}`);
  setOutput("notification_held", `${notificationCheck.reason}: ${newTitles.map((t) => t.name).join(", ")}`);
}

const changed = previous?.lastPublish?.scheduleHash !== scheduleHash;
console.log(
  `Built ${titles.length} Titles (${read.showtimes.length} Showtimes, ${finished.length} finished). ` +
    (changed ? "Schedule changed." : "Scheduled refresh.") +
    (newTitles.length ? ` New Titles: ${newTitles.map((t) => t.name).join(", ")}.` : ""),
);

import { isListed } from "./showtime.ts";
import type { ScheduledShowtime, Showtime, Title } from "./types.ts";

/** How long a finished Title keeps its page after its last Showtime. */
export const KEEP_FINISHED_DAYS = 60;
const DAY = 86_400_000;

/** Every Title seen recently, by Title key, with a snapshot for finished Title pages. */
export type SeenTitles = {
  titles: Record<string, { lastShowtime: string; title: Title }>;
};

const isRecent = (s: Showtime, now: Date) => now.getTime() - Date.parse(s.startsAt) <= KEEP_FINISHED_DAYS * DAY;

/**
 * Records the current schedule and forgets Titles finished over 60 days ago.
 * The Source drops Showtimes once they've played, so a Title's snapshot keeps
 * its played Showtimes from the last 60 days for the Past list.
 */
export function rememberTitles(seen: SeenTitles | null, titles: Title[], now: Date): SeenTitles {
  const next: SeenTitles = { titles: { ...seen?.titles } };
  for (const title of titles) {
    const current = new Set(title.showtimes.map((s) => s.id));
    const played = (seen?.titles[title.key]?.title.showtimes ?? []).filter(
      (s) => !current.has(s.id) && Date.parse(s.startsAt) <= now.getTime() && isRecent(s, now),
    );
    const showtimes = [...played, ...title.showtimes].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const last = showtimes.at(-1)?.startsAt;
    if (last) next.titles[title.key] = { lastShowtime: last, title: { ...title, showtimes } };
  }
  for (const [key, entry] of Object.entries(next.titles)) {
    if (now.getTime() - Date.parse(entry.lastShowtime) > KEEP_FINISHED_DAYS * DAY) delete next.titles[key];
  }
  return next;
}

/** Titles no longer on the schedule whose pages we still keep. */
export function finishedTitles(seen: SeenTitles, current: Title[]): Title[] {
  const currentKeys = new Set(current.map((t) => t.key));
  return Object.values(seen.titles)
    .map((entry) => entry.title)
    .filter((t) => !currentKeys.has(t.key));
}

/** Slug of every remembered Title, by key, so slugs stay put between runs. */
export function knownSlugs(seen: SeenTitles | null): Record<string, string> {
  return Object.fromEntries(Object.entries(seen?.titles ?? {}).map(([key, entry]) => [key, entry.title.slug]));
}

/**
 * New Titles: on the schedule now, but not seen at any point in the last 60
 * days. With no memory yet (the first run) nothing counts as new.
 */
export function findNewTitles(seen: SeenTitles | null, titles: Title[], now: Date): Title[] {
  if (!seen) return [];
  return titles.filter((title) => {
    const known = seen.titles[title.key];
    return !known || now.getTime() - Date.parse(known.lastShowtime) > KEEP_FINISHED_DAYS * DAY;
  });
}

/** Showtimes that have played in the last 60 days, most recent first. */
export function pastShowtimes(seen: SeenTitles, now: Date): ScheduledShowtime[] {
  return Object.values(seen.titles)
    .flatMap(({ title }) =>
      title.showtimes.filter((s) => !isListed(s, now) && isRecent(s, now)).map((showtime) => ({ title, showtime })),
    )
    .sort((a, b) => b.showtime.startsAt.localeCompare(a.showtime.startsAt));
}

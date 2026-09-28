import type { Title } from "./types.ts";

/** How long a finished Title keeps its page after its last Showtime. */
export const KEEP_FINISHED_DAYS = 60;
const DAY = 86_400_000;

/** Every Title seen recently, by Title key, with a snapshot for finished Title pages. */
export type SeenTitles = {
  titles: Record<string, { lastShowtime: string; title: Title }>;
};

/** Records the current schedule and forgets Titles finished over 60 days ago. */
export function rememberTitles(seen: SeenTitles | null, titles: Title[], now: Date): SeenTitles {
  const next: SeenTitles = { titles: { ...seen?.titles } };
  for (const title of titles) {
    const last = title.showtimes.at(-1)?.startsAt;
    if (last) next.titles[title.key] = { lastShowtime: last, title };
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

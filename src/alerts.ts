import type { Title } from "./types.ts";

export const RETURNING_AFTER_DAYS = 60;
const DAY = 86_400_000;

/** Every Title we've seen, by Title key, with a snapshot for archived Title pages. */
export type SeenState = {
  titles: Record<string, { lastShowtime: string; title: Title }>;
};

/**
 * Compares the current schedule against what we've seen. On the first run
 * (no state yet) nothing counts as new, so Subscribers aren't flooded.
 */
export function checkForNewTitles(
  seen: SeenState | null,
  titles: Title[],
  now: Date,
): { newTitles: Title[]; seen: SeenState } {
  const next: SeenState = { titles: { ...seen?.titles } };
  const newTitles: Title[] = [];

  for (const title of titles) {
    const first = title.showtimes[0]?.startsAt;
    const last = title.showtimes.at(-1)?.startsAt;
    if (!first || !last) continue;
    const known = next.titles[title.key];
    const returning = known && Date.parse(first) - Date.parse(known.lastShowtime) > RETURNING_AFTER_DAYS * DAY;
    if (seen && (!known || returning)) {
      newTitles.push(title);
    }
    const keepLater = known && !newTitles.includes(title) && Date.parse(known.lastShowtime) > Date.parse(last);
    const lastShowtime = keepLater ? known.lastShowtime : last;
    next.titles[title.key] = { lastShowtime, title };
  }

  for (const [key, entry] of Object.entries(next.titles)) {
    if (now.getTime() - Date.parse(entry.lastShowtime) > RETURNING_AFTER_DAYS * DAY) delete next.titles[key];
  }
  return { newTitles, seen: next };
}

/** Titles no longer on the schedule whose pages we still keep. */
export function finishedTitles(seen: SeenState, current: Title[]): Title[] {
  const currentKeys = new Set(current.map((t) => t.key));
  return Object.values(seen.titles)
    .map((entry) => entry.title)
    .filter((t) => !currentKeys.has(t.key));
}

/** Slug of every remembered Title, by key, so slugs stay put between runs. */
export function knownSlugs(seen: SeenState | null): Record<string, string> {
  return Object.fromEntries(Object.entries(seen?.titles ?? {}).map(([key, entry]) => [key, entry.title.slug]));
}

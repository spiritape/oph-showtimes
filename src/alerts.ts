import type { Title } from "./types.ts";

export const RETURNING_AFTER_DAYS = 60;
const DAY = 86_400_000;

/** Every Title we've seen, keyed by exact title, with a snapshot for archived Title pages. */
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
    const known = next.titles[title.name];
    if (seen && (!known || Date.parse(first) - Date.parse(known.lastShowtime) > RETURNING_AFTER_DAYS * DAY)) {
      newTitles.push(title);
    }
    const lastShowtime = known && known.lastShowtime > last && !newTitles.includes(title) ? known.lastShowtime : last;
    next.titles[title.name] = { lastShowtime, title };
  }

  for (const [name, entry] of Object.entries(next.titles)) {
    if (now.getTime() - Date.parse(entry.lastShowtime) > RETURNING_AFTER_DAYS * DAY) delete next.titles[name];
  }
  return { newTitles, seen: next };
}

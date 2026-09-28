import type { Showtime } from "./types.ts";

export type GuardResult = { ok: true; showtimes: Showtime[] } | { ok: false; reason: string };

/**
 * Decides whether a read of the Source can be trusted enough to publish and
 * alert on. A broken read must never reach Subscribers. See docs/adr/0001.
 */
export function guardRead(previousCount: number | null, read: () => Showtime[]): GuardResult {
  let showtimes: Showtime[];
  try {
    showtimes = read();
  } catch (err) {
    return { ok: false, reason: `Reading the Source failed: ${err instanceof Error ? err.message : String(err)}` };
  }
  if (showtimes.length === 0) return { ok: false, reason: "The Source listed zero Showtimes" };
  if (previousCount && showtimes.length * 2 < previousCount) {
    return {
      ok: false,
      reason: `The Source listed ${showtimes.length} Showtimes, under half of the previous ${previousCount}`,
    };
  }
  return { ok: true, showtimes };
}

const MAX_NEW_TITLES = 10;

/**
 * Holds back a New Title Alert that looks like a misread rather than a real
 * announcement, e.g. the Source restyling every title so all look unseen.
 */
export function guardAlert(newCount: number, totalCount: number): { ok: true } | { ok: false; reason: string } {
  if (newCount > MAX_NEW_TITLES || (totalCount >= 6 && newCount * 2 > totalCount)) {
    return {
      ok: false,
      reason: `${newCount} of ${totalCount} Titles look new, which usually means the Source changed how it writes titles`,
    };
  }
  return { ok: true };
}

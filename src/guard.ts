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

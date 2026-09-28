import { createHash } from "node:crypto";
import type { Showtime } from "./types.ts";

/** An unchanged schedule is still republished this often, to roll Today forward and drop past Showtimes. */
export const REFRESH_EVERY_HOURS = 3;

export type LastPublish = { scheduleHash: string; publishedAt: string };

/** Fingerprint of everything we read from the Source. */
export const hashSchedule = (showtimes: Showtime[]) =>
  createHash("sha256").update(JSON.stringify(showtimes)).digest("hex");

/** The Source is checked often; only a changed schedule (or a stale site) is worth a deploy. */
export function shouldPublish(last: LastPublish | null, scheduleHash: string, now: Date): boolean {
  if (!last || last.scheduleHash !== scheduleHash) return true;
  return now.getTime() - Date.parse(last.publishedAt) >= REFRESH_EVERY_HOURS * 3_600_000;
}

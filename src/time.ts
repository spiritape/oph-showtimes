const TZ = "America/Los_Angeles";

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const dayLabelFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });

/** Pacific calendar date, e.g. "2026-09-29". */
export const dayKey = (iso: string | Date) => dayKeyFmt.format(new Date(iso));
/** e.g. "Tue, Sep 29". */
export const dayLabel = (iso: string) => dayLabelFmt.format(new Date(iso));
/** e.g. "7:15 PM". */
export const timeLabel = (iso: string) => timeFmt.format(new Date(iso));

/** "2hr 2min" → 122. */
export function runtimeMinutes(runtime: string | null): number | null {
  if (!runtime) return null;
  const h = runtime.match(/(\d+)\s*h/i)?.[1];
  const m = runtime.match(/(\d+)\s*m/i)?.[1];
  const total = Number(h ?? 0) * 60 + Number(m ?? 0);
  return total > 0 ? total : null;
}

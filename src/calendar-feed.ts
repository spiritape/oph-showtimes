import { calendarEntry, calendarStamp } from "./showtime.ts";
import type { ScheduledShowtime } from "./types.ts";

const escapeText = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

// RFC 5545 lines must be folded at 75 octets.
function fold(line: string): string {
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
    }
    cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
}

function vevent(scheduled: ScheduledShowtime, siteUrl: string, now: Date): string[] {
  const entry = calendarEntry(scheduled, siteUrl);
  return [
    "BEGIN:VEVENT",
    `UID:${scheduled.showtime.id}@oph-showtimes`,
    `DTSTAMP:${calendarStamp(now)}`,
    `DTSTART:${calendarStamp(entry.start)}`,
    `DTEND:${calendarStamp(entry.end)}`,
    `SUMMARY:${escapeText(entry.summary)}`,
    `LOCATION:${escapeText(entry.location)}`,
    `DESCRIPTION:${escapeText(entry.description)}`,
    `URL:${entry.url}`,
    "END:VEVENT",
  ];
}

/** A Calendar Feed in iCalendar format. */
export function calendarFeed(name: string, showtimes: ScheduledShowtime[], siteUrl: string, now: Date): string {
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//OPH Showtimes//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${escapeText(name)}`,
      "X-WR-TIMEZONE:America/Los_Angeles",
      "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
      ...showtimes.flatMap((s) => vevent(s, siteUrl, now)),
      "END:VCALENDAR",
    ]
      .map(fold)
      .join("\r\n") + "\r\n"
  );
}

import { bookingLink, titlePath } from "./showtime.ts";
import { runtimeMinutes } from "./time.ts";
import type { ScheduledShowtime } from "./types.ts";

const DEFAULT_MINUTES = 120;

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
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

function vevent({ title, showtime }: ScheduledShowtime, siteUrl: string, now: Date): string[] {
  const start = new Date(showtime.startsAt);
  const end = new Date(start.getTime() + (runtimeMinutes(title.runtime) ?? DEFAULT_MINUTES) * 60_000);
  const url = siteUrl + titlePath(title);
  const booking = bookingLink(showtime);
  const desc = [showtime.price, booking && `${booking.label}: ${booking.url}`, url].filter(Boolean).join("\n");
  return [
    "BEGIN:VEVENT",
    `UID:${showtime.id}@oph-showtimes`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeText(title.name)}`,
    `LOCATION:${escapeText("Ojai Playhouse, 145 E. Ojai Ave, Ojai, CA 93023")}`,
    `DESCRIPTION:${escapeText(desc)}`,
    `URL:${url}`,
    "END:VEVENT",
  ];
}

/** A Calendar Feed (or a single-Showtime calendar file) in iCalendar format. */
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

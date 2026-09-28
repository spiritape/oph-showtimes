import { runtimeMinutes } from "./time.ts";
import type { Showtime, Title } from "./types.ts";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escape = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

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

function vevent(title: Title, s: Showtime, siteUrl: string, now: Date): string[] {
  const start = new Date(s.startsAt);
  const end = new Date(start.getTime() + (runtimeMinutes(title.runtime) ?? 120) * 60_000);
  const url = `${siteUrl}/t/${title.slug}/`;
  const desc = [s.price, s.ticketUrl ? `Tickets: ${s.ticketUrl}` : s.rsvpUrl ? `RSVP: ${s.rsvpUrl}` : null, url]
    .filter(Boolean)
    .join("\n");
  return [
    "BEGIN:VEVENT",
    `UID:${s.id}@oph-showtimes`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(title.name)}`,
    "LOCATION:Ojai Playhouse\\, 145 E. Ojai Ave\\, Ojai\\, CA 93023",
    `DESCRIPTION:${escape(desc)}`,
    `URL:${url}`,
    "END:VEVENT",
  ];
}

export function calendar(name: string, items: { title: Title; showtime: Showtime }[], siteUrl: string, now: Date) {
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//OPH Showtimes//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${escape(name)}`,
      "X-WR-TIMEZONE:America/Los_Angeles",
      "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
      ...items.flatMap(({ title, showtime }) => vevent(title, showtime, siteUrl, now)),
      "END:VCALENDAR",
    ]
      .map(fold)
      .join("\r\n") + "\r\n"
  );
}

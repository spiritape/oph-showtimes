import { THEATER } from "./theater.ts";
import { runtimeMinutes } from "./time.ts";
import type { ScheduledShowtime, Showtime, Title } from "./types.ts";

/** A Showtime stays listed until this long after it starts. */
export const LISTED_AFTER_START_MINUTES = 30;

export const isListed = (s: Showtime, now: Date) =>
  Date.parse(s.startsAt) + LISTED_AFTER_START_MINUTES * 60_000 > now.getTime();

/** Where to book: a free/RSVP link wins over a paid ticket link. */
export function bookingLink(s: Showtime): { label: "RSVP" | "Tickets"; url: string; free: boolean } | null {
  // The Source only uses its RSVP links (free screening / free event) for free Showtimes.
  if (s.rsvpUrl) return { label: "RSVP", url: s.rsvpUrl, free: true };
  if (s.ticketUrl) return { label: "Tickets", url: s.ticketUrl, free: false };
  return null;
}

export const titlePath = (title: Title) => `/t/${title.slug}/`;

/** "Film", or a Live Show's Category: "Comedy", "Music"… */
export function categoryLabel(title: Title): string {
  if (title.isFilm) return "Film";
  // The Source files talks and one-offs under "misc", which says nothing to a visitor.
  if (!title.category || title.category === "misc") return "Live show";
  return title.category.replace(/^./, (c) => c.toUpperCase());
}

/** Assumed length when the Source gives no running time. */
const DEFAULT_MINUTES = 120;

/** What a calendar needs to know about one Showtime. */
export function calendarEntry({ title, showtime }: ScheduledShowtime, siteUrl: string) {
  const start = new Date(showtime.startsAt);
  const end = new Date(start.getTime() + (runtimeMinutes(title.runtime) ?? DEFAULT_MINUTES) * 60_000);
  const url = siteUrl + titlePath(title);
  const booking = bookingLink(showtime);
  const description = [showtime.price, booking && `${booking.label}: ${booking.url}`, url].filter(Boolean).join("\n");
  return { start, end, summary: title.name, location: `${THEATER.name}, ${THEATER.address}`, description, url };
}

/** UTC timestamp in the compact form calendars use, e.g. 20260929T020000Z. */
export const calendarStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Opens Google Calendar's "new event" screen prefilled with the Showtime. */
export function googleCalendarUrl(scheduled: ScheduledShowtime, siteUrl: string): string {
  const entry = calendarEntry(scheduled, siteUrl);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: entry.summary,
    dates: `${calendarStamp(entry.start)}/${calendarStamp(entry.end)}`,
    location: entry.location,
    details: entry.description,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** A small (128px wide) version of a Source image, or null if its host can't resize. */
export function thumbnailUrl(imageUrl: string | null): string | null {
  const match = imageUrl?.match(/^(https:\/\/[\w-]+\.graphassets\.com\/[\w-]+)\/([\w-]+)$/);
  return match ? `${match[1]}/resize=width:128/${match[2]}` : null;
}

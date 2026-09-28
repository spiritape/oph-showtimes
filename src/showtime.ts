import type { Showtime, Title } from "./types.ts";

/** A Showtime stays listed until this long after it starts. */
export const LISTED_AFTER_START_MINUTES = 30;

export const isListed = (s: Showtime, now: Date) =>
  Date.parse(s.startsAt) + LISTED_AFTER_START_MINUTES * 60_000 > now.getTime();

/** Where to book: a free/RSVP link wins over a paid ticket link. */
export function bookingLink(s: Showtime): { label: "RSVP" | "Tickets"; url: string } | null {
  if (s.rsvpUrl) return { label: "RSVP", url: s.rsvpUrl };
  if (s.ticketUrl) return { label: "Tickets", url: s.ticketUrl };
  return null;
}

export const titlePath = (title: Title) => `/t/${title.slug}/`;

/** "Film", "Comedy", "Music"… */
export const categoryLabel = (title: Title) =>
  title.isFilm ? "Film" : (title.category ?? "Event").replace(/^./, (c) => c.toUpperCase());

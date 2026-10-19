// The schedule as JSON for the iOS app (docs/adr/0003). Installed apps keep
// reading this for a long time: only add fields here. A breaking change goes
// to a new path (api/v2/) while v1 keeps being published.
import { bookingLink, calendarEntry, categoryLabel, isListed, isSoldOut, thumbnailUrl, titlePath } from "./showtime.ts";
import { THEATER } from "./theater.ts";
import { TZ } from "./time.ts";
import type { ScheduledShowtime, Showtime, Title } from "./types.ts";

export const FEED_FILE = "api/v1/schedule.json";

export type FeedShowtime = {
  id: string;
  /** UTC ISO timestamps; the end is estimated from the running time. */
  startsAt: string;
  endsAt: string;
  price: string | null;
  booking: { label: "RSVP" | "Tickets"; url: string; free: boolean } | null;
  /** The Playhouse says it's sold out (its price text says so; the price is left as written). */
  soldOut: boolean;
};

export type FeedTitle = {
  key: string;
  slug: string;
  name: string;
  subtitle: string | null;
  kind: "film" | "liveShow";
  /** "Film", "Comedy", "Live show"… as the site shows it. */
  categoryLabel: string;
  year: string | null;
  director: string | null;
  runtime: string | null;
  rating: string | null;
  synopsis: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  livestreamUrl: string | null;
  /** The Title's page on the site, for sharing. */
  url: string;
  /** Upcoming only, sorted by start time. */
  showtimes: FeedShowtime[];
};

export type Feed = {
  version: 1;
  generatedAt: string;
  theater: { name: string; address: string; phone: string; timeZone: string };
  /** Titles with at least one upcoming Showtime, soonest first. */
  titles: FeedTitle[];
  /**
   * Titles that played in the last 60 days, most recent first, each with only
   * its played Showtimes (most recent first). Matches the site's Past list.
   */
  past: FeedTitle[];
};

function feedTitle(title: Title, showtimes: Showtime[], siteUrl: string): FeedTitle {
  return {
    key: title.key,
    slug: title.slug,
    name: title.name,
    subtitle: title.subtitle,
    kind: title.isFilm ? "film" : "liveShow",
    categoryLabel: categoryLabel(title),
    year: title.year,
    director: title.director,
    runtime: title.runtime,
    rating: title.rating,
    synopsis: title.synopsis,
    imageUrl: title.imageUrl,
    thumbnailUrl: thumbnailUrl(title.imageUrl),
    livestreamUrl: title.livestreamUrl,
    url: siteUrl + titlePath(title),
    showtimes: showtimes.map((showtime) => ({
      id: showtime.id,
      startsAt: showtime.startsAt,
      endsAt: calendarEntry({ title, showtime }, siteUrl).end.toISOString(),
      price: showtime.price,
      booking: bookingLink(showtime),
      soldOut: isSoldOut(showtime),
    })),
  };
}

/** `past` is the site's Past list (pastShowtimes): played in the last 60 days, most recent first. */
export function renderFeed(titles: Title[], past: ScheduledShowtime[], siteUrl: string, now: Date): Feed {
  const feedTitles = titles
    .map((title) => feedTitle(title, title.showtimes.filter((s) => isListed(s, now)), siteUrl))
    .filter((t) => t.showtimes.length)
    .sort((a, b) => Date.parse(a.showtimes[0]!.startsAt) - Date.parse(b.showtimes[0]!.startsAt));
  // Group the Past list by Title, keeping its most-recent-first order.
  const played = new Map<string, { title: Title; showtimes: Showtime[] }>();
  for (const { title, showtime } of past) {
    const entry = played.get(title.key) ?? { title, showtimes: [] };
    entry.showtimes.push(showtime);
    played.set(title.key, entry);
  }
  return {
    version: 1,
    generatedAt: now.toISOString(),
    theater: { name: THEATER.name, address: THEATER.address, phone: THEATER.phone, timeZone: TZ },
    titles: feedTitles,
    past: [...played.values()].map(({ title, showtimes }) => feedTitle(title, showtimes, siteUrl)),
  };
}

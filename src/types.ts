/** One scheduled occurrence of a Title, as read from the Source. */
export type Showtime = {
  id: string;
  title: string;
  subtitle: string | null;
  /** UTC ISO timestamp. */
  startsAt: string;
  category: string | null;
  ticketUrl: string | null;
  rsvpUrl: string | null;
  livestreamUrl: string | null;
  /** Price as the Playhouse writes it, e.g. "$15/$13.50 (senior 60+)". */
  price: string | null;
  imageUrl: string | null;
  /** Rich-text details: year, director, running time, synopsis… */
  infoHtml: string | null;
};

/** A Film or Event: every Showtime sharing the same title (ignoring case and spacing). */
export type Title = {
  /** Identity across runs: the name ignoring case and spacing. */
  key: string;
  slug: string;
  name: string;
  subtitle: string | null;
  category: string | null;
  isFilm: boolean;
  year: string | null;
  director: string | null;
  runtime: string | null;
  rating: string | null;
  synopsis: string | null;
  imageUrl: string | null;
  livestreamUrl: string | null;
  /** Sorted by start time. */
  showtimes: Showtime[];
};

/** A Showtime together with the Title it belongs to. */
export type ScheduledShowtime = { title: Title; showtime: Showtime };

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
  /** The event's own page on the Source (ojaiplayhouse.com/event/<slug>). */
  sourceUrl: string | null;
};

/** One paragraph of the Playhouse's write-up, as it wrote it. */
export type AboutParagraph = {
  text: string;
  /** The Playhouse set it in bold: a special guest, an introduction, an award, a notice. */
  highlight: boolean;
};

/** A Film or Live Show: every Showtime sharing the same title (ignoring case and spacing). */
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
  starring: string | null;
  /** The film's description: the first plain paragraph that isn't a notice. */
  synopsis: string | null;
  /**
   * Everything else the Playhouse wrote, in its order: notices, special guests, line-ups
   * and the full description. Leaves out the detail lines above and the boilerplate
   * every free screening repeats.
   */
  about: AboutParagraph[];
  /** The Title's page on the Source. */
  sourceUrl: string | null;
  imageUrl: string | null;
  livestreamUrl: string | null;
  /** Sorted by start time. */
  showtimes: Showtime[];
};

/** A Showtime together with the Title it belongs to. */
export type ScheduledShowtime = { title: Title; showtime: Showtime };

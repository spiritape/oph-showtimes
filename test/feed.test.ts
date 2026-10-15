import { describe, expect, it } from "vitest";
import { renderFeed } from "../src/feed.ts";
import type { Showtime, Title } from "../src/types.ts";

const showtime = (id: string, startsAt: string, extra: Partial<Showtime> = {}): Showtime => ({
  id,
  title: "x",
  subtitle: null,
  startsAt,
  category: "film",
  ticketUrl: "https://tickets.example/" + id,
  rsvpUrl: null,
  livestreamUrl: null,
  price: "$15",
  imageUrl: null,
  infoHtml: null,
  ...extra,
});

const title = (name: string, showtimes: Showtime[], extra: Partial<Title> = {}): Title => ({
  key: name.toLowerCase(),
  slug: name.toLowerCase(),
  name,
  subtitle: null,
  category: "film",
  isFilm: true,
  year: null,
  director: null,
  runtime: "1hr 30min",
  rating: null,
  synopsis: null,
  imageUrl: null,
  livestreamUrl: null,
  showtimes,
  ...extra,
});

const now = new Date("2026-10-13T20:00:00Z");
const site = "https://ojaishowtimes.com";

describe("renderFeed", () => {
  it("lists only upcoming Showtimes, with an end time and booking link", () => {
    const feed = renderFeed(
      [title("Digger", [showtime("old", "2026-10-12T02:00:00Z"), showtime("next", "2026-10-14T02:00:00Z")])],
      [],
      site,
      now,
    );
    expect(feed.titles[0]!.showtimes).toEqual([
      {
        id: "next",
        startsAt: "2026-10-14T02:00:00Z",
        endsAt: "2026-10-14T03:30:00.000Z",
        price: "$15",
        booking: { label: "Tickets", url: "https://tickets.example/next", free: false },
      },
    ]);
    expect(feed.titles[0]!.url).toBe("https://ojaishowtimes.com/t/digger/");
  });

  it("drops Titles with nothing upcoming and sorts the rest soonest first", () => {
    const feed = renderFeed(
      [
        title("Later", [showtime("a", "2026-10-20T02:00:00Z")]),
        title("Gone", [showtime("b", "2026-10-01T02:00:00Z")]),
        title("Sooner", [showtime("c", "2026-10-15T02:00:00Z")], { isFilm: false, category: "comedy" }),
      ],
      [],
      site,
      now,
    );
    expect(feed.titles.map((t) => [t.name, t.kind, t.categoryLabel])).toEqual([
      ["Sooner", "liveShow", "Comedy"],
      ["Later", "film", "Film"],
    ]);
  });

  it("says which time zone Showtimes should be shown in", () => {
    expect(renderFeed([], [], site, now)).toMatchObject({ version: 1, theater: { timeZone: "America/Los_Angeles" } });
  });

  it("lists what played recently, grouped by Title, most recent first", () => {
    const digger = title("Digger", [showtime("d1", "2026-10-01T02:00:00Z"), showtime("d2", "2026-10-10T02:00:00Z")]);
    const comic = title("Comic", [showtime("c1", "2026-10-05T03:00:00Z")], { isFilm: false, category: "comedy" });
    // The order pastShowtimes gives: most recent first.
    const past = [
      { title: digger, showtime: digger.showtimes[1]! },
      { title: comic, showtime: comic.showtimes[0]! },
      { title: digger, showtime: digger.showtimes[0]! },
    ];
    const feed = renderFeed([], past, site, now);
    expect(feed.past.map((t) => [t.name, t.showtimes.map((s) => s.id)])).toEqual([
      ["Digger", ["d2", "d1"]],
      ["Comic", ["c1"]],
    ]);
  });
});

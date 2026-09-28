import { describe, expect, it } from "vitest";
import { checkForNewTitles } from "../src/alerts.ts";
import type { Title } from "../src/types.ts";

const now = new Date("2026-10-01T12:00:00Z");

const title = (name: string, ...starts: string[]): Title => ({
  key: name.toLowerCase(),
  slug: name.toLowerCase(),
  name,
  subtitle: null,
  category: "film",
  isFilm: true,
  year: null,
  director: null,
  runtime: null,
  rating: null,
  synopsis: null,
  imageUrl: null,
  livestreamUrl: null,
  showtimes: starts.map((startsAt, i) => ({
    id: `${name}-${i}`,
    title: name,
    subtitle: null,
    startsAt,
    category: "film",
    ticketUrl: null,
    rsvpUrl: null,
    livestreamUrl: null,
    price: null,
    imageUrl: null,
    infoHtml: null,
  })),
});

const names = (ts: Title[]) => ts.map((t) => t.name);

describe("checkForNewTitles", () => {
  it("sends nothing on the first run but remembers every Title", () => {
    const result = checkForNewTitles(null, [title("Digger", "2026-10-02T02:00:00Z")], now);
    expect(result.newTitles).toEqual([]);
    expect(Object.keys(result.seen.titles)).toEqual(["digger"]);
  });

  it("finds Titles never seen before, but not new Showtimes of known ones", () => {
    const { seen } = checkForNewTitles(null, [title("Digger", "2026-10-02T02:00:00Z")], now);
    const result = checkForNewTitles(
      seen,
      [title("Digger", "2026-10-02T02:00:00Z", "2026-10-09T02:00:00Z"), title("Pecker", "2026-10-07T01:00:00Z")],
      now,
    );
    expect(names(result.newTitles)).toEqual(["Pecker"]);
  });

  it("treats a Title back more than 60 days after its last Showtime as new", () => {
    const { seen } = checkForNewTitles(
      null,
      [title("Collateral", "2026-09-01T02:00:00Z"), title("Heat", "2026-09-01T02:00:00Z")],
      new Date("2026-08-30T12:00:00Z"),
    );
    const result = checkForNewTitles(
      seen,
      [title("Collateral", "2026-11-01T02:00:00Z"), title("Heat", "2026-10-30T02:00:00Z")],
      now,
    );
    expect(names(result.newTitles)).toEqual(["Collateral"]);
  });

  it("keeps finished Titles for 60 days, then forgets them", () => {
    const { seen } = checkForNewTitles(
      null,
      [title("Recent", "2026-09-01T02:00:00Z"), title("Old", "2026-07-15T02:00:00Z")],
      new Date("2026-07-01T00:00:00Z"),
    );
    const result = checkForNewTitles(seen, [], now);
    expect(Object.keys(result.seen.titles)).toEqual(["recent"]);
    expect(result.seen.titles["recent"]?.title.name).toBe("Recent");
  });
});

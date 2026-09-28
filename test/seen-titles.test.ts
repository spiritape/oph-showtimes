import { describe, expect, it } from "vitest";
import { finishedTitles, rememberTitles } from "../src/seen-titles.ts";
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

describe("rememberTitles", () => {
  it("remembers every Title on the schedule", () => {
    const seen = rememberTitles(null, [title("Digger", "2026-10-02T02:00:00Z")], now);
    expect(Object.keys(seen.titles)).toEqual(["digger"]);
  });

  it("keeps finished Titles for 60 days, then forgets them", () => {
    const earlier = rememberTitles(
      null,
      [title("Recent", "2026-09-01T02:00:00Z"), title("Old", "2026-07-15T02:00:00Z")],
      new Date("2026-07-01T00:00:00Z"),
    );
    const seen = rememberTitles(earlier, [], now);
    expect(finishedTitles(seen, []).map((t) => t.name)).toEqual(["Recent"]);
  });

  it("doesn't count a Title still on the schedule as finished", () => {
    const earlier = rememberTitles(null, [title("Digger", "2026-09-20T02:00:00Z")], now);
    const current = [title("Digger", "2026-10-02T02:00:00Z")];
    expect(finishedTitles(rememberTitles(earlier, current, now), current)).toEqual([]);
  });
});

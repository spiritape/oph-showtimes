import { describe, expect, it } from "vitest";
import { filmFromTmdb, parseRequest, rankFilms, renderRequestsPage, topFilms, type Film } from "../worker/requests.ts";

describe("filmFromTmdb", () => {
  it("keeps what the app shows, with a sized poster", () => {
    expect(filmFromTmdb({ id: 603, title: "The Matrix", release_date: "1999-03-31", poster_path: "/abc.jpg" })).toEqual({
      tmdbId: 603,
      title: "The Matrix",
      year: "1999",
      posterUrl: "https://image.tmdb.org/t/p/w185/abc.jpg",
    });
  });

  it("copes with missing dates and posters, and keeps the IMDb ID from film details", () => {
    expect(filmFromTmdb({ id: 1, title: "Untitled", release_date: "", poster_path: null, imdb_id: "tt0133093" })).toEqual({
      tmdbId: 1,
      title: "Untitled",
      year: null,
      posterUrl: null,
      imdbId: "tt0133093",
    });
  });
});

describe("parseRequest", () => {
  it("accepts an install ID and a TMDB ID, and nothing else", () => {
    const installId = "0F8D5A4E-3C2B-4A1D-9E8F-7A6B5C4D3E2F";
    expect(parseRequest({ installId, tmdbId: 603 })).toEqual({ installId, tmdbId: 603 });
    expect(parseRequest({ installId, tmdbId: "603" })).toBeNull();
    expect(parseRequest({ installId: "me", tmdbId: 603 })).toBeNull();
    expect(parseRequest(null)).toBeNull();
  });
});

const film = (tmdbId: number, title: string): Film => ({ tmdbId, title, year: "1999", posterUrl: null, imdbId: "tt1" });

describe("rankFilms", () => {
  it("counts requests per film, most requested first, ties by most recent", () => {
    const films = new Map([
      [1, film(1, "Alpha")],
      [2, film(2, "Beta")],
      [3, film(3, "Gamma")],
    ]);
    const ranked = rankFilms(films, [
      { tmdbId: 1, at: "2026-10-01T00:00:00Z" },
      { tmdbId: 2, at: "2026-10-02T00:00:00Z" },
      { tmdbId: 2, at: "2026-10-03T00:00:00Z" },
      { tmdbId: 3, at: "2026-10-05T00:00:00Z" },
      { tmdbId: 9, at: "2026-10-05T00:00:00Z" }, // details missing: skipped
    ]);
    expect(ranked.map((f) => [f.title, f.requests, f.lastAt])).toEqual([
      ["Beta", 2, "2026-10-03T00:00:00Z"],
      ["Gamma", 1, "2026-10-05T00:00:00Z"],
      ["Alpha", 1, "2026-10-01T00:00:00Z"],
    ]);
  });
});

describe("renderRequestsPage", () => {
  it("escapes titles and links to IMDb", () => {
    const html = renderRequestsPage(
      [{ ...film(5, "<script>Tom & Jerry</script>"), requests: 3, lastAt: "2026-10-05T00:00:00Z" }],
      new Date("2026-10-14T17:00:00Z"),
    );
    expect(html).toContain("&lt;script&gt;Tom &amp; Jerry&lt;/script&gt;");
    expect(html).toContain('href="https://www.imdb.com/title/tt1/"');
    expect(html).toContain('<td class="count">3</td>');
    expect(html).toContain("not endorsed or certified by TMDB");
  });
});

describe("topFilms", () => {
  it("shares the five most requested in order, without counts, IMDb IDs or dates", () => {
    const ranked = Array.from({ length: 7 }, (_, i) => ({ ...film(i, `Film ${i}`), requests: 7 - i, lastAt: "2026-10-01T00:00:00Z" }));
    expect(topFilms(ranked)).toEqual(
      [0, 1, 2, 3, 4].map((i) => ({ tmdbId: i, title: `Film ${i}`, year: "1999", posterUrl: null })),
    );
  });
});


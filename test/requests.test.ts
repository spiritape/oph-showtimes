import { afterEach, describe, expect, it, vi } from "vitest";
import type { KVNamespace } from "@cloudflare/workers-types";
import { filmDetails, filmFromTmdb, parseRequest, rankFilms, renderRequestsPage, topFilms, type Film } from "../worker/requests.ts";

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
    expect(html).toContain("not endorsed, certified, or otherwise approved by TMDB");
    expect(html).toContain('href="https://www.themoviedb.org"');
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


/** Just enough of KV for filmDetails: a map of JSON values, recording each put's options. */
function fakeKv(entries: Record<string, unknown> = {}) {
  const store = new Map(Object.entries(entries).map(([k, v]) => [k, JSON.stringify(v)]));
  const puts: { key: string; value: unknown; options: unknown }[] = [];
  const kv = {
    get: async (key: string) => (store.has(key) ? JSON.parse(store.get(key)!) : null),
    put: async (key: string, value: string, options: unknown) => {
      store.set(key, value);
      puts.push({ key, value: JSON.parse(value), options });
    },
  };
  return { kv: kv as unknown as KVNamespace, puts };
}

const fresh = { tmdbId: 603, title: "The Matrix", year: "1999", posterUrl: null, imdbId: "tt0133093" };
const tmdbReplies = (body: unknown, ok = true) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status: ok ? 200 : 500 }));

describe("filmDetails", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();
  afterEach(() => vi.restoreAllMocks());

  it("serves stored details under five months old without asking TMDB", async () => {
    const fetch = tmdbReplies({});
    const { kv } = fakeKv({ "film:603": { ...fresh, fetchedAt: daysAgo(30) } });
    expect(await filmDetails(kv, "key", 603, { now })).toEqual(fresh);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches details again after five months, storing them for six months at most", async () => {
    tmdbReplies({ id: 603, title: "The Matrix", release_date: "1999-03-31", poster_path: null, imdb_id: "tt0133093" });
    const { kv, puts } = fakeKv({ "film:603": { ...fresh, title: "Old title", fetchedAt: daysAgo(151) } });
    expect(await filmDetails(kv, "key", 603, { now })).toEqual(fresh);
    expect(puts).toEqual([
      { key: "film:603", value: { ...fresh, fetchedAt: now.toISOString() }, options: { expirationTtl: 180 * 86_400 } },
    ]);
  });

  it("treats details saved before fetch times were kept as due a refresh", async () => {
    const fetch = tmdbReplies({ id: 603, title: "The Matrix", release_date: "1999-03-31", poster_path: null, imdb_id: "tt0133093" });
    const { kv } = fakeKv({ "film:603": fresh });
    expect(await filmDetails(kv, "key", 603, { now })).toEqual(fresh);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("falls back to a copy under six months old when TMDB fails, and to nothing after", async () => {
    tmdbReplies({}, false);
    expect(await filmDetails(fakeKv({ "film:603": { ...fresh, fetchedAt: daysAgo(160) } }).kv, "key", 603, { now })).toEqual(fresh);
    expect(await filmDetails(fakeKv({ "film:603": { ...fresh, fetchedAt: daysAgo(181) } }).kv, "key", 603, { now })).toBeNull();
    expect(await filmDetails(fakeKv({ "film:603": fresh }).kv, "key", 603, { now })).toBeNull();
  });

  it("won't look up a film that was never requested when asked only for stored ones", async () => {
    const fetch = tmdbReplies({});
    expect(await filmDetails(fakeKv().kv, "key", 603, { now, onlyIfStored: true })).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});

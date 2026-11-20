import { describe, expect, it, vi } from "vitest";
import type { KVNamespace } from "@cloudflare/workers-types";
import { directorNames, findPoster, LOOKUPS_PER_REQUEST, normalize, parsePosterFilms, posters, searchName, type TmdbFetch } from "../worker/posters.ts";

const POSTER = "https://image.tmdb.org/t/p/w185";

describe("searchName", () => {
  it("drops the Playhouse's notes in brackets", () => {
    expect(searchName("Cameron Winter at Carnegie Hall (in 35mm)", null)).toBe("Cameron Winter at Carnegie Hall");
    expect(searchName("Wild at Heart (4k restored + unrated)", null)).toBe("Wild at Heart");
    expect(searchName("The Exorcist (Director’s Cut)", null)).toBe("The Exorcist");
  });

  it("drops a director's name in front, but not other possessives", () => {
    expect(searchName("Ken Russell’s The Devils (in 35mm)", "Ken Russell")).toBe("The Devils");
    expect(searchName("Kiki’s Delivery Service", "Hayao Miyazaki")).toBe("Kiki’s Delivery Service");
  });
});

describe("normalize and directorNames", () => {
  it("compares names without accents, punctuation or case", () => {
    expect(normalize("Planes, Trains & Automobiles")).toBe("planes trains and automobiles");
    expect(normalize("Alejandro G. Iñárritu")).toBe("alejandro g inarritu");
  });

  it("splits lists of directors", () => {
    expect(directorNames("Yuval Abraham and Rachel Szor")).toEqual(["yuval abraham", "rachel szor"]);
    expect(directorNames("James Algar, Samuel Armstrong, Ford Bebbe Jr.")).toEqual([
      "james algar",
      "samuel armstrong",
      "ford bebbe",
    ]);
    expect(directorNames(null)).toEqual([]);
  });
});

/** A fake TMDB: search results by query, and details (with directors) by id. */
function fakeTmdb(search: Record<string, object[]>, directors: Record<number, string[]>, posters: Record<number, string> = {}) {
  return vi.fn<TmdbFetch>(async (path, params) => {
    if (path === "/search/movie") return { results: search[params!.query!] ?? [] };
    const id = Number(path.split("/").at(-1));
    return { id, poster_path: posters[id] ?? null, credits: { crew: (directors[id] ?? []).map((name) => ({ job: "Director", name })) } };
  });
}

describe("findPoster", () => {
  it("picks the same title by the listed director, not a remake", async () => {
    const tmdb = fakeTmdb(
      {
        "The Devils": [
          { id: 1, title: "The Devils", release_date: "2002-01-01", poster_path: "/remake.jpg" },
          { id: 2, title: "The Devils", release_date: "1971-07-16", poster_path: "/russell.jpg" },
        ],
      },
      { 1: ["Someone Else"], 2: ["Ken Russell"] },
      { 2: "/russell.jpg" },
    );
    expect(await findPoster({ key: "a", name: "Ken Russell’s The Devils", year: "1971", director: "Ken Russell" }, tmdb)).toBe(
      `${POSTER}/russell.jpg`,
    );
  });

  it("accepts a festival premiere the year before the Playhouse's year", async () => {
    const tmdb = fakeTmdb({ Fatherland: [{ id: 5, title: "Fatherland", release_date: "2025-05-20", poster_path: "/f.jpg" }] }, { 5: ["Paweł Pawlikowski"] });
    expect(await findPoster({ key: "a", name: "Fatherland", year: "2026", director: "Paweł Pawlikowski" }, tmdb)).toBe(`${POSTER}/f.jpg`);
  });

  it("allows a misspelled director when the title and year are exact", async () => {
    const tmdb = fakeTmdb({ "The Wizard of Oz": [{ id: 7, title: "The Wizard of Oz", release_date: "1939-08-15", poster_path: "/oz.jpg" }] }, { 7: ["Victor Fleming"] });
    expect(await findPoster({ key: "a", name: "The Wizard of Oz", year: "1939", director: "Victor Flemming" }, tmdb)).toBe(`${POSTER}/oz.jpg`);
  });

  it("gives up rather than guess: different director, or a different film's title", async () => {
    const tmdb = fakeTmdb(
      {
        Wicker: [{ id: 8, title: "Wicker", release_date: "2026-01-01", poster_path: "/w.jpg" }],
        Rose: [{ id: 9, title: "The Rose", release_date: "1979-11-07", poster_path: "/r.jpg" }],
      },
      { 8: ["Somebody Else"], 9: ["Mark Rydell"] },
    );
    expect(await findPoster({ key: "a", name: "Wicker", year: "2015", director: "Alex Huston Fischer" }, tmdb)).toBeNull();
    expect(await findPoster({ key: "b", name: "Rose", year: "2026", director: "Markus Schreiner" }, tmdb)).toBeNull();
  });

  it("without a director, takes only an unambiguous same-title match", async () => {
    const tmdb = fakeTmdb(
      {
        Solo: [{ id: 1, title: "Solo", release_date: "2026-03-01", poster_path: "/s.jpg" }],
        Twins: [
          { id: 2, title: "Twins", release_date: "1988-12-09", poster_path: "/a.jpg" },
          { id: 3, title: "Twins", release_date: "2026-02-01", poster_path: "/b.jpg" },
        ],
      },
      {},
    );
    expect(await findPoster({ key: "a", name: "Solo", year: null, director: null }, tmdb)).toBe(`${POSTER}/s.jpg`);
    expect(await findPoster({ key: "b", name: "Twins", year: null, director: null }, tmdb)).toBeNull();
    expect(await findPoster({ key: "c", name: "Twins", year: "2026", director: null }, tmdb)).toBe(`${POSTER}/b.jpg`);
  });
});

function fakeKv() {
  const store = new Map<string, { value: string; ttl?: number }>();
  const kv = {
    get: async (key: string) => (store.has(key) ? JSON.parse(store.get(key)!.value) : null),
    put: async (key: string, value: string, options?: { expirationTtl?: number }) => {
      store.set(key, { value, ttl: options?.expirationTtl });
    },
  } as unknown as KVNamespace;
  return { kv, store };
}

describe("posters", () => {
  const film = (n: number) => ({ key: `k${n}`, name: `Film ${n}`, year: "2026", director: "Jane Doe" });
  const allFound = () =>
    vi.fn<TmdbFetch>(async (path, params) =>
      path === "/search/movie"
        ? { results: [{ id: 1, title: params!.query, release_date: "2026-01-01", poster_path: "/p.jpg" }] }
        : { id: 1, poster_path: "/p.jpg", credits: { crew: [{ job: "Director", name: "Jane Doe" }] } },
    );

  it("stores matches for at most six months and answers from storage after that", async () => {
    const { kv, store } = fakeKv();
    const tmdb = allFound();
    expect(await posters(kv, [film(1)], tmdb)).toEqual({ k1: `${POSTER}/p.jpg` });
    expect([...store.values()][0]!.ttl).toBe(180 * 86_400);
    tmdb.mockClear();
    expect(await posters(kv, [film(1)], tmdb)).toEqual({ k1: `${POSTER}/p.jpg` });
    expect(tmdb).not.toHaveBeenCalled();
  });

  it("looks up only so many films per request, leaving the rest for later", async () => {
    const { kv } = fakeKv();
    const films = Array.from({ length: LOOKUPS_PER_REQUEST + 3 }, (_, i) => film(i));
    const answers = await posters(kv, films, allFound());
    expect(Object.keys(answers)).toHaveLength(LOOKUPS_PER_REQUEST);
    expect(Object.keys(await posters(kv, films, allFound()))).toHaveLength(LOOKUPS_PER_REQUEST + 3);
  });

  it("tries a film it couldn't match again after a week", async () => {
    const { kv, store } = fakeKv();
    const none = vi.fn<TmdbFetch>(async () => ({ results: [] }));
    const now = new Date("2026-11-20T00:00:00Z");
    expect(await posters(kv, [film(1)], none, now)).toEqual({ k1: null });
    expect([...store.values()][0]!.ttl).toBe(7 * 86_400);
    await posters(kv, [film(1)], none, new Date("2026-11-23T00:00:00Z"));
    expect(none).toHaveBeenCalledTimes(1);
    await posters(kv, [film(1)], none, new Date("2026-11-28T00:00:00Z"));
    expect(none).toHaveBeenCalledTimes(2);
  });

  it("keeps serving a stored match when TMDB can't be reached", async () => {
    const { kv } = fakeKv();
    await posters(kv, [film(1)], allFound(), new Date("2026-01-01T00:00:00Z"));
    const down = vi.fn<TmdbFetch>(async () => {
      throw new Error("down");
    });
    expect(await posters(kv, [film(1)], down, new Date("2026-06-15T00:00:00Z"))).toEqual({ k1: `${POSTER}/p.jpg` });
    expect(await posters(kv, [film(1)], down, new Date("2026-07-15T00:00:00Z"))).toEqual({});
  });
});

describe("parsePosterFilms", () => {
  it("accepts the build's list and rejects anything else", () => {
    const films = [{ key: "a", name: "Heat", year: "1995", director: "Michael Mann" }, { key: "b", name: "X", year: null, director: null }];
    expect(parsePosterFilms({ films })).toEqual(films);
    expect(parsePosterFilms({ films: [{ key: "a", name: "" , year: null, director: null }] })).toBeNull();
    expect(parsePosterFilms({ films: "Heat" })).toBeNull();
    expect(parsePosterFilms(null)).toBeNull();
  });
});

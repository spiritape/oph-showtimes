// Posters for the app's schedule. The build sends the schedule's films; the watcher finds each one
// on TMDB and answers with its poster, or null when it can't be sure it found the right film (the
// app then shows the Playhouse's own image). The Playhouse's names carry extras TMDB doesn't
// ("(in 35mm)", "Ken Russell's The Devils") and its years are often the screening year, so a match
// needs the same title and, where checked, the same director.
//
// Stored in the watcher's KV:
//   poster:<hash of name, year, director>  { posterUrl, fetchedAt }: kept at most six months, as
//                                          TMDB's terms require; a film not found is tried again after a week

import type { KVNamespace } from "@cloudflare/workers-types";
import { POSTER } from "./requests.ts";

export type PosterFilm = { key: string; name: string; year: string | null; director: string | null };
type StoredPoster = { posterUrl: string | null; fetchedAt: string };

/** Fetches a TMDB API path, returning its JSON. */
export type TmdbFetch = (path: string, params?: Record<string, string>) => Promise<unknown>;

type TmdbResult = { id: number; title?: string; original_title?: string; release_date?: string; poster_path?: string | null };
type TmdbDetails = TmdbResult & { credits?: { crew?: { job?: string; name?: string }[] } };

const DAY = 86_400_000;
const REFRESH_AFTER_DAYS = 150;
const KEEP_FOR_DAYS = 180;
const RETRY_NOT_FOUND_DAYS = 7;
/** Each lookup makes up to 3 TMDB calls; Workers' free plan allows 50 per request. The rest wait for the next build. */
export const LOOKUPS_PER_REQUEST = 12;
export const MAX_FILMS = 300;

/** Lowercase letters and digits only, accents dropped, "&" read as "and". */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** The directors listed for a film: "A, B and C" or "A & B". */
export function directorNames(director: string | null): string[] {
  if (!director) return [];
  return director
    .split(/,|\band\b|&/)
    .map((name) => normalize(name.replace(/\bjr\.?$/i, "")))
    .filter(Boolean);
}

/**
 * The name TMDB would know the film by: without the Playhouse's notes in brackets
 * ("(in 35mm)", "(Director's Cut)", "(4k restored)") or a director's name in front ("Ken Russell's").
 */
export function searchName(name: string, director: string | null): string {
  let clean = name.replace(/\s*[([][^)\]]*[)\]]/g, " ").replace(/\s+/g, " ").trim();
  const possessive = clean.match(/^(.+?)[’']s\s+(.+)$/);
  if (possessive && directorNames(director).includes(normalize(possessive[1]!))) clean = possessive[2]!;
  return clean;
}

const yearOf = (r: TmdbResult) => (r.release_date ? Number(r.release_date.slice(0, 4)) : null);

/** Whether a TMDB director is one the Playhouse listed: same full name, or same surname (allows for misspelled first names). */
function sameDirector(tmdbName: string, listed: string[]): boolean {
  const name = normalize(tmdbName);
  const surname = name.split(" ").at(-1);
  return listed.some((l) => l === name || l.split(" ").at(-1) === surname);
}

/** Finds the film on TMDB, returning its poster URL, or null when there's no confident match. */
export async function findPoster(film: PosterFilm, tmdb: TmdbFetch): Promise<string | null> {
  const query = searchName(film.name, film.director);
  if (!query) return null;
  const { results = [] } = (await tmdb("/search/movie", { query, include_adult: "false", language: "en-US" })) as {
    results?: TmdbResult[];
  };
  const year = film.year ? Number(film.year) : null;
  // A new film's year at the Playhouse is often the year after its festival premiere.
  const nearYear = (r: TmdbResult, within: number) => year === null || (yearOf(r) !== null && Math.abs(yearOf(r)! - year) <= within);
  const target = normalize(query);
  const sameTitle = results.filter((r) => normalize(r.title ?? "") === target || normalize(r.original_title ?? "") === target);
  const byYear = (a: TmdbResult, b: TmdbResult) =>
    year === null ? 0 : Math.abs((yearOf(a) ?? 0) - year) - Math.abs((yearOf(b) ?? 0) - year);
  const directors = directorNames(film.director);

  // Same title, close in year: check the director when there is one.
  const titled = sameTitle.filter((r) => nearYear(r, 2)).sort(byYear);
  // Otherwise (a reworded title), only the same year and director will do.
  const candidates = titled.length ? titled : directors.length ? results.filter((r) => nearYear(r, 1)).slice(0, 2) : [];

  if (!directors.length) {
    // Nothing to check against: only an unambiguous same-title match.
    const first = titled[0];
    const only = first && (titled.length === 1 || (year !== null && yearOf(first) === year)) ? first : undefined;
    return only?.poster_path ? POSTER + only.poster_path : null;
  }
  for (const candidate of candidates.slice(0, 2)) {
    const details = (await tmdb(`/movie/${candidate.id}`, { append_to_response: "credits", language: "en-US" })) as TmdbDetails;
    const tmdbDirectors = (details.credits?.crew ?? []).filter((c) => c.job === "Director").map((c) => c.name ?? "");
    const matches = tmdbDirectors.some((name) => sameDirector(name, directors));
    // A misspelled director still counts when the title and year are exact.
    const exact = titled.includes(candidate) && year !== null && yearOf(candidate) === year;
    if (matches || exact) {
      const path = details.poster_path ?? candidate.poster_path;
      return path ? POSTER + path : null;
    }
  }
  return null;
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const storageKey = async (film: PosterFilm) =>
  `poster:${await sha256([normalize(film.name), film.year ?? "", normalize(film.director ?? "")].join("|"))}`;

/** Validates the build's request body: { films: [{ key, name, year, director }] }. */
export function parsePosterFilms(body: unknown): PosterFilm[] | null {
  const films = (body as { films?: unknown })?.films;
  if (!Array.isArray(films) || films.length > MAX_FILMS) return null;
  const text = (v: unknown, max: number) => typeof v === "string" && v.length > 0 && v.length <= max;
  const optional = (v: unknown, max: number) => v === null || text(v, max);
  const valid = films.every(
    (f) => text(f?.key, 200) && text(f?.name, 300) && optional(f?.year, 10) && optional(f?.director, 300),
  );
  return valid ? (films as PosterFilm[]) : null;
}

/**
 * Each film's poster URL (or null), keyed by the film's key. Stored matches answer straight away;
 * up to LOOKUPS_PER_REQUEST others are looked up on TMDB, in the order given, and the rest are
 * left out until a later request.
 */
export async function posters(
  kv: KVNamespace,
  films: PosterFilm[],
  tmdb: TmdbFetch,
  now = new Date(),
): Promise<Record<string, string | null>> {
  const answers: Record<string, string | null> = {};
  let lookups = 0;
  for (const film of films) {
    const key = await storageKey(film);
    const stored = await kv.get<StoredPoster>(key, "json");
    const age = stored ? (now.getTime() - Date.parse(stored.fetchedAt)) / DAY : Infinity;
    const fresh = stored && (stored.posterUrl ? age < REFRESH_AFTER_DAYS : age < RETRY_NOT_FOUND_DAYS);
    if (fresh) {
      answers[film.key] = stored.posterUrl;
      continue;
    }
    if (lookups < LOOKUPS_PER_REQUEST) {
      lookups++;
      try {
        const posterUrl = await findPoster(film, tmdb);
        const record: StoredPoster = { posterUrl, fetchedAt: now.toISOString() };
        const keepDays = posterUrl ? KEEP_FOR_DAYS : RETRY_NOT_FOUND_DAYS;
        await kv.put(key, JSON.stringify(record), { expirationTtl: keepDays * 86_400 });
        answers[film.key] = posterUrl;
        continue;
      } catch {
        // TMDB unreachable: fall back to a stored match below.
      }
    }
    if (stored?.posterUrl && age < KEEP_FOR_DAYS) answers[film.key] = stored.posterUrl;
  }
  return answers;
}

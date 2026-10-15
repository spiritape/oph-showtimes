// Film Requests (see CONTEXT.md): people search TMDB from the app and request
// films they'd like the Playhouse to show. Each app install counts once per
// film. Only the Playhouse sees the totals, on a page at a secret link.
//
// Stored in the watcher's KV:
//   film:<tmdbId>                  the film's details (JSON), saved on its first request
//   req:<tmdbId>:<hash of install> one install's request, with { at } as metadata

import type { KVNamespace } from "@cloudflare/workers-types";

const TMDB = "https://api.themoviedb.org/3";
const POSTER = "https://image.tmdb.org/t/p/w185";
export const TMDB_CREDIT = "This product uses the TMDB API but is not endorsed or certified by TMDB.";

/** A film as the app shows it in search results and "Your requests". */
export type Film = { tmdbId: number; title: string; year: string | null; posterUrl: string | null; imdbId?: string | null };

type TmdbMovie = { id: number; title: string; release_date?: string; poster_path?: string | null; imdb_id?: string | null };

export function filmFromTmdb(m: TmdbMovie): Film {
  return {
    tmdbId: m.id,
    title: m.title,
    year: m.release_date?.slice(0, 4) || null,
    posterUrl: m.poster_path ? POSTER + m.poster_path : null,
    ...(m.imdb_id !== undefined ? { imdbId: m.imdb_id || null } : {}),
  };
}

/** TMDB accepts either a v3 API key or a v4 read access token (a long JWT). */
async function tmdb(key: string, path: string, params: Record<string, string> = {}) {
  const url = new URL(TMDB + path);
  const bearer = key.length > 40;
  for (const [k, v] of Object.entries({ ...params, ...(bearer ? {} : { api_key: key }) })) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: bearer ? { Authorization: `Bearer ${key}` } : {} });
  if (!res.ok) throw new Error(`TMDB responded ${res.status} for ${path}`);
  return res.json();
}

export async function searchFilms(key: string, query: string): Promise<Film[]> {
  const data = (await tmdb(key, "/search/movie", { query, include_adult: "false", language: "en-US" })) as {
    results: TmdbMovie[];
  };
  return data.results.slice(0, 15).map(filmFromTmdb);
}

const isTmdbId = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0;
const isInstallId = (v: unknown): v is string => typeof v === "string" && /^[0-9A-F-]{36}$/i.test(v);

/** Validates a request body: { installId, tmdbId }. */
export function parseRequest(body: unknown): { installId: string; tmdbId: number } | null {
  const { installId, tmdbId } = (body ?? {}) as { installId?: unknown; tmdbId?: unknown };
  return isInstallId(installId) && isTmdbId(tmdbId) ? { installId, tmdbId } : null;
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const requestKey = async (tmdbId: number, installId: string) => `req:${tmdbId}:${await sha256(installId)}`;

/** Records a Film Request, saving the film's details the first time it's requested. */
export async function addRequest(kv: KVNamespace, tmdbKey: string, installId: string, tmdbId: number): Promise<Film> {
  let film = await kv.get<Film>(`film:${tmdbId}`, "json");
  if (!film) {
    film = filmFromTmdb((await tmdb(tmdbKey, `/movie/${tmdbId}`, { language: "en-US" })) as TmdbMovie);
    await kv.put(`film:${tmdbId}`, JSON.stringify(film));
  }
  await kv.put(await requestKey(tmdbId, installId), "", { metadata: { at: new Date().toISOString() } });
  return film;
}

export async function withdrawRequest(kv: KVNamespace, installId: string, tmdbId: number) {
  await kv.delete(await requestKey(tmdbId, installId));
}

export type RankedFilm = Film & { requests: number; lastAt: string };

/** Counts requests per film, most requested first (ties: most recently requested). */
export function rankFilms(films: Map<number, Film>, requests: { tmdbId: number; at: string }[]): RankedFilm[] {
  const ranked = new Map<number, RankedFilm>();
  for (const { tmdbId, at } of requests) {
    const film = films.get(tmdbId);
    if (!film) continue;
    const entry = ranked.get(tmdbId) ?? { ...film, requests: 0, lastAt: at };
    entry.requests++;
    if (at > entry.lastAt) entry.lastAt = at;
    ranked.set(tmdbId, entry);
  }
  return [...ranked.values()].sort((a, b) => b.requests - a.requests || b.lastAt.localeCompare(a.lastAt));
}

async function listAll<M>(kv: KVNamespace, prefix: string) {
  const keys: { name: string; metadata?: M }[] = [];
  let cursor: string | undefined;
  do {
    const page = await kv.list<M>({ prefix, cursor });
    keys.push(...page.keys);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return keys;
}

export async function loadRanking(kv: KVNamespace): Promise<RankedFilm[]> {
  const requests = (await listAll<{ at: string }>(kv, "req:")).map(({ name, metadata }) => ({
    tmdbId: Number(name.split(":")[1]),
    at: metadata?.at ?? "",
  }));
  const ids = [...new Set(requests.map((r) => r.tmdbId))];
  const films = new Map<number, Film>();
  await Promise.all(
    ids.map(async (id) => {
      const film = await kv.get<Film>(`film:${id}`, "json");
      if (film) films.set(id, film);
    }),
  );
  return rankFilms(films, requests);
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** The Playhouse's private page: every requested film, most requested first. */
export function renderRequestsPage(films: RankedFilm[], now: Date): string {
  const total = films.reduce((n, f) => n + f.requests, 0);
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" });
  const rows = films
    .map(
      (f, i) => `<tr>
<td class="rank">${i + 1}</td>
<td class="poster">${f.posterUrl ? `<img src="${escape(f.posterUrl)}" alt="" width="46" height="69" loading="lazy">` : ""}</td>
<td><strong>${escape(f.title)}</strong>${f.year ? ` <span class="muted">(${escape(f.year)})</span>` : ""}<br>
<span class="links">${f.imdbId ? `<a href="https://www.imdb.com/title/${escape(f.imdbId)}/">IMDb</a> · ` : ""}<a href="https://www.themoviedb.org/movie/${f.tmdbId}">TMDB</a> · last requested ${date(f.lastAt)}</span></td>
<td class="count">${f.requests}</td>
</tr>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Film Requests · Ojai Playhouse</title>
<style>
:root{color-scheme:light dark;--muted:#6b6b76;--line:#e4e2dc;--bg:#fbf9f4;--fg:#1d1b26}
@media (prefers-color-scheme:dark){:root{--muted:#a19fae;--line:#2c2a36;--bg:#111018;--fg:#ecebf3}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.4 system-ui,sans-serif}
main{max-width:760px;margin:0 auto;padding:24px 16px 48px}
h1{margin:0 0 4px;font-size:1.6rem}.muted{color:var(--muted)}
table{width:100%;border-collapse:collapse;margin-top:20px}td{padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:middle}
.rank{color:var(--muted);width:2ch;text-align:right}.poster{width:46px}.poster img{border-radius:4px;display:block}
.count{font-size:1.4rem;font-weight:700;text-align:right;white-space:nowrap}.links{font-size:.85rem;color:var(--muted)}
a{color:inherit}footer{margin-top:28px;font-size:.8rem;color:var(--muted)}
</style></head><body><main>
<h1>Film Requests</h1>
<p class="muted">${films.length} films, ${total} requests from the app · as of ${escape(now.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Los_Angeles" }))}</p>
${films.length ? `<table>${rows}</table>` : "<p>No requests yet.</p>"}
<footer>Keep this link private: anyone with it can see the list. ${TMDB_CREDIT}</footer>
</main></body></html>`;
}

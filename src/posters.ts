// Asks the watcher for the schedule's TMDB posters (worker/posters.ts), for the app's schedule list.
// Posters are a nicety: without the watcher, or if it fails, the feed just has none.
import type { Title } from "./types.ts";

/** Poster URLs by Title key. Upcoming films first, since the watcher looks up only so many per request. */
export async function fetchPosters(
  titles: Title[],
  watcherUrl: string | undefined,
  secret: string | undefined,
): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  if (!watcherUrl || !secret) return found;
  const films = [...new Map(titles.filter((t) => t.isFilm).map((t) => [t.key, t])).values()].map((t) => ({
    key: t.key,
    name: t.name,
    year: t.year,
    director: t.director,
  }));
  if (!films.length) return found;
  try {
    const res = await fetch(`${watcherUrl.replace(/\/$/, "")}/posters`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ films }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`watcher responded ${res.status}`);
    const { posters } = (await res.json()) as { posters: Record<string, string | null> };
    for (const [key, url] of Object.entries(posters)) if (url) found.set(key, url);
  } catch (err) {
    console.warn(`::warning::No posters this time: ${err instanceof Error ? err.message : err}`);
  }
  return found;
}

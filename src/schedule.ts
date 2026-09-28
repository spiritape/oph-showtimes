import { htmlToText } from "./text.ts";
import type { Showtime, Title } from "./types.ts";

/** Identity of a Title across runs: its name, ignoring case and spacing. */
export function titleKey(name: string): string {
  return name.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Groups Showtimes into Titles, ordered by first Showtime. Titles seen in
 * earlier runs keep their slug (`knownSlugs`, by Title key) so links in sent
 * emails never move, and new Titles never take a finished Title's slug.
 */
export function buildSchedule(showtimes: Showtime[], knownSlugs: Record<string, string> = {}): Title[] {
  const byKey = new Map<string, Showtime[]>();
  for (const s of [...showtimes].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    const key = titleKey(s.title);
    byKey.set(key, [...(byKey.get(key) ?? []), s]);
  }

  const taken = new Set(Object.values(knownSlugs));
  return [...byKey].map(([key, group]) => {
    const first = group[0]!;
    const details = readDetails(group.find((s) => s.infoHtml?.trim())?.infoHtml ?? null);
    const slug = knownSlugs[key] ?? freeSlug(slugify(first.title) || "title", details.year, taken);
    taken.add(slug);
    return {
      key,
      slug,
      name: first.title,
      subtitle: first.subtitle,
      category: first.category,
      isFilm: first.category === "film" || (!first.category && Boolean(details.director)),
      ...details,
      imageUrl: group.find((s) => s.imageUrl)?.imageUrl ?? null,
      livestreamUrl: group.find((s) => s.livestreamUrl)?.livestreamUrl ?? null,
      showtimes: group,
    };
  });
}

function freeSlug(base: string, year: string | null, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  if (year && !taken.has(`${base}-${year}`)) return `${base}-${year}`;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const FIELDS = { year: /^year$/i, director: /^directors?$/i, runtime: /^running time$/i, rating: /^rated$/i };

// The Source writes details as "Key: value" lines, followed by synopsis
// paragraphs and sometimes bold house notes, which we skip.
function readDetails(html: string | null) {
  const details = { year: null, director: null, runtime: null, rating: null, synopsis: null } as Record<
    keyof typeof FIELDS | "synopsis",
    string | null
  >;
  for (const para of (html ?? "").split(/<\/p>/i)) {
    const text = htmlToText(para);
    if (!text) continue;
    const lines = text.split("\n").map((l) => l.match(/^([A-Za-z ]{2,20}):\s*(.+)$/));
    if (lines.every(Boolean)) {
      for (const [, key, value] of lines as RegExpMatchArray[]) {
        const field = (Object.keys(FIELDS) as (keyof typeof FIELDS)[]).find((f) => FIELDS[f].test(key!.trim()));
        if (field) details[field] = value!.trim();
      }
    } else if (!details.synopsis && !/^\s*<p>\s*<strong>/i.test(para)) {
      details.synopsis = text;
    }
  }
  return details;
}

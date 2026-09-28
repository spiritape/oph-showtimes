import { htmlToText } from "./text.ts";
import type { Showtime, Title } from "./types.ts";

/** Groups Showtimes into Titles by exact title, ordered by first Showtime. */
export function buildSchedule(showtimes: Showtime[]): Title[] {
  const byName = new Map<string, Showtime[]>();
  for (const s of [...showtimes].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    byName.set(s.title, [...(byName.get(s.title) ?? []), s]);
  }

  const usedSlugs = new Set<string>();
  return [...byName].map(([name, group]) => {
    const first = group[0]!;
    const details = readDetails(group.find((s) => s.infoHtml?.trim())?.infoHtml ?? null);
    const base = slugify(name) || "title";
    let slug = base;
    for (let n = 2; usedSlugs.has(slug); n++) {
      slug = details.year && n === 2 ? `${base}-${details.year}` : `${base}-${n}`;
    }
    usedSlugs.add(slug);
    return {
      slug,
      name,
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

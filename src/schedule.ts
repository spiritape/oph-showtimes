import { htmlToText } from "./text.ts";
import type { AboutParagraph, Showtime, Title } from "./types.ts";

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
  const read = new Map(
    [...byKey].map(([key, group]) => [key, readDetails(group.find((s) => s.infoHtml?.trim())?.infoHtml ?? null, group[0]!.title)]),
  );
  const repeated = repeatedParagraphs([...read.values()].map((d) => d.about));
  return [...byKey].map(([key, group]) => {
    const first = group[0]!;
    const details = read.get(key)!;
    details.about = details.about.filter((p) => !repeated.has(p.text));
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
      sourceUrl: group.find((s) => s.sourceUrl)?.sourceUrl ?? null,
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

const FIELDS = {
  year: /^year$/i,
  director: /^directors?$/i,
  starring: /^starring$/i,
  runtime: /^running time$/i,
  rating: /^rated$/i,
};
type Field = keyof typeof FIELDS;

// Sold-out notes: the Showtime's own soldOut flag says it better.
const HOUSE_NOTE = /^\W*sold[\s-]*out\W*$/i;
// What every free screening repeats: the concession-stand note and how to cancel an Eventbrite RSVP.
const BOILERPLATE = /concession stand|cancel my order|cancel+ing your order|fill up quickly|see you at the movies|^important note:?$/i;
/** A notice in capitals ("REGISTRATION IS CURRENTLY FULL…", "ON SALE 8.28 12PM"), not a description. */
const isNotice = (text: string) => !/[a-z]/.test(text) && /[A-Z]/.test(text);

/**
 * The Source writes details as "Key: value" lines, then the write-up: notices, special
 * guests and awards (often bold), and the description. Known keys become fields, and
 * every other paragraph is kept, in order, for `about`.
 */
function readDetails(html: string | null, name: string) {
  const details: Record<Field | "synopsis", string | null> & { about: AboutParagraph[] } = {
    year: null,
    director: null,
    starring: null,
    runtime: null,
    rating: null,
    synopsis: null,
    about: [],
  };
  const descriptions: string[] = [];
  for (const para of (html ?? "").split(/<\/p>/i)) {
    const text = htmlToText(para);
    if (!text) continue;
    const lines = text.split("\n").map((l) => l.match(/^([A-Za-z ]{2,20}):\s*(.+)$/));
    const fieldOf = (m: RegExpMatchArray | null) =>
      m ? (Object.keys(FIELDS) as Field[]).find((f) => FIELDS[f].test(m[1]!.trim())) : undefined;
    if (lines.every(Boolean) && lines.some(fieldOf)) {
      // Detail lines; any with a key we don't know are kept as written.
      const other: string[] = [];
      for (const m of lines as RegExpMatchArray[]) {
        const field = fieldOf(m);
        if (field) details[field] = m[2]!.trim();
        else other.push(m[0]!);
      }
      if (other.length) details.about.push({ text: other.join("\n"), highlight: false });
      continue;
    }
    if (HOUSE_NOTE.test(text) || BOILERPLATE.test(text)) continue;
    // Live shows often start by repeating their own name.
    if (titleKey(text) === titleKey(name)) continue;
    const highlight = /^\s*<p>\s*<(strong|b)>/i.test(para);
    details.about.push({ text, highlight });
    if (!highlight && !isNotice(text)) descriptions.push(text);
  }
  // The description: the first real paragraph, not a short line like "Doors 7PM / Show 8PM".
  details.synopsis = descriptions.find((t) => t.length >= 60) ?? descriptions[0] ?? null;
  return details;
}

/** Paragraphs that 3 or more Titles share: house boilerplate the list above doesn't know yet. */
function repeatedParagraphs(abouts: AboutParagraph[][]): Set<string> {
  const counts = new Map<string, number>();
  for (const about of abouts) for (const text of new Set(about.map((p) => p.text))) counts.set(text, (counts.get(text) ?? 0) + 1);
  return new Set([...counts].filter(([, n]) => n >= 3).map(([text]) => text));
}

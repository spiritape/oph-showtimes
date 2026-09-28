// Reads the schedule out of the Source's embedded Nuxt payload. See docs/adr/0001.
import { htmlToText } from "./text.ts";
import type { Showtime } from "./types.ts";

export const SOURCE_URL = "https://www.ojaiplayhouse.com/";

export async function fetchSource(contactEmail: string): Promise<string> {
  const res = await fetch(SOURCE_URL, {
    headers: { "User-Agent": `OPH-Showtimes/1.0 (unofficial schedule; ${contactEmail})` },
  });
  if (!res.ok) throw new Error(`Source responded ${res.status}`);
  return res.text();
}

export function readSource(html: string): Showtime[] {
  const match = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match?.[1]) throw new Error("No schedule data found on the Source page");
  const records = findSourceRecords(revive(JSON.parse(match[1])));
  if (!records) throw new Error("No schedule data found in the Source payload");
  return records.map(toShowtime);
}

// Nuxt serializes its payload with devalue: a flat array where objects and
// arrays hold indices into that array, and a few tagged wrappers.
function revive(table: unknown[]): unknown {
  const seen = new Map<number, unknown>();
  const at = (i: number): unknown => {
    if (i < 0) return undefined;
    if (seen.has(i)) return seen.get(i);
    const v = table[i];
    let out: unknown = v;
    if (Array.isArray(v)) {
      if (typeof v[0] === "string") {
        const [tag, inner] = v as [string, number];
        out = ["Reactive", "ShallowReactive", "Ref", "ShallowRef"].includes(tag) ? at(inner) : undefined;
      } else {
        out = (v as number[]).map(at);
      }
    } else if (v && typeof v === "object") {
      const obj: Record<string, unknown> = {};
      seen.set(i, obj);
      for (const [k, idx] of Object.entries(v as Record<string, number>)) obj[k] = at(idx);
      out = obj;
    }
    seen.set(i, out);
    return out;
  };
  return at(0);
}

/** One Showtime as the Source's CMS stores it (its GraphQL type is "Event"). */
type SourceRecord = Record<string, any>;

function findSourceRecords(root: unknown): SourceRecord[] | undefined {
  const data = (root as { data?: Record<string, unknown> })?.data ?? {};
  for (const entry of Object.values(data)) {
    const events = (entry as { events?: unknown })?.events;
    if (Array.isArray(events) && events.every((e) => e?.__typename === "Event")) return events;
  }
  return undefined;
}

function toShowtime(e: SourceRecord): Showtime {
  if (typeof e.title !== "string" || typeof e.eventDate !== "string") {
    throw new Error(`Source record ${e.id} is missing a title or date`);
  }
  const startsAt = new Date(e.eventDate);
  if (Number.isNaN(startsAt.getTime())) throw new Error(`Source record ${e.id} has a bad date`);
  return {
    id: String(e.id),
    title: e.title.trim(),
    subtitle: e.subtitle?.trim() || null,
    startsAt: startsAt.toISOString(),
    category: e.eventCategory?.slug ?? null,
    ticketUrl: e.buyTicketsLink || null,
    rsvpUrl: e.freeScreeningLink || e.freeEventLink || null,
    livestreamUrl: e.livestreamLink || null,
    price: htmlToText(e.additionalNotes?.html) || null,
    imageUrl: e.image?.url ?? null,
    infoHtml: e.eventInformation?.html ?? null,
  };
}

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSchedule } from "../src/schedule.ts";
import { readSource } from "../src/source.ts";
import type { Showtime } from "../src/types.ts";

const showtimes = readSource(readFileSync(new URL("./fixtures/home.html", import.meta.url), "utf8"));

const showtime = (over: Partial<Showtime>): Showtime => ({
  id: "x",
  title: "Untitled",
  subtitle: null,
  startsAt: "2026-10-01T02:00:00.000Z",
  category: "film",
  ticketUrl: null,
  rsvpUrl: null,
  livestreamUrl: null,
  price: null,
  imageUrl: null,
  infoHtml: null,
  sourceUrl: null,
  ...over,
});

describe("buildSchedule", () => {
  it("groups Showtimes with the same title into one Title", () => {
    const digger = buildSchedule(showtimes).find((t) => t.name === "Digger");
    expect(digger?.slug).toBe("digger");
    expect(digger?.showtimes).toHaveLength(10);
    expect(digger?.showtimes[0]?.startsAt).toBe("2026-10-02T02:00:00.000Z");
  });

  it("orders Titles by their first Showtime", () => {
    const names = buildSchedule(showtimes).map((t) => t.name);
    expect(names.slice(0, 3)).toEqual([
      "The Oldest Person in the World",
      "Ha-Chan, Shake Your Booty!",
      "Collateral (4k restored)",
    ]);
  });

  it("reads film details from the Source's rich text", () => {
    const haChan = buildSchedule(showtimes).find((t) => t.name === "Ha-Chan, Shake Your Booty!");
    expect(haChan).toMatchObject({
      isFilm: true,
      year: "2026",
      director: "Josef Kubota Wladyka",
      runtime: "2hr 2min",
      rating: "R",
    });
    expect(haChan?.synopsis).toMatch(/^Haru and Luis love competing in Tokyo's ba/);
  });

  it("marks non-film Titles as Events", () => {
    const comedy = buildSchedule(showtimes).find((t) => t.name === "Melissa Villaseñor - Live!");
    expect(comedy).toMatchObject({ isFilm: false, category: "comedy", slug: "melissa-villasenor-live" });
  });

  it("counts an uncategorized Title with film details as a Film", () => {
    const highlander = buildSchedule(showtimes).find((t) => t.name === "Highlander");
    expect(highlander).toMatchObject({ category: null, isFilm: true, director: "Russell Mulcahy" });
  });

  it("drops apostrophes from slugs", () => {
    const waters = buildSchedule(showtimes).find((t) => t.name === "John Waters - Let's Take Over the World");
    expect(waters?.slug).toBe("john-waters-lets-take-over-the-world");
  });

  it("adds the year to the slug when two Titles would collide", () => {
    const titles = buildSchedule([
      showtime({ title: "Solaris", infoHtml: "<p>Year: 1972</p>", startsAt: "2026-10-01T02:00:00.000Z" }),
      showtime({ title: "Solaris!", infoHtml: "<p>Year: 2002</p>", startsAt: "2026-11-01T02:00:00.000Z" }),
    ]);
    expect(titles.map((t) => t.slug)).toEqual(["solaris", "solaris-2002"]);
  });

  it("treats titles differing only in case or spacing as the same Title", () => {
    const titles = buildSchedule([
      showtime({ title: "Serial Mom", startsAt: "2026-10-01T02:00:00.000Z" }),
      showtime({ title: "SERIAL  MOM ", startsAt: "2026-10-02T02:00:00.000Z" }),
    ]);
    expect(titles).toHaveLength(1);
    expect(titles[0]).toMatchObject({ name: "Serial Mom", slug: "serial-mom" });
    expect(titles[0]?.showtimes).toHaveLength(2);
  });

  it("keeps each Title's slug from earlier runs", () => {
    const [first] = buildSchedule([showtime({ title: "Solaris", infoHtml: "<p>Year: 2002</p>" })]);
    const titles = buildSchedule(
      [
        showtime({ title: "Solaris!", infoHtml: "<p>Year: 1972</p>", startsAt: "2026-10-01T02:00:00.000Z" }),
        showtime({ title: "Solaris", infoHtml: "<p>Year: 2002</p>", startsAt: "2026-11-01T02:00:00.000Z" }),
      ],
      { [first!.key]: first!.slug },
    );
    expect(titles.map((t) => [t.name, t.slug])).toEqual([
      ["Solaris!", "solaris-1972"],
      ["Solaris", "solaris"],
    ]);
  });

  it("never gives a new Title the slug of a finished one", () => {
    const [finished] = buildSchedule([showtime({ title: "Solaris" })]);
    const [next] = buildSchedule([showtime({ title: "Solaris!", infoHtml: "<p>Year: 1972</p>" })], {
      [finished!.key]: finished!.slug,
    });
    expect(next?.slug).toBe("solaris-1972");
  });

  it("doesn't take a sold-out note for the synopsis", () => {
    const [title] = buildSchedule([
      showtime({
        title: "You Can See Everything",
        infoHtml: "<p>Year: 2026</p><p>SOLD OUT!</p><p>A film about seeing.</p>",
      }),
    ]);
    expect(title?.synopsis).toBe("A film about seeing.");
    expect(title?.year).toBe("2026");
  });

  // Mr. Irrelevant's write-up on ojaiplayhouse.com, shortened.
  const MR_IRRELEVANT =
    "<p>REGISTRATION IS CURRENTLY FULL - PLEASE CHECK AT DOORS AT SHOW TIME FOR STANDBY LIST SHOULD ANY SEATS OPEN UP</p>" +
    "<p>Year: 2026<br>Director: Jonathan Levine<br>Starring: Isabel May, Michael Shannon, David Krumholtz<br>Running Time: 2hr 5min</p>" +
    "<p>Rated: PG-13</p>" +
    "<p><strong>Special advance screening</strong></p>" +
    "<p><strong>Introduction from director Jonathan Levine</strong></p>" +
    "<p>Mr. Irrelevant is the inspiring true story of John Tuggle.</p>" +
    "<p><strong>We look forward to seeing you at the historic Ojai Playhouse. Please visit the concession stand.</strong></p>" +
    "<p><strong>Important note:</strong></p>" +
    "<p><strong>If you can't make it, click 'cancel my order' so your tickets go to someone else.</strong></p>" +
    "<p><strong>Thank you! See you at the movies.</strong></p>";

  it("keeps the Playhouse's whole write-up, in order, without the free-screening boilerplate", () => {
    const [title] = buildSchedule([showtime({ title: "Mr. Irrelevant", infoHtml: MR_IRRELEVANT })]);
    expect(title).toMatchObject({
      year: "2026",
      director: "Jonathan Levine",
      starring: "Isabel May, Michael Shannon, David Krumholtz",
      runtime: "2hr 5min",
      rating: "PG-13",
      synopsis: "Mr. Irrelevant is the inspiring true story of John Tuggle.",
    });
    expect(title?.about).toEqual([
      {
        text: "REGISTRATION IS CURRENTLY FULL - PLEASE CHECK AT DOORS AT SHOW TIME FOR STANDBY LIST SHOULD ANY SEATS OPEN UP",
        highlight: false,
      },
      { text: "Special advance screening", highlight: true },
      { text: "Introduction from director Jonathan Levine", highlight: true },
      { text: "Mr. Irrelevant is the inspiring true story of John Tuggle.", highlight: false },
    ]);
  });

  it("keeps detail lines it has no field for", () => {
    const [title] = buildSchedule([
      showtime({ title: "Paris, Texas", infoHtml: "<p>Year: 1984<br>Format: 35mm print</p><p>A man walks out of the desert.</p>" }),
    ]);
    expect(title?.year).toBe("1984");
    expect(title?.about[0]).toEqual({ text: "Format: 35mm print", highlight: false });
  });

  it("drops a paragraph three or more Titles repeat", () => {
    const shared = "<p>Bring a blanket for the patio.</p>";
    const titles = buildSchedule(
      ["A", "B", "C"].map((name, i) =>
        showtime({ id: name, title: name, infoHtml: `<p>Film ${name}.</p>${shared}`, startsAt: `2026-10-0${i + 1}T02:00:00.000Z` }),
      ),
    );
    expect(titles.map((t) => t.about.map((p) => p.text))).toEqual([["Film A."], ["Film B."], ["Film C."]]);
  });
});

describe("readSource", () => {
  it("links each event's own page on the Source", () => {
    const linked = showtimes.find((s) => s.sourceUrl);
    expect(linked?.sourceUrl).toMatch(/^https:\/\/www\.ojaiplayhouse\.com\/event\/[a-z0-9-]+$/);
  });
});

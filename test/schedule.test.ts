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
});

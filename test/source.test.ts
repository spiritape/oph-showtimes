import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readSource } from "../src/source.ts";

const home = readFileSync(new URL("./fixtures/home.html", import.meta.url), "utf8");

describe("readSource", () => {
  it("reads every Showtime from the Source's homepage", () => {
    const showtimes = readSource(home);
    expect(showtimes).toHaveLength(40);
    expect(showtimes[0]).toMatchObject({
      id: "cmsw2r1tm0s9l07mxkhvpyvih",
      title: "The Oldest Person in the World",
      startsAt: "2026-09-27T23:15:00.000Z",
      category: "film",
      ticketUrl: "https://ticketing.uswest.veezi.com/purchase/1071?siteToken=0zv2d2xep31txszrx28cn3r0t4",
      rsvpUrl: null,
      price: "$15/$13.50 (senior 60+)",
      imageUrl: "https://us-west-2.graphassets.com/AjQ6YhqDQQuKSCpFHmA5az/cmsw2og5j0vn207lo6x68u02z",
    });
  });

  it("treats a free screening link as an RSVP", () => {
    const collateral = readSource(home).find((s) => s.title === "Collateral (4k restored)");
    expect(collateral).toMatchObject({
      ticketUrl: null,
      rsvpUrl: "https://www.eventbrite.com/e/1998266653352?aff=oddtdtcreator",
      price: "REGISTRATION REQUIRED",
    });
  });

  it("keeps the Category of non-film Events", () => {
    const comedy = readSource(home).find((s) => s.title === "Melissa Villaseñor - Live!");
    expect(comedy).toMatchObject({ category: "comedy", price: "$35" });
  });

  it("throws when the page has no schedule data", () => {
    expect(() => readSource("<html><body>Maintenance</body></html>")).toThrow(/schedule data/);
  });
});

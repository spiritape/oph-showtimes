import { describe, expect, it } from "vitest";
import { calendarFeed } from "../src/calendar-feed.ts";
import { googleCalendarUrl, thumbnailUrl } from "../src/showtime.ts";
import type { Showtime, Title } from "../src/types.ts";

const showtime: Showtime = {
  id: "s1",
  title: "Collateral (4k restored)",
  subtitle: null,
  startsAt: "2026-09-29T02:00:00.000Z",
  category: "film",
  ticketUrl: null,
  rsvpUrl: "https://www.eventbrite.com/e/1998266653352",
  livestreamUrl: null,
  price: "REGISTRATION REQUIRED",
  imageUrl: null,
  infoHtml: null,
};

const title: Title = {
  key: "collateral (4k restored)",
  slug: "collateral-4k-restored",
  name: "Collateral (4k restored)",
  subtitle: null,
  category: "film",
  isFilm: true,
  year: "2004",
  director: "Michael Mann",
  runtime: "2hr",
  rating: null,
  synopsis: null,
  imageUrl: null,
  livestreamUrl: null,
  showtimes: [showtime],
};

describe("googleCalendarUrl", () => {
  it("prefills Google Calendar with the Showtime, running time, place and booking link", () => {
    const url = new URL(googleCalendarUrl({ title, showtime }, "https://oph-showtimes.pages.dev"));
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      action: "TEMPLATE",
      text: "Collateral (4k restored)",
      dates: "20260929T020000Z/20260929T040000Z",
      location: "Ojai Playhouse, 145 E Ojai Ave, Ojai, CA 93023",
      details:
        "REGISTRATION REQUIRED\nRSVP: https://www.eventbrite.com/e/1998266653352\nhttps://oph-showtimes.pages.dev/t/collateral-4k-restored/",
    });
  });
});

describe("thumbnailUrl", () => {
  it("asks the Source's image host for a small version", () => {
    expect(thumbnailUrl("https://us-west-2.graphassets.com/AjQ6YhqDQQuKSCpFHmA5az/cmsw2og5j0vn207lo6x68u02z")).toBe(
      "https://us-west-2.graphassets.com/AjQ6YhqDQQuKSCpFHmA5az/resize=width:128/cmsw2og5j0vn207lo6x68u02z",
    );
  });

  it("skips images it can't shrink, rather than loading a full-size one", () => {
    expect(thumbnailUrl("https://example.com/poster.jpg")).toBeNull();
    expect(thumbnailUrl(null)).toBeNull();
  });
});

describe("calendarFeed", () => {
  it("escapes the characters iCalendar reserves", () => {
    const odd = { ...title, name: String.raw`Back\slash; comma, done` };
    const feed = calendarFeed("Test", [{ title: odd, showtime }], "https://oph-showtimes.pages.dev", new Date());
    expect(feed).toContain(String.raw`SUMMARY:Back\\slash\; comma\, done`);
  });
});

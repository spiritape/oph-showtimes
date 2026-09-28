import { describe, expect, it } from "vitest";
import { composeNotification } from "../src/notification.ts";
import type { Title } from "../src/types.ts";

const title = (name: string, isFilm: boolean, category: string, startsAt: string): Title => ({
  key: name.toLowerCase(),
  slug: name.toLowerCase().replace(/\s+/g, "-"),
  name,
  subtitle: null,
  category,
  isFilm,
  year: null,
  director: null,
  runtime: null,
  rating: null,
  synopsis: null,
  imageUrl: null,
  livestreamUrl: null,
  showtimes: [
    {
      id: name,
      title: name,
      subtitle: null,
      startsAt,
      category,
      ticketUrl: null,
      rsvpUrl: null,
      livestreamUrl: null,
      price: null,
      imageUrl: null,
      infoHtml: null,
    },
  ],
});

const site = "https://oph-showtimes.pages.dev";

describe("composeNotification", () => {
  it("names a single New Title and links to its page", () => {
    expect(composeNotification([title("Digger", true, "film", "2026-10-02T02:00:00.000Z")], site)).toEqual({
      title: "New at the Playhouse: Digger",
      body: "Film · first showing Thu, Oct 1, 7:00 PM",
      url: "https://oph-showtimes.pages.dev/t/digger/",
    });
  });

  it("uses the Live Show's Category", () => {
    const n = composeNotification([title("John Moreland", false, "music", "2026-10-10T03:00:00.000Z")], site);
    expect(n.body).toBe("Music · first showing Fri, Oct 9, 8:00 PM");
  });

  it("rolls several New Titles into one notification that opens the schedule", () => {
    const titles = [
      title("Digger", true, "film", "2026-10-02T02:00:00.000Z"),
      title("Pecker", true, "film", "2026-10-07T01:00:00.000Z"),
      title("Serial Mom", true, "film", "2026-10-07T02:30:00.000Z"),
    ];
    expect(composeNotification(titles, site)).toEqual({
      title: "3 new at the Playhouse",
      body: "Digger, Pecker, Serial Mom",
      url: "https://oph-showtimes.pages.dev/",
    });
  });
});

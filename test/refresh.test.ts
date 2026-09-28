import { describe, expect, it } from "vitest";
import { shouldPublish } from "../src/refresh.ts";

const now = new Date("2026-10-01T12:00:00Z");

describe("shouldPublish", () => {
  it("publishes on the first run", () => {
    expect(shouldPublish(null, "abc", now)).toBe(true);
  });

  it("publishes as soon as the schedule changes", () => {
    expect(shouldPublish({ scheduleHash: "abc", publishedAt: "2026-10-01T11:45:00Z" }, "xyz", now)).toBe(true);
  });

  it("skips publishing an unchanged schedule", () => {
    expect(shouldPublish({ scheduleHash: "abc", publishedAt: "2026-10-01T11:45:00Z" }, "abc", now)).toBe(false);
  });

  it("refreshes an unchanged schedule every 3 hours so Today and the Calendar Feeds stay current", () => {
    expect(shouldPublish({ scheduleHash: "abc", publishedAt: "2026-10-01T09:05:00Z" }, "abc", now)).toBe(false);
    expect(shouldPublish({ scheduleHash: "abc", publishedAt: "2026-10-01T09:00:00Z" }, "abc", now)).toBe(true);
  });
});

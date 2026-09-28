import { describe, expect, it } from "vitest";
import { guardAlert, guardRead } from "../src/guard.ts";
import type { Showtime } from "../src/types.ts";

const showtimes = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String(i) }) as Showtime);

describe("guardRead", () => {
  it("accepts a normal read", () => {
    expect(guardRead(40, () => showtimes(38))).toEqual({ ok: true, showtimes: showtimes(38) });
  });

  it("accepts any non-empty read when there's no previous count", () => {
    expect(guardRead(null, () => showtimes(3)).ok).toBe(true);
  });

  it("rejects a read that throws", () => {
    expect(
      guardRead(40, () => {
        throw new Error("No schedule data found on the Source page");
      }),
    ).toEqual({ ok: false, reason: "Reading the Source failed: No schedule data found on the Source page" });
  });

  it("rejects a read with zero Showtimes", () => {
    expect(guardRead(null, () => [])).toEqual({ ok: false, reason: "The Source listed zero Showtimes" });
  });

  it("rejects a read under half of the previous count", () => {
    expect(guardRead(40, () => showtimes(19))).toEqual({
      ok: false,
      reason: "The Source listed 19 Showtimes, under half of the previous 40",
    });
    expect(guardRead(40, () => showtimes(20)).ok).toBe(true);
  });
});

describe("guardAlert", () => {
  it("allows a normal New Title Alert", () => {
    expect(guardAlert(3, 25)).toEqual({ ok: true });
  });

  it("holds an alert that would announce most of the schedule", () => {
    expect(guardAlert(14, 25)).toEqual({
      ok: false,
      reason: "14 of 25 Titles look new, which usually means the Source changed how it writes titles",
    });
  });

  it("holds an alert with more new Titles than any real announcement", () => {
    expect(guardAlert(11, 60).ok).toBe(false);
    expect(guardAlert(10, 60).ok).toBe(true);
  });

  it("allows a small schedule where everything is new", () => {
    expect(guardAlert(2, 2).ok).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { computeStreak } from "./streak";

const today = new Date(Date.UTC(2026, 0, 10, 18)); // Jan 10, 2026, mid-day UTC

function daysAgoKey(n: number): string {
  const d = new Date(Date.UTC(2026, 0, 10 - n));
  return d.toISOString().slice(0, 10);
}

describe("computeStreak", () => {
  it("returns 0 when there are no logged days", () => {
    expect(computeStreak([], today)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    const dates = [daysAgoKey(0), daysAgoKey(1), daysAgoKey(2)];
    expect(computeStreak(dates, today)).toBe(3);
  });

  it("stops at the first gap", () => {
    const dates = [daysAgoKey(0), daysAgoKey(1), daysAgoKey(3)]; // gap at day 2
    expect(computeStreak(dates, today)).toBe(2);
  });

  it("still counts the streak through yesterday if today isn't logged yet", () => {
    const dates = [daysAgoKey(1), daysAgoKey(2)];
    expect(computeStreak(dates, today)).toBe(2);
  });

  it("ignores dates that don't connect back to today or yesterday", () => {
    const dates = [daysAgoKey(5), daysAgoKey(6)];
    expect(computeStreak(dates, today)).toBe(0);
  });
});

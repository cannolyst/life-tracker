import { describe, it, expect } from "vitest";
import {
  DEFAULT_TIMEZONE,
  isValidTimezone,
  dateKeyIn,
  dateOnlyIn,
  dayOfMonthIn,
  weekKeyIn,
  zonedParts,
  minutesIntoDayIn,
  zonedTimeToUtc,
} from "./timezone";

// 03:30 UTC on Jan 15 is still the evening of Jan 14 in Chicago (UTC-6),
// but already the afternoon of Jan 15 in Tokyo (UTC+9).
const instant = new Date(Date.UTC(2026, 0, 15, 3, 30));

describe("isValidTimezone", () => {
  it("accepts IANA zone names", () => {
    expect(isValidTimezone("America/Chicago")).toBe(true);
    expect(isValidTimezone("Asia/Tokyo")).toBe(true);
    expect(isValidTimezone(DEFAULT_TIMEZONE)).toBe(true);
  });

  it("rejects junk", () => {
    expect(isValidTimezone("")).toBe(false);
    expect(isValidTimezone("Not/AZone")).toBe(false);
    expect(isValidTimezone("<script>")).toBe(false);
  });
});

describe("dateKeyIn", () => {
  it("returns the calendar day in the given zone", () => {
    expect(dateKeyIn("America/Chicago", instant)).toBe("2026-01-14");
    expect(dateKeyIn("Asia/Tokyo", instant)).toBe("2026-01-15");
    expect(dateKeyIn("UTC", instant)).toBe("2026-01-15");
  });

  it("dateOnlyIn is that day at UTC midnight", () => {
    expect(dateOnlyIn("America/Chicago", instant).toISOString()).toBe("2026-01-14T00:00:00.000Z");
  });

  it("dayOfMonthIn follows the zone", () => {
    expect(dayOfMonthIn("America/Chicago", instant)).toBe(14);
    expect(dayOfMonthIn("Asia/Tokyo", instant)).toBe(15);
  });
});

describe("weekKeyIn", () => {
  it("rolls to a new week at local midnight, not UTC midnight", () => {
    // Sunday Jan 11 2026 01:00 UTC is still Saturday night in Chicago.
    const sundayUtc = new Date(Date.UTC(2026, 0, 11, 1, 0));
    expect(weekKeyIn("America/Chicago", sundayUtc)).not.toBe(weekKeyIn("UTC", sundayUtc));
  });
});

describe("zonedParts / minutesIntoDayIn", () => {
  it("reads wall-clock parts in the zone", () => {
    const p = zonedParts("America/Chicago", instant);
    expect([p.year, p.month, p.day, p.hour, p.minute]).toEqual([2026, 1, 14, 21, 30]);
    expect(minutesIntoDayIn("America/Chicago", instant)).toBe(21 * 60 + 30);
  });
});

describe("zonedTimeToUtc", () => {
  it("converts a wall-clock time to the right instant", () => {
    expect(zonedTimeToUtc("America/Chicago", 2026, 1, 14, 21, 30).toISOString()).toBe(
      "2026-01-15T03:30:00.000Z",
    );
    expect(zonedTimeToUtc("Asia/Tokyo", 2026, 1, 15, 12, 30).toISOString()).toBe(
      "2026-01-15T03:30:00.000Z",
    );
  });

  it("handles daylight saving (CDT is UTC-5, CST is UTC-6)", () => {
    expect(zonedTimeToUtc("America/Chicago", 2026, 7, 1, 12).toISOString()).toBe(
      "2026-07-01T17:00:00.000Z",
    );
    expect(zonedTimeToUtc("America/Chicago", 2026, 12, 1, 12).toISOString()).toBe(
      "2026-12-01T18:00:00.000Z",
    );
  });

  it("round-trips through zonedParts", () => {
    const utc = zonedTimeToUtc("Europe/London", 2026, 10, 25, 8, 15);
    const p = zonedParts("Europe/London", utc);
    expect([p.year, p.month, p.day, p.hour, p.minute]).toEqual([2026, 10, 25, 8, 15]);
  });
});

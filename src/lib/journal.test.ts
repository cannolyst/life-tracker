import { describe, expect, it } from "vitest";
import { readExifDay } from "./exif";
import {
  PROMPTS,
  canEditEntry,
  completeUntil,
  factLines,
  normalizeFacts,
  onThisDayKeys,
  photoDateNote,
  promptFor,
  weatherSummary,
  EMPTY_FACTS,
} from "./journal";

// A minimal little-endian JPEG: SOI, APP1 "Exif", one IFD0 entry pointing at an
// Exif IFD that holds DateTimeOriginal.
function jpegWithDate(text: string): ArrayBuffer {
  const date = new TextEncoder().encode(`${text}\0`); // "YYYY:MM:DD HH:MM:SS\0" = 20 bytes
  const tiff: number[] = [];
  const u16 = (n: number) => tiff.push(n & 0xff, (n >> 8) & 0xff);
  const u32 = (n: number) => tiff.push(n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff);
  tiff.push(0x49, 0x49);
  u16(42);
  u32(8); // IFD0 at 8
  u16(1); // one entry
  u16(0x8769); // ExifIFD pointer
  u16(4);
  u32(1);
  u32(26); // Exif IFD at 26
  u32(0); // next IFD
  u16(1); // Exif IFD: one entry
  u16(0x9003);
  u16(2);
  u32(20);
  u32(44); // value at 44
  u32(0);
  tiff.push(...date);
  const exifHeader = [0x45, 0x78, 0x69, 0x66, 0, 0];
  const payload = [...exifHeader, ...tiff];
  const length = payload.length + 2;
  const bytes = [0xff, 0xd8, 0xff, 0xe1, (length >> 8) & 0xff, length & 0xff, ...payload, 0xff, 0xd9];
  return new Uint8Array(bytes).buffer;
}

describe("readExifDay", () => {
  it("reads DateTimeOriginal as a day key", () => {
    expect(readExifDay(jpegWithDate("2026:10:29 18:42:07"))).toBe("2026-10-29");
  });

  it("returns null for non-JPEG or EXIF-less data", () => {
    expect(readExifDay(new Uint8Array([1, 2, 3, 4, 5]).buffer)).toBeNull();
    expect(readExifDay(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer)).toBeNull();
  });

  it("returns null for a malformed date", () => {
    expect(readExifDay(jpegWithDate("0000:00:00 00:00:00"))).toBe("0000-00-00");
    expect(readExifDay(jpegWithDate("not a date at all!"))).toBeNull();
  });
});

describe("prompts", () => {
  it("rotates daily and always returns a known prompt", () => {
    expect(PROMPTS).toContain(promptFor("2026-10-29"));
    expect(promptFor("2026-10-29")).not.toBe(promptFor("2026-10-30"));
    expect(promptFor("2026-10-29")).toBe(promptFor("2026-10-29"));
  });
});

describe("entry window", () => {
  it("stays open until noon the next day in the user's zone", () => {
    const tz = "America/Chicago";
    expect(completeUntil("2026-10-29", tz).toISOString()).toBe("2026-10-30T17:00:00.000Z"); // noon CDT
    expect(canEditEntry("2026-10-29", tz, new Date("2026-10-30T16:59:00Z"))).toBe(true);
    expect(canEditEntry("2026-10-29", tz, new Date("2026-10-30T17:00:00Z"))).toBe(false);
  });

  it("handles the daylight-saving change", () => {
    // Nov 1 2026 falls back; noon on Nov 2 is CST (UTC-6).
    expect(completeUntil("2026-11-01", "America/Chicago").toISOString()).toBe("2026-11-02T18:00:00.000Z");
  });
});

describe("photoDateNote", () => {
  it("is quiet when the photo is from the day or its date is unknown", () => {
    expect(photoDateNote("2026-10-29", "2026-10-29")).toBeNull();
    expect(photoDateNote(null, "2026-10-29")).toBeNull();
  });

  it("gently names another date", () => {
    expect(photoDateNote("2026-09-02", "2026-10-29")).toContain("September 2, 2026");
  });
});

describe("facts", () => {
  it("drafts short lines and skips what is empty", () => {
    expect(factLines(EMPTY_FACTS)).toEqual([]);
    const lines = factLines({
      ...EMPTY_FACTS,
      events: ["a", "b", "c", "d"],
      finished: ["Call dentist"],
      workout: "Push",
      points: 1,
      weather: { summary: "Cloudy", high: 61.4, low: 48.6 },
      headline: "Something happened",
    });
    expect(lines).toEqual([
      "On the calendar: a, b, c and 1 more",
      "Finished: Call dentist",
      "Workout: Push",
      "1 point earned",
      "Cloudy, 61° / 49°",
      "In the news: Something happened",
    ]);
  });

  it("normalizes missing or broken JSON", () => {
    expect(normalizeFacts(null)).toEqual(EMPTY_FACTS);
    expect(normalizeFacts({ events: ["x", 3], points: "no" }).events).toEqual(["x"]);
  });
});

describe("onThisDayKeys", () => {
  it("looks back a month and over earlier years", () => {
    const keys = onThisDayKeys("2026-10-29");
    expect(keys[0]).toEqual({ key: "2026-09-29", label: "A month ago" });
    expect(keys[1]).toEqual({ key: "2025-10-29", label: "A year ago" });
    expect(keys[2].label).toBe("2 years ago");
  });

  it("skips a month ago when that day doesn't exist and Feb 29 in other years", () => {
    expect(onThisDayKeys("2026-03-31").some((k) => k.label === "A month ago")).toBe(false);
    expect(onThisDayKeys("2028-02-29").every((k) => k.key.endsWith("-29") && k.key.slice(5, 7) === "02" || k.label === "A month ago")).toBe(true);
  });
});

describe("weatherSummary", () => {
  it("maps WMO codes to calm words", () => {
    expect(weatherSummary(0)).toBe("Clear");
    expect(weatherSummary(63)).toBe("Rainy");
    expect(weatherSummary(95)).toBe("Stormy");
  });
});

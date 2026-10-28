import { describe, it, expect } from "vitest";
import {
  NO_REPEAT_DAYS,
  SPARKS,
  SPARK_TYPES,
  countSavedByType,
  pickSpark,
  sparkById,
  typeWeights,
} from "./sparks";

function dateKey(offset: number): string {
  return new Date(Date.UTC(2026, 0, 1 + offset)).toISOString().slice(0, 10);
}

// Walks forward day by day the way the page does: remember each pick, and
// only treat the previous NO_REPEAT_DAYS - 1 days as "used".
function simulate(userId: string, days: number, savedCounts = {}) {
  const picks: { id: string; type: string }[] = [];
  for (let d = 0; d < days; d++) {
    const used = new Set(picks.slice(-(NO_REPEAT_DAYS - 1)).map((p) => p.id));
    const spark = pickSpark({ userId, dateKey: dateKey(d), savedCounts, usedIds: used });
    picks.push({ id: spark.id, type: spark.type });
  }
  return picks;
}

describe("spark bank", () => {
  it("has 365 unique sparks, 73 of each type", () => {
    expect(SPARKS).toHaveLength(365);
    expect(new Set(SPARKS.map((s) => s.id)).size).toBe(365);
    expect(new Set(SPARKS.map((s) => s.text.toLowerCase())).size).toBe(365);
    for (const type of SPARK_TYPES) {
      expect(SPARKS.filter((s) => s.type === type)).toHaveLength(73);
    }
  });

  it("gives every quote an author and every word a definition", () => {
    for (const s of SPARKS.filter((s) => s.type === "quote" || s.type === "word")) {
      expect(s.detail?.length, s.id).toBeGreaterThan(2);
    }
  });
});

describe("pickSpark", () => {
  it("is deterministic for a user and day", () => {
    const args = { userId: "user-a", dateKey: "2026-03-04", savedCounts: {}, usedIds: new Set<string>() };
    expect(pickSpark(args).id).toBe(pickSpark(args).id);
  });

  it("never repeats within a year", () => {
    const picks = simulate("user-a", 365);
    expect(new Set(picks.map((p) => p.id)).size).toBe(365);
  });

  it("keeps going past a year without repeating inside any 365-day window", () => {
    const picks = simulate("user-a", 500);
    for (let start = 0; start + NO_REPEAT_DAYS <= picks.length; start += 37) {
      const window = picks.slice(start, start + NO_REPEAT_DAYS).map((p) => p.id);
      expect(new Set(window).size).toBe(NO_REPEAT_DAYS);
    }
  });

  it("gives different users different rotations", () => {
    const a = simulate("user-a", 30).map((p) => p.id);
    const b = simulate("user-b", 30).map((p) => p.id);
    expect(a).not.toEqual(b);
  });

  it("rotates through all five types", () => {
    const types = new Set(simulate("user-a", 60).map((p) => p.type));
    expect(types.size).toBe(5);
  });

  it("leans gently toward types the user saves, without crowding out the rest", () => {
    const base = simulate("user-c", 200).filter((p) => p.type === "quote").length;
    const leaning = simulate("user-c", 200, { quote: 10 });
    const quotes = leaning.filter((p) => p.type === "quote").length;
    expect(quotes).toBeGreaterThan(base);
    // Even a favorite stays well under half of all days, and every other type still appears.
    expect(quotes / 200).toBeLessThan(0.45);
    for (const type of SPARK_TYPES) expect(leaning.some((p) => p.type === type)).toBe(true);
  });

  it("falls back to another type when a favored type runs out", () => {
    const quoteIds = new Set(SPARKS.filter((s) => s.type === "quote").map((s) => s.id));
    const spark = pickSpark({ userId: "user-a", dateKey: "2026-05-05", savedCounts: { quote: 10 }, usedIds: quoteIds });
    expect(spark.type).not.toBe("quote");
  });

  it("still returns a spark if the whole bank is marked used", () => {
    const all = new Set(SPARKS.map((s) => s.id));
    expect(pickSpark({ userId: "user-a", dateKey: "2026-05-05", savedCounts: {}, usedIds: all })).toBeDefined();
  });
});

describe("typeWeights / countSavedByType", () => {
  it("starts even and caps the nudge", () => {
    expect(typeWeights({}).quote).toBe(1);
    expect(typeWeights({ quote: 3 }).quote).toBeGreaterThan(1);
    expect(typeWeights({ quote: 500 }).quote).toBeLessThanOrEqual(2.3);
  });

  it("counts saves by type and ignores unknown ids", () => {
    const quoteId = SPARKS.find((s) => s.type === "quote")!.id;
    const wordId = SPARKS.find((s) => s.type === "word")!.id;
    expect(countSavedByType([quoteId, quoteId, wordId, "nope"])).toEqual({ quote: 2, word: 1 });
    expect(sparkById(quoteId)?.type).toBe("quote");
  });
});

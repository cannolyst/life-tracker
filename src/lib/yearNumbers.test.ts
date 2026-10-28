import { describe, it, expect } from "vitest";
import { blockCompletionRates, percent } from "./yearNumbers";

const days = (...keys: string[]) => new Set(keys);

describe("blockCompletionRates", () => {
  it("is the share of days each block's habits got done, since they existed", () => {
    const habits = [
      { id: "a", block: "launch", createdKey: "2026-01-01" },
      { id: "b", block: "launch", createdKey: "2026-01-01" },
      { id: "c", block: "shutdown", createdKey: "2026-01-06" },
      { id: "d", block: null, createdKey: "2026-01-01" },
    ];
    const completions = new Map([
      ["a", days("2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05", "2026-01-06", "2026-01-07", "2026-01-08", "2026-01-09", "2026-01-10")],
      ["b", days("2026-01-01", "2026-01-05")],
      ["c", days("2026-01-06", "2026-01-07", "2026-01-08", "2026-01-09", "2026-01-10")],
      ["d", days("2026-01-01")],
    ]);
    const rates = blockCompletionRates(habits, completions, 2026, "2026-01-10");
    // launch: a 10/10 + b 2/10 = 12/20; shutdown: c 5/5; habit d has no block
    expect(rates).toEqual([
      { block: "launch", habits: 2, rate: 0.6 },
      { block: "shutdown", habits: 1, rate: 1 },
    ]);
    expect(percent(0.6)).toBe("60%");
  });

  it("only counts days inside the year and up to today", () => {
    const habits = [{ id: "a", block: "evening", createdKey: "2025-06-01" }];
    const completions = new Map([["a", days("2025-12-31", "2026-01-01", "2026-01-02", "2026-02-01")]]);
    // 2026, today Jan 4 → 4 days expected, 2 done (Dec 31 and Feb 1 fall outside)
    expect(blockCompletionRates(habits, completions, 2026, "2026-01-04")).toEqual([{ block: "evening", habits: 1, rate: 0.5 }]);
  });

  it("skips habits that didn't exist yet and handles no data", () => {
    expect(blockCompletionRates([{ id: "a", block: "launch", createdKey: "2027-01-01" }], new Map(), 2026, "2026-12-31")).toEqual([]);
    expect(blockCompletionRates([], new Map(), 2026, "2026-12-31")).toEqual([]);
  });

  it("lists blocks in day order", () => {
    const habits = [
      { id: "s", block: "shutdown", createdKey: "2026-01-01" },
      { id: "l", block: "launch", createdKey: "2026-01-01" },
    ];
    expect(blockCompletionRates(habits, new Map(), 2026, "2026-01-05").map((r) => r.block)).toEqual(["launch", "shutdown"]);
  });
});

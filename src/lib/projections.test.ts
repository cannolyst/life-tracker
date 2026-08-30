import { describe, it, expect } from "vitest";
import {
  projectSavingsDate,
  projectPayoffDate,
  requiredDailyPayment,
  isOnTrack,
  estimateInterestSaved,
} from "./projections";
import { dateOnlyInAppTimezone } from "./timezone";

// Use explicit UTC instants for all fixtures so these tests are independent
// of the machine's local timezone; expected results are derived via the
// same dateOnlyInAppTimezone helper the implementation uses.
const jan1 = new Date(Date.UTC(2026, 0, 1, 12));
const jan11 = new Date(Date.UTC(2026, 0, 11, 12));

describe("projectSavingsDate", () => {
  it("returns today if the target is already met", () => {
    const result = projectSavingsDate(1000, 500, [], jan1, jan1);
    expect(result).toEqual(dateOnlyInAppTimezone(jan1));
  });

  it("matches simple division for a flat daily contribution rate", () => {
    const transactions = Array.from({ length: 10 }, (_, i) => ({
      date: new Date(Date.UTC(2026, 0, i + 1)),
      amount: 50,
    }));
    // 10 days * $50/day = $500 contributed, balance now 500, target 1000
    // rate = 500/10 = 50/day, remaining = 500, days needed = 10
    const result = projectSavingsDate(500, 1000, transactions, jan1, jan11);
    expect(result).toEqual(new Date(Date.UTC(2026, 0, 21)));
  });

  it("returns null when there is no positive recent contribution rate", () => {
    const result = projectSavingsDate(100, 1000, [], jan1, jan11);
    expect(result).toBeNull();
  });

  it("counts a same-day transaction even though the account's createdAt has a later time-of-day", () => {
    // Regression test: accountCreatedAt is a precise timestamp (e.g.
    // 6:30pm UTC), while the transaction's date column is date-only
    // (parses as midnight UTC). Without normalizing both to a calendar
    // day, the transaction looked "earlier" than the account and got
    // excluded from the contribution window.
    const created = new Date(Date.UTC(2026, 0, 5, 18, 30));
    const transactions = [{ date: new Date("2026-01-05"), amount: 100 }];
    const result = projectSavingsDate(600, 5000, transactions, created, created);
    expect(result).not.toBeNull();
  });
});

describe("projectPayoffDate", () => {
  it("returns today if balance is already zero", () => {
    const result = projectPayoffDate(0, 0.2, 10, 50, 15, jan1);
    expect(result).toEqual(dateOnlyInAppTimezone(jan1));
  });

  it("matches simple division at 0% APR with only a daily micropayment", () => {
    // $1000 balance, $50/day, 0% interest, statement day far in future so it
    // doesn't interfere -> should take exactly 20 days
    const result = projectPayoffDate(1000, 0, 50, 0, 28, jan1);
    expect(result).toEqual(new Date(Date.UTC(2026, 0, 21)));
  });

  it("pays off faster when a minimum payment is included", () => {
    const withoutMin = projectPayoffDate(1000, 0.2, 10, 0, 15, jan1);
    const withMin = projectPayoffDate(1000, 0.2, 10, 200, 15, jan1);
    expect(withMin).not.toBeNull();
    expect(withoutMin).not.toBeNull();
    expect(withMin!.getTime()).toBeLessThan(withoutMin!.getTime());
  });

  it("returns null when payments never outpace interest", () => {
    // Very high APR, tiny payment relative to balance
    const result = projectPayoffDate(10000, 0.35, 1, 5, 15, jan1);
    expect(result).toBeNull();
  });
});

describe("requiredDailyPayment", () => {
  it("returns 0 when balance is already zero", () => {
    expect(requiredDailyPayment(0, 0.2, 50, 15, jan11, jan1)).toBe(0);
  });

  it("returns null when the target date has already passed", () => {
    expect(requiredDailyPayment(1000, 0.2, 50, 15, jan1, jan11)).toBeNull();
  });

  it("returns 0 when the current pace already meets the goal", () => {
    const farTarget = new Date(Date.UTC(2030, 0, 1));
    expect(requiredDailyPayment(1000, 0, 100, 15, farTarget, jan1)).toBe(0);
  });

  it("finds the minimal daily payment that actually hits the target date", () => {
    const target = new Date(Date.UTC(2026, 0, 21));
    const result = requiredDailyPayment(1000, 0, 0, 28, target, jan1);
    expect(result).not.toBeNull();

    const achieved = projectPayoffDate(1000, 0, result!, 0, 28, jan1);
    expect(achieved).not.toBeNull();
    expect(achieved!.getTime()).toBeLessThanOrEqual(target.getTime());

    const insufficient = projectPayoffDate(1000, 0, Math.max(0, result! - 1), 0, 28, jan1);
    expect(insufficient?.getTime() ?? Infinity).toBeGreaterThan(target.getTime());
  });
});

describe("estimateInterestSaved", () => {
  it("returns 0 when there is no daily micropayment", () => {
    expect(estimateInterestSaved(1000, 0.2, 0, 50, 15, jan1)).toBe(0);
  });

  it("returns 0 when the balance is already zero", () => {
    expect(estimateInterestSaved(0, 0.2, 10, 50, 15, jan1)).toBe(0);
  });

  it("returns 0 at 0% APR regardless of payment pace", () => {
    expect(estimateInterestSaved(1000, 0, 10, 50, 15, jan1)).toBe(0);
  });

  it("returns a positive amount when extra daily payments speed up payoff at a positive APR", () => {
    const saved = estimateInterestSaved(1000, 0.2, 10, 50, 15, jan1);
    expect(saved).toBeGreaterThan(0);
  });

  it("saves more interest with a larger daily payment", () => {
    const smaller = estimateInterestSaved(1000, 0.2, 10, 50, 15, jan1);
    const larger = estimateInterestSaved(1000, 0.2, 30, 50, 15, jan1);
    expect(larger).toBeGreaterThan(smaller!);
  });

  it("returns null when no minimum payment has been logged (no baseline to compare against)", () => {
    // Regression test: comparing against "$0/month forever" diverges to an
    // astronomical number over the simulation horizon instead of a real
    // answer.
    expect(estimateInterestSaved(13642.09, 0.2649, 10, 0, 4, jan1)).toBeNull();
  });

  it("returns null when the minimum-only scenario never resolves within the simulation horizon", () => {
    const result = estimateInterestSaved(100000, 0.35, 10, 1, 15, jan1);
    expect(result).toBeNull();
  });
});

describe("isOnTrack", () => {
  it("returns null when there is no target date", () => {
    expect(isOnTrack(jan1, null)).toBeNull();
    expect(isOnTrack(jan1, undefined)).toBeNull();
  });

  it("returns false when there is no projection but a target is set", () => {
    expect(isOnTrack(null, jan11)).toBe(false);
  });

  it("returns true when the projection lands on or before the target", () => {
    expect(isOnTrack(jan1, jan11)).toBe(true);
    expect(isOnTrack(jan1, jan1)).toBe(true);
  });

  it("returns false when the projection lands after the target", () => {
    expect(isOnTrack(jan11, jan1)).toBe(false);
  });

  it("accepts a target date as a string", () => {
    expect(isOnTrack(jan1, "2026-01-11")).toBe(true);
  });
});

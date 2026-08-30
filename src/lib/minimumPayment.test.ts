import { describe, it, expect } from "vitest";
import { computeMinimumPaymentStatus, computeExtraPaidOverMinimum } from "./minimumPayment";

describe("computeMinimumPaymentStatus", () => {
  it("returns null when no statement has been logged", () => {
    expect(computeMinimumPaymentStatus([], undefined)).toBeNull();
  });

  it("is trivially paid when the minimum due is zero", () => {
    const result = computeMinimumPaymentStatus(
      [],
      { statementDate: "2026-08-01", minimumPaymentDue: 0 },
    );
    expect(result).toEqual({ minimumPaymentDue: 0, paidSinceStatement: 0, remaining: 0, paid: true });
  });

  it("counts any payment category, not just ones labeled minimum payment", () => {
    const transactions = [
      { date: "2026-08-05", amount: -10 }, // daily micropayment
      { date: "2026-08-10", amount: -10 }, // daily micropayment
    ];
    const result = computeMinimumPaymentStatus(transactions, {
      statementDate: "2026-08-01",
      minimumPaymentDue: 25,
    });
    expect(result).toEqual({
      minimumPaymentDue: 25,
      paidSinceStatement: 20,
      remaining: 5,
      paid: false,
    });
  });

  it("is paid once cumulative payments since the statement date meet the minimum", () => {
    const transactions = [
      { date: "2026-08-05", amount: -10 },
      { date: "2026-08-15", amount: -20 },
    ];
    const result = computeMinimumPaymentStatus(transactions, {
      statementDate: "2026-08-01",
      minimumPaymentDue: 25,
    });
    expect(result?.paid).toBe(true);
    expect(result?.remaining).toBe(0);
  });

  it("ignores payments dated before the statement (previous cycle) and charges (positive amounts)", () => {
    const transactions = [
      { date: "2026-07-20", amount: -50 }, // previous cycle, doesn't count
      { date: "2026-08-05", amount: 45.5 }, // interest charge, not a payment
    ];
    const result = computeMinimumPaymentStatus(transactions, {
      statementDate: "2026-08-01",
      minimumPaymentDue: 25,
    });
    expect(result?.paidSinceStatement).toBe(0);
    expect(result?.paid).toBe(false);
  });
});

describe("computeExtraPaidOverMinimum", () => {
  it("returns 0 when there are no statements", () => {
    expect(computeExtraPaidOverMinimum([], [])).toBe(0);
  });

  it("sums the amount paid beyond the minimum within a single cycle", () => {
    const transactions = [
      { date: "2026-08-05", amount: -10 },
      { date: "2026-08-15", amount: -30 },
    ];
    const statements = [{ statementDate: "2026-08-01", minimumPaymentDue: 25 }];
    // paid 40 total, minimum was 25 -> 15 extra
    expect(computeExtraPaidOverMinimum(transactions, statements)).toBe(15);
  });

  it("contributes 0 for a cycle that fell short of its minimum, not a negative amount", () => {
    const transactions = [{ date: "2026-08-05", amount: -10 }];
    const statements = [{ statementDate: "2026-08-01", minimumPaymentDue: 25 }];
    expect(computeExtraPaidOverMinimum(transactions, statements)).toBe(0);
  });

  it("scopes each cycle's payments to before the next statement date", () => {
    const transactions = [
      { date: "2026-08-05", amount: -50 }, // cycle 1: 50 paid vs 25 due -> +25 extra
      { date: "2026-09-05", amount: -40 }, // cycle 2: 40 paid vs 30 due -> +10 extra
    ];
    const statements = [
      { statementDate: "2026-08-01", minimumPaymentDue: 25 },
      { statementDate: "2026-09-01", minimumPaymentDue: 30 },
    ];
    expect(computeExtraPaidOverMinimum(transactions, statements)).toBe(35);
  });

  it("ignores interest charges (positive amounts) when summing payments", () => {
    const transactions = [
      { date: "2026-08-05", amount: -25 },
      { date: "2026-08-05", amount: 45.5 }, // interest charge
    ];
    const statements = [{ statementDate: "2026-08-01", minimumPaymentDue: 25 }];
    expect(computeExtraPaidOverMinimum(transactions, statements)).toBe(0);
  });
});

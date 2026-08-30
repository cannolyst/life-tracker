export type MinimumPaymentStatus = {
  minimumPaymentDue: number;
  paidSinceStatement: number;
  remaining: number;
  paid: boolean;
};

/**
 * Determines whether the current statement cycle's minimum payment has
 * been satisfied. Any balance-reducing transaction (one-time, daily
 * micropayment, or minimum payment — not just ones explicitly labeled
 * "minimum payment") dated on or after the latest statement date counts
 * toward it, matching how card issuers actually apply payments. Returns
 * null if no statement has been logged yet.
 */
export function computeMinimumPaymentStatus(
  transactions: { date: string; amount: string | number }[],
  latestStatement: { statementDate: string; minimumPaymentDue: string | number } | undefined,
): MinimumPaymentStatus | null {
  if (!latestStatement) return null;

  const minimumPaymentDue = Number(latestStatement.minimumPaymentDue);
  if (minimumPaymentDue <= 0) {
    return { minimumPaymentDue: 0, paidSinceStatement: 0, remaining: 0, paid: true };
  }

  const paidSinceStatement = transactions
    .filter((t) => t.date >= latestStatement.statementDate && Number(t.amount) < 0)
    .reduce((sum, t) => sum - Number(t.amount), 0);

  const remaining = Math.max(0, minimumPaymentDue - paidSinceStatement);

  return { minimumPaymentDue, paidSinceStatement, remaining, paid: remaining <= 0 };
}

/**
 * Sums how much has been paid beyond each statement cycle's minimum due,
 * across every logged statement (including the current, still-open cycle).
 * For each cycle, payments are the balance-reducing transactions dated
 * from that statement up to (but not including) the next one — or, for
 * the most recent statement, everything since. A cycle that fell short of
 * its minimum contributes 0, not a negative amount.
 */
export function computeExtraPaidOverMinimum(
  transactions: { date: string; amount: string | number }[],
  statements: { statementDate: string; minimumPaymentDue: string | number }[],
): number {
  if (statements.length === 0) return 0;

  const sorted = [...statements].sort((a, b) => a.statementDate.localeCompare(b.statementDate));

  let totalExtra = 0;
  for (let i = 0; i < sorted.length; i++) {
    const cycleStart = sorted[i].statementDate;
    const cycleEnd = i + 1 < sorted.length ? sorted[i + 1].statementDate : null;
    const minimumDue = Number(sorted[i].minimumPaymentDue);

    const paidThisCycle = transactions
      .filter(
        (t) =>
          t.date >= cycleStart &&
          (cycleEnd === null || t.date < cycleEnd) &&
          Number(t.amount) < 0,
      )
      .reduce((sum, t) => sum - Number(t.amount), 0);

    totalExtra += Math.max(0, paidThisCycle - minimumDue);
  }

  return totalExtra;
}

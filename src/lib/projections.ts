import { dateOnlyInAppTimezone, dayOfMonthInAppTimezone } from "./timezone";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const TRAILING_WINDOW_DAYS = 30;
const MAX_SIMULATION_DAYS = 50 * 365;

export type Transaction = {
  date: Date;
  amount: number;
};

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function daysBetween(a: Date, b: Date) {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / MS_PER_DAY));
}

/**
 * Projects the date a savings account reaches its target, based on the
 * average daily net contribution over the trailing window (or full history
 * if shorter). Returns null if the target is already met or the recent
 * pace is flat/negative (no finite projection possible).
 */
export function projectSavingsDate(
  currentBalance: number,
  targetAmount: number,
  transactions: Transaction[],
  accountCreatedAt: Date,
  today: Date = new Date(),
): Date | null {
  const todayDateOnly = dateOnlyInAppTimezone(today);

  const remaining = targetAmount - currentBalance;
  if (remaining <= 0) return todayDateOnly;

  const createdDateOnly = dateOnlyInAppTimezone(accountCreatedAt);
  const windowStart = addDays(todayDateOnly, -TRAILING_WINDOW_DAYS);
  const effectiveStart = windowStart > createdDateOnly ? windowStart : createdDateOnly;

  const windowContributions = transactions
    .filter((t) => t.date >= effectiveStart && t.date <= todayDateOnly)
    .reduce((sum, t) => sum + t.amount, 0);

  const elapsedDays = daysBetween(effectiveStart, todayDateOnly);
  const dailyRate = windowContributions / elapsedDays;

  if (dailyRate <= 0) return null;

  const daysNeeded = Math.ceil(remaining / dailyRate);
  return addDays(todayDateOnly, daysNeeded);
}

type PayoffSimulation = {
  payoffDate: Date | null;
  totalInterest: number;
};

/**
 * Simulates the debt forward day by day: daily interest accrues on the
 * current balance, a daily micropayment is subtracted, and the minimum
 * payment is subtracted on the statement day of each month. Tracks both
 * the payoff date (null if the balance never reaches zero within the
 * simulation horizon) and the total interest accrued along the way — if
 * payoff is never reached, totalInterest covers the full horizon.
 */
function simulatePayoff(
  currentBalance: number,
  apr: number,
  dailyMicropaymentGoal: number,
  minimumPaymentDue: number,
  statementDay: number,
  today: Date,
): PayoffSimulation {
  const todayDateOnly = dateOnlyInAppTimezone(today);

  let balance = currentBalance;
  if (balance <= 0) return { payoffDate: todayDateOnly, totalInterest: 0 };

  const dailyRate = apr / 365;
  let date = todayDateOnly;
  let totalInterest = 0;

  for (let day = 0; day < MAX_SIMULATION_DAYS; day++) {
    const interestToday = balance * dailyRate;
    totalInterest += interestToday;
    balance += interestToday;
    balance -= dailyMicropaymentGoal;

    date = addDays(date, 1);
    if (dayOfMonthInAppTimezone(date) === statementDay) {
      balance -= minimumPaymentDue;
    }

    if (balance <= 0) {
      return { payoffDate: date, totalInterest };
    }
  }

  return { payoffDate: null, totalInterest };
}

/**
 * Projects the payoff date for a debt account. See simulatePayoff for the
 * underlying model.
 */
export function projectPayoffDate(
  currentBalance: number,
  apr: number,
  dailyMicropaymentGoal: number,
  minimumPaymentDue: number,
  statementDay: number,
  today: Date = new Date(),
): Date | null {
  return simulatePayoff(
    currentBalance,
    apr,
    dailyMicropaymentGoal,
    minimumPaymentDue,
    statementDay,
    today,
  ).payoffDate;
}

/**
 * Estimates interest saved by making daily micropayments on top of the
 * minimum, versus a scenario where only the minimum payment is ever made:
 * the difference in total interest accrued between the two simulations,
 * each run to its own completion. Returns null when there's no meaningful
 * baseline to compare against — no minimum payment has been logged yet
 * (comparing to "$0/month forever" diverges to an astronomical number
 * over the simulation horizon rather than a real answer), or the
 * minimum-only scenario never resolves within that horizon at all.
 */
export function estimateInterestSaved(
  currentBalance: number,
  apr: number,
  dailyMicropaymentGoal: number,
  minimumPaymentDue: number,
  statementDay: number,
  today: Date = new Date(),
): number | null {
  if (currentBalance <= 0 || dailyMicropaymentGoal <= 0) return 0;
  if (minimumPaymentDue <= 0) return null;

  const minimumOnly = simulatePayoff(
    currentBalance,
    apr,
    0,
    minimumPaymentDue,
    statementDay,
    today,
  );
  if (minimumOnly.payoffDate === null) return null;

  const actual = simulatePayoff(
    currentBalance,
    apr,
    dailyMicropaymentGoal,
    minimumPaymentDue,
    statementDay,
    today,
  );

  return Math.max(0, minimumOnly.totalInterest - actual.totalInterest);
}

const BINARY_SEARCH_ITERATIONS = 50;

/**
 * Solves for the daily micropayment needed to pay off the debt by
 * targetDate, holding APR, minimum payment, and statement day fixed, via
 * binary search over projectPayoffDate. Returns 0 if the current pace
 * already meets the goal, or null if targetDate has already passed or
 * isn't achievable (paying the entire balance as a single day's payment
 * still can't resolve by that date — effectively only when targetDate is
 * today and there's still a balance).
 */
export function requiredDailyPayment(
  currentBalance: number,
  apr: number,
  minimumPaymentDue: number,
  statementDay: number,
  targetDate: Date,
  today: Date = new Date(),
): number | null {
  const todayDateOnly = dateOnlyInAppTimezone(today);
  const targetDateOnly = dateOnlyInAppTimezone(targetDate);

  if (currentBalance <= 0) return 0;
  if (targetDateOnly < todayDateOnly) return null;

  const payoffAt = (dailyPayment: number) =>
    projectPayoffDate(
      currentBalance,
      apr,
      dailyPayment,
      minimumPaymentDue,
      statementDay,
      todayDateOnly,
    );

  if ((payoffAt(0)?.getTime() ?? Infinity) <= targetDateOnly.getTime()) return 0;

  let low = 0;
  let high = currentBalance;
  if ((payoffAt(high)?.getTime() ?? Infinity) > targetDateOnly.getTime()) {
    return null;
  }

  for (let i = 0; i < BINARY_SEARCH_ITERATIONS; i++) {
    const mid = (low + high) / 2;
    const result = payoffAt(mid);
    if (result !== null && result.getTime() <= targetDateOnly.getTime()) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return Math.ceil(high * 100) / 100;
}

/**
 * Compares a projected date against a target date. Returns null if there's
 * no target set, false if there's no achievable projection (or the
 * projection lands after the target), true otherwise.
 */
export function isOnTrack(
  projectedDate: Date | null,
  targetDate: Date | string | null | undefined,
): boolean | null {
  if (!targetDate) return null;
  if (projectedDate === null) return false;
  const target = typeof targetDate === "string" ? new Date(targetDate) : targetDate;
  return projectedDate.getTime() <= target.getTime();
}

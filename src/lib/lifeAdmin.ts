import { dayDiff } from "./taskPoints";

// Local copy (dashboard.ts imports this file for its flag windows, so it can't import back).
function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Life admin: things that come around on their own clock. All pure — the
// database layer loads rows, this decides what they mean today.

export const RECURRING_COMING_UP_DAYS = 14;
/** Manual (not autopay) bills and subscriptions are flagged this many days out. */
export const MANUAL_CHARGE_FLAG_DAYS = 3;
/** Free trials are flagged this many days before they start charging. */
export const TRIAL_FLAG_DAYS = 2;
export const BIRTHDAY_COMING_UP_DAYS = 7;

/* ---------- recurring items ---------- */

export type IntervalUnit = "days" | "weeks" | "months" | "years";

const UNIT_DAYS: Record<IntervalUnit, number> = { days: 1, weeks: 7, months: 30, years: 365 };

export function intervalToDays(count: number, unit: IntervalUnit): number {
  return Math.max(1, Math.min(3650, Math.round(count) * UNIT_DAYS[unit]));
}

export function describeInterval(days: number): string {
  if (days % 365 === 0) {
    const n = days / 365;
    return n === 1 ? "every year" : `every ${n} years`;
  }
  if (days % 30 === 0) {
    const n = days / 30;
    return n === 1 ? "every month" : `every ${n} months`;
  }
  if (days % 7 === 0) {
    const n = days / 7;
    return n === 1 ? "every week" : `every ${n} weeks`;
  }
  return days === 1 ? "every day" : `every ${days} days`;
}

export type RecurringPhase = "later" | "coming" | "due";

export type RecurringStatus = { dueKey: string; daysUntil: number; phase: RecurringPhase };

/** Due = last done + interval. Never done means it is due the day it was added. */
export function recurringStatus(
  item: { lastDone: string | null; intervalDays: number; createdKey: string },
  todayKey: string,
): RecurringStatus {
  const dueKey = item.lastDone ? addDays(item.lastDone, item.intervalDays) : item.createdKey;
  const daysUntil = dayDiff(todayKey, dueKey);
  const phase: RecurringPhase = daysUntil <= 0 ? "due" : daysUntil <= RECURRING_COMING_UP_DAYS ? "coming" : "later";
  return { dueKey, daysUntil, phase };
}

/** Calm wording: nothing here ever says "overdue". */
export function dueLabel(daysUntil: number): string {
  if (daysUntil === 0) return "ready today";
  if (daysUntil === 1) return "tomorrow";
  if (daysUntil > 1) return `in ${daysUntil} days`;
  const ago = -daysUntil;
  return ago === 1 ? "ready since yesterday" : `ready since ${ago} days ago`;
}

/* ---------- subscriptions and trials ---------- */

export type Cycle = "monthly" | "yearly";

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Adds calendar months, keeping the day of the month (clamped: Jan 31 + 1 month = Feb 28). */
export function addMonths(dateKey: string, months: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const day = Math.min(d, daysInMonth(year, month));
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The next charge on or after today: a passed date rolls forward by the cycle. */
export function nextChargeKey(nextCharge: string, cycle: Cycle, todayKey: string): string {
  const step = cycle === "yearly" ? 12 : 1;
  let key = nextCharge;
  let guard = 0;
  while (key < todayKey && guard++ < 1200) key = addMonths(nextCharge, step * (guard));
  return key;
}

export function monthlyEquivalent(amount: number, cycle: Cycle): number {
  return cycle === "yearly" ? amount / 12 : amount;
}

export type SubscriptionStatus = {
  chargeKey: string;
  daysUntil: number;
  isTrial: boolean;
};

export function subscriptionStatus(
  sub: { nextCharge: string; cycle: Cycle; trialEnds: string | null },
  todayKey: string,
): SubscriptionStatus {
  const isTrial = sub.trialEnds !== null && sub.trialEnds >= todayKey;
  const chargeKey = isTrial ? (sub.trialEnds as string) : nextChargeKey(sub.nextCharge, sub.cycle, todayKey);
  return { chargeKey, daysUntil: dayDiff(todayKey, chargeKey), isTrial };
}

export function auditTotals(subs: { amount: number; cycle: Cycle; isTrial: boolean }[]): {
  monthly: number;
  yearly: number;
  count: number;
} {
  const paid = subs.filter((s) => !s.isTrial);
  const monthly = paid.reduce((sum, s) => sum + monthlyEquivalent(s.amount, s.cycle), 0);
  return { monthly, yearly: monthly * 12, count: paid.length };
}

/* ---------- people ---------- */

/** The next occurrence of a birthday on or after today. Feb 29 falls on Feb 28 in common years. */
export function nextBirthday(month: number, day: number, todayKey: string): { dateKey: string; daysUntil: number } {
  const year = Number(todayKey.slice(0, 4));
  const key = (y: number) => `${y}-${String(month).padStart(2, "0")}-${String(Math.min(day, daysInMonth(y, month))).padStart(2, "0")}`;
  const thisYear = key(year);
  const dateKey = thisYear >= todayKey ? thisYear : key(year + 1);
  return { dateKey, daysUntil: dayDiff(todayKey, dateKey) };
}

export function turningAge(birthYear: number | null, dateKey: string): number | null {
  return birthYear ? Number(dateKey.slice(0, 4)) - birthYear : null;
}

/** "See them every X weeks": ready once that long has passed since they were last seen (or added). */
export function seeNudgeDue(
  person: { seeEveryWeeks: number | null; lastSeen: string | null; createdKey: string },
  todayKey: string,
): { weeksSince: number } | null {
  if (!person.seeEveryWeeks) return null;
  const since = person.lastSeen ?? person.createdKey;
  const due = addDays(since, person.seeEveryWeeks * 7);
  if (due > todayKey) return null;
  return { weeksSince: Math.max(person.seeEveryWeeks, Math.floor(dayDiff(since, todayKey) / 7)) };
}

/**
 * Does a calendar title mention this person? Their full name always counts; a
 * first name counts too, unless two people share it (then only the full name).
 * Whole words only, so "Dan" doesn't match "Danny" or "abundant".
 */
export function mentionsPerson(title: string, name: string, allNames: string[]): boolean {
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hit = (needle: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${escape(needle)}($|[^\\p{L}\\p{N}])`, "iu").test(title);
  const full = name.trim();
  if (!full) return false;
  if (hit(full)) return true;
  const first = full.split(/\s+/)[0];
  if (first.length < 3 || first === full) return false;
  const sharedFirst = allNames.filter((n) => n.trim().split(/\s+/)[0].toLowerCase() === first.toLowerCase()).length > 1;
  return !sharedFirst && hit(first);
}

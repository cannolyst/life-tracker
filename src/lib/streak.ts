import { dateOnlyInAppTimezone } from "./timezone";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// transactionDates are already UTC-midnight-anchored calendar-day values (a
// date-only DB column, or parsed from one) — extract the key via UTC
// components directly rather than re-converting through the Chicago
// timezone formatter, which would shift the day back (see the off-by-one
// bug this pattern caused elsewhere).
function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Counts the number of consecutive calendar days (ending today, or ending
 * yesterday if today hasn't been logged yet so an in-progress day doesn't
 * break the streak) that have at least one entry in `dates`.
 */
export function computeStreak(dates: (Date | string)[], today: Date = new Date()): number {
  const dateKeys = new Set(
    dates.map((d) => utcDateKey(typeof d === "string" ? new Date(d) : d)),
  );

  let cursor = dateOnlyInAppTimezone(today);
  if (!dateKeys.has(utcDateKey(cursor))) {
    cursor = new Date(cursor.getTime() - MS_PER_DAY);
  }

  let streak = 0;
  while (dateKeys.has(utcDateKey(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - MS_PER_DAY);
  }

  return streak;
}

import { dateOnlyInAppTimezone } from "./timezone";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type CleaningStatus = "overdue" | "due-today" | "upcoming";

// lastCompletedDate is a date-only DB column (already UTC-midnight-anchored),
// so its calendar day is read via UTC components directly rather than
// re-converting through the app-timezone formatter — see the same pattern
// (and the off-by-one bug it avoids) in streak.ts.
function utcDateOnly(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * A task is due `frequencyDays` after its last completion (or after
 * creation, if it's never been completed). Compares that due date to today
 * to classify the task as overdue, due today, or upcoming.
 */
export function computeCleaningStatus(
  lastCompletedDate: Date | string | null,
  frequencyDays: number,
  createdAt: Date | string,
  today: Date = new Date(),
): { status: CleaningStatus; dueDate: Date } {
  const anchor = lastCompletedDate
    ? utcDateOnly(lastCompletedDate)
    : dateOnlyInAppTimezone(typeof createdAt === "string" ? new Date(createdAt) : createdAt);
  const dueDate = new Date(anchor.getTime() + frequencyDays * MS_PER_DAY);
  const todayOnly = dateOnlyInAppTimezone(today);

  const diff = dueDate.getTime() - todayOnly.getTime();
  const status: CleaningStatus = diff < 0 ? "overdue" : diff === 0 ? "due-today" : "upcoming";

  return { status, dueDate };
}

export type CleaningTimeframeBucket = "overdue" | "week" | "next-week" | "month" | "later";

function startOfWeekUtc(d: Date): Date {
  const sunday = new Date(d);
  sunday.setUTCDate(sunday.getUTCDate() - d.getUTCDay());
  return sunday;
}

function endOfMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}

export type CleaningTimeframeBoundaries = {
  thisWeekStart: Date;
  thisWeekEnd: Date;
  nextWeekStart: Date;
  nextWeekEnd: Date;
  monthStart: Date;
  monthEnd: Date;
};

// The date ranges behind each timeframe bucket, exposed so the UI can
// label a bucket with its actual dates (e.g. "This week (Sep 6-12)")
// instead of just the bucket name. Weeks run Sunday-Saturday.
export function getTimeframeBoundaries(today: Date = new Date()): CleaningTimeframeBoundaries {
  const todayOnly = dateOnlyInAppTimezone(today);
  const thisWeekStart = startOfWeekUtc(todayOnly);
  const thisWeekEnd = new Date(thisWeekStart.getTime() + 6 * MS_PER_DAY);
  const nextWeekStart = new Date(thisWeekEnd.getTime() + MS_PER_DAY);
  const nextWeekEnd = new Date(nextWeekStart.getTime() + 6 * MS_PER_DAY);
  const monthStart = new Date(Date.UTC(todayOnly.getUTCFullYear(), todayOnly.getUTCMonth(), 1));
  const monthEnd = endOfMonthUtc(todayOnly);

  return { thisWeekStart, thisWeekEnd, nextWeekStart, nextWeekEnd, monthStart, monthEnd };
}

/**
 * Buckets a task by calendar week/month rather than a rolling day-count
 * window, so a weekly task completed today (pushing its due date ~7 days
 * out) lands in "next week" instead of still reading as "this week" —
 * a rolling window would keep re-including it since the window itself
 * shifts along with `today`.
 */
export function classifyByTimeframe(
  status: CleaningStatus,
  dueDate: Date,
  today: Date = new Date(),
): CleaningTimeframeBucket {
  if (status === "overdue") return "overdue";

  const { thisWeekEnd, nextWeekEnd, monthEnd } = getTimeframeBoundaries(today);

  const due = dueDate.getTime();
  if (due <= thisWeekEnd.getTime()) return "week";
  if (due <= nextWeekEnd.getTime()) return "next-week";
  if (due <= monthEnd.getTime()) return "month";
  return "later";
}

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

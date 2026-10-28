import { and, eq, lt, max, sum } from "drizzle-orm";
import { db } from "./index";
import {
  cleaningCompletions,
  dayFlags,
  habitCompletions,
  taskPointEvents,
  weeklyTaskCompletions,
} from "./schema";
import {
  REENTRY_POINTS,
  START_MAX_PER_DAY,
  START_POINTS,
  finishPoints,
  isReentry,
  lastActiveBefore,
} from "@/lib/taskPoints";

/** Every task point award as a dated row, shaped like the other completion tables for charts and sums. */
export async function getTaskPointRows(userId: string): Promise<{ date: string; pointsAwarded: number }[]> {
  const rows = await db
    .select({ date: taskPointEvents.date, pointsAwarded: taskPointEvents.points })
    .from(taskPointEvents)
    .where(eq(taskPointEvents.userId, userId));
  return rows;
}

export async function getTaskPointTotal(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sum(taskPointEvents.points) })
    .from(taskPointEvents)
    .where(eq(taskPointEvents.userId, userId));
  return Number(row?.total ?? 0);
}

/** The most recent day before `todayKey` on which the user earned anything or was marked out for the evening. */
async function lastActiveDayBefore(userId: string, todayKey: string): Promise<string | null> {
  const latest = async (table: typeof habitCompletions | typeof cleaningCompletions | typeof weeklyTaskCompletions) => {
    const [row] = await db
      .select({ d: max(table.date) })
      .from(table)
      .where(and(eq(table.userId, userId), lt(table.date, todayKey)));
    return row?.d ?? null;
  };
  const [habit, cleaning, weekly, tasks, out] = await Promise.all([
    latest(habitCompletions),
    latest(cleaningCompletions),
    latest(weeklyTaskCompletions),
    db
      .select({ d: max(taskPointEvents.date) })
      .from(taskPointEvents)
      .where(and(eq(taskPointEvents.userId, userId), lt(taskPointEvents.date, todayKey)))
      .then((r) => r[0]?.d ?? null),
    db
      .select({ d: max(dayFlags.date) })
      .from(dayFlags)
      .where(and(eq(dayFlags.userId, userId), eq(dayFlags.outTonight, true), lt(dayFlags.date, todayKey)))
      .then((r) => r[0]?.d ?? null),
  ]);
  return lastActiveBefore([habit, cleaning, weekly, tasks, out].filter((d): d is string => d !== null), todayKey);
}

export type Award = { points: number; welcomeBack: boolean };

async function insertEvent(
  userId: string,
  taskId: string | null,
  kind: "start" | "finish" | "reentry",
  points: number,
  dateKey: string,
): Promise<boolean> {
  const inserted = await db
    .insert(taskPointEvents)
    .values({ userId, taskId, kind, points, date: dateKey })
    .onConflictDoNothing()
    .returning({ id: taskPointEvents.id });
  return inserted.length > 0;
}

// If this is the first thing earned after drifting, the comeback bonus rides
// along with it — once per day, and only when the main award actually landed.
async function maybeWelcomeBack(userId: string, dateKey: string): Promise<boolean> {
  const last = await lastActiveDayBefore(userId, dateKey);
  if (!isReentry(last, dateKey)) return false;
  return insertEvent(userId, null, "reentry", REENTRY_POINTS, dateKey);
}

/** +1 for starting a task (up to three different tasks a day). Tapping Start again earns nothing more. */
export async function awardForStart(userId: string, taskId: string, dateKey: string): Promise<Award> {
  const startsToday = await db
    .select({ id: taskPointEvents.id })
    .from(taskPointEvents)
    .where(and(eq(taskPointEvents.userId, userId), eq(taskPointEvents.kind, "start"), eq(taskPointEvents.date, dateKey)));
  if (startsToday.length >= START_MAX_PER_DAY) return { points: 0, welcomeBack: false };

  const landed = await insertEvent(userId, taskId, "start", START_POINTS, dateKey);
  if (!landed) return { points: 0, welcomeBack: false };
  const welcomeBack = await maybeWelcomeBack(userId, dateKey);
  return { points: START_POINTS + (welcomeBack ? REENTRY_POINTS : 0), welcomeBack };
}

/** Points for finishing, by the task's size. Each task pays out once, ever. */
export async function awardForFinish(
  userId: string,
  task: { id: string; minutes: number | null },
  dateKey: string,
): Promise<Award> {
  const points = finishPoints(task.minutes);
  const landed = await insertEvent(userId, task.id, "finish", points, dateKey);
  if (!landed) return { points: 0, welcomeBack: false };
  const welcomeBack = await maybeWelcomeBack(userId, dateKey);
  return { points: points + (welcomeBack ? REENTRY_POINTS : 0), welcomeBack };
}

import { and, asc, eq } from "drizzle-orm";
import { db } from "./index";
import {
  cleaningCompletions,
  dayFlags,
  dayLogs,
  energyCheckins,
  habitCompletions,
  planTasks,
  weeklyTaskCompletions,
} from "./schema";
import type { Bucket, Energy, PlanStatus, PlanTaskLike } from "@/lib/planning";

export type PlanTask = PlanTaskLike & {
  doneDate: string | null;
  createdAt: Date;
};

type PlanTaskRow = typeof planTasks.$inferSelect;

function toPlanTask(row: PlanTaskRow): PlanTask {
  return {
    id: row.id,
    title: row.title,
    lowTitle: row.lowTitle,
    bucket: row.bucket as Bucket,
    minutes: row.minutes,
    status: row.status as PlanStatus,
    plannedFor: row.plannedFor,
    isPriority: row.isPriority,
    doneDate: row.doneDate,
    createdAt: row.createdAt,
  };
}

/** Every plan task the user has, oldest first. Small by design (a personal list). */
export async function getPlanTasks(userId: string): Promise<PlanTask[]> {
  const rows = await db
    .select()
    .from(planTasks)
    .where(eq(planTasks.userId, userId))
    .orderBy(asc(planTasks.createdAt));
  return rows.map(toPlanTask);
}

/**
 * How many things got finished on a local day, across everything that counts:
 * daily habits, cleaning, weekly tasks and plan tasks. This sets tomorrow's cap.
 */
export async function getFinishedCount(userId: string, dateKey: string): Promise<number> {
  const [habits, cleaning, weekly, plan] = await Promise.all([
    db
      .select({ taskId: habitCompletions.taskId })
      .from(habitCompletions)
      .where(and(eq(habitCompletions.userId, userId), eq(habitCompletions.date, dateKey))),
    db
      .select({ id: cleaningCompletions.id })
      .from(cleaningCompletions)
      .where(and(eq(cleaningCompletions.userId, userId), eq(cleaningCompletions.date, dateKey))),
    db
      .select({ id: weeklyTaskCompletions.id })
      .from(weeklyTaskCompletions)
      .where(and(eq(weeklyTaskCompletions.userId, userId), eq(weeklyTaskCompletions.date, dateKey))),
    db
      .select({ id: planTasks.id })
      .from(planTasks)
      .where(and(eq(planTasks.userId, userId), eq(planTasks.status, "done"), eq(planTasks.doneDate, dateKey))),
  ]);
  return new Set(habits.map((h) => h.taskId)).size + cleaning.length + weekly.length + plan.length;
}

export type EnergyToday = { level: Energy; restStartedAt: Date | null; restDone: boolean };

export async function getEnergyToday(userId: string, dateKey: string): Promise<EnergyToday | null> {
  const [row] = await db
    .select()
    .from(energyCheckins)
    .where(and(eq(energyCheckins.userId, userId), eq(energyCheckins.date, dateKey)));
  return row ? { level: row.level as Energy, restStartedAt: row.restStartedAt, restDone: row.restDone } : null;
}

export async function getDayFlag(
  userId: string,
  dateKey: string,
): Promise<{ outTonight: boolean; source: "auto" | "manual" } | null> {
  const [row] = await db
    .select()
    .from(dayFlags)
    .where(and(eq(dayFlags.userId, userId), eq(dayFlags.date, dateKey)));
  return row ? { outTonight: row.outTonight, source: row.source as "auto" | "manual" } : null;
}

/** Records the automatic "out tonight" once; a stored choice (manual or auto) is never overwritten. */
export async function recordAutoOutTonight(userId: string, dateKey: string): Promise<void> {
  await db
    .insert(dayFlags)
    .values({ userId, date: dateKey, outTonight: true, source: "auto" })
    .onConflictDoNothing();
}

export async function getDayLog(
  userId: string,
  dateKey: string,
): Promise<{ note: string; finishedCount: number } | null> {
  const [row] = await db
    .select()
    .from(dayLogs)
    .where(and(eq(dayLogs.userId, userId), eq(dayLogs.date, dateKey)));
  return row ? { note: row.note, finishedCount: row.finishedCount } : null;
}

/** Days marked "out tonight" — they count toward the streak even with no habit logged. */
export async function getProtectedDates(userId: string): Promise<string[]> {
  const rows = await db
    .select({ date: dayFlags.date })
    .from(dayFlags)
    .where(and(eq(dayFlags.userId, userId), eq(dayFlags.outTonight, true)));
  return rows.map((r) => r.date);
}

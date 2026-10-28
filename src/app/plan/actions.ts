"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { dayFlags, dayLogs, energyCheckins, planTasks } from "@/db/schema";
import { getUserSettings } from "@/db/userSettings";
import { getFinishedCount, getPlanTasks } from "@/db/planning";
import { requireUserId } from "@/lib/session";
import { addDays } from "@/lib/dashboard";
import { dateKeyIn } from "@/lib/timezone";
import { capacityCap, isBucket, isEnergy, roomLeft, type Bucket } from "@/lib/planning";

export type TaskResult = { ok: true; note?: string } | { ok: false; error: string };

function refresh() {
  revalidatePath("/");
  revalidatePath("/plan");
}

async function today(userId: string) {
  const { timezone } = await getUserSettings(userId);
  return dateKeyIn(timezone);
}

function cleanText(value: string | null | undefined, max: number): string {
  return (value ?? "").trim().slice(0, max);
}

/* ---------- tasks ---------- */

export async function addPlanTask(input: {
  title: string;
  lowTitle?: string;
  bucket?: string;
  minutes?: number | null;
}): Promise<TaskResult> {
  const title = cleanText(input.title, 200);
  if (!title) return { ok: false, error: "Give the task a name." };
  const lowTitle = cleanText(input.lowTitle, 200) || null;
  const bucket: Bucket = input.bucket && isBucket(input.bucket) ? input.bucket : "inbox";
  const minutes =
    input.minutes && Number.isInteger(input.minutes) && input.minutes >= 1 && input.minutes <= 600
      ? input.minutes
      : null;

  const userId = await requireUserId();
  await db.insert(planTasks).values({ userId, title, lowTitle, bucket, minutes });
  refresh();
  return { ok: true };
}

export async function completePlanTask(taskId: string): Promise<TaskResult> {
  const userId = await requireUserId();
  const dateKey = await today(userId);
  await db
    .update(planTasks)
    .set({ status: "done", doneAt: new Date(), doneDate: dateKey })
    .where(and(eq(planTasks.id, taskId), eq(planTasks.userId, userId)));
  refresh();
  return { ok: true };
}

export async function reopenPlanTask(taskId: string): Promise<TaskResult> {
  const userId = await requireUserId();
  await db
    .update(planTasks)
    .set({ status: "open", doneAt: null, doneDate: null })
    .where(and(eq(planTasks.id, taskId), eq(planTasks.userId, userId)));
  refresh();
  return { ok: true };
}

export async function movePlanTask(taskId: string, bucket: string): Promise<TaskResult> {
  if (!isBucket(bucket)) return { ok: false, error: "Unknown bucket." };
  const userId = await requireUserId();
  await db
    .update(planTasks)
    .set({ bucket })
    .where(and(eq(planTasks.id, taskId), eq(planTasks.userId, userId)));
  refresh();
  return { ok: true };
}

export async function sendToSomeday(taskId: string): Promise<TaskResult> {
  const userId = await requireUserId();
  await db
    .update(planTasks)
    .set({ status: "someday", plannedFor: null, isPriority: false })
    .where(and(eq(planTasks.id, taskId), eq(planTasks.userId, userId)));
  refresh();
  return { ok: true };
}

export async function restoreFromSomeday(taskId: string): Promise<TaskResult> {
  const userId = await requireUserId();
  await db
    .update(planTasks)
    .set({ status: "open", bucket: "inbox" })
    .where(and(eq(planTasks.id, taskId), eq(planTasks.userId, userId), eq(planTasks.status, "someday")));
  refresh();
  return { ok: true };
}

export async function deletePlanTask(taskId: string): Promise<TaskResult> {
  const userId = await requireUserId();
  await db.delete(planTasks).where(and(eq(planTasks.id, taskId), eq(planTasks.userId, userId)));
  refresh();
  return { ok: true };
}

/* ---------- tomorrow's plan ---------- */

/**
 * Puts a task on tomorrow's plan if there's room (about as many as were
 * finished today). If tomorrow is full it goes to Someday instead of piling
 * up, and the caller is told so it can say it kindly.
 */
export async function planForTomorrow(taskId: string): Promise<TaskResult> {
  const userId = await requireUserId();
  const todayKey = await today(userId);
  const tomorrow = addDays(todayKey, 1);

  const [finished, tasks] = await Promise.all([getFinishedCount(userId, todayKey), getPlanTasks(userId)]);
  const planned = tasks.filter((t) => t.status === "open" && t.plannedFor === tomorrow && t.id !== taskId);

  if (roomLeft(capacityCap(finished), planned.length) > 0) {
    await db
      .update(planTasks)
      .set({ plannedFor: tomorrow })
      .where(and(eq(planTasks.id, taskId), eq(planTasks.userId, userId), eq(planTasks.status, "open")));
    refresh();
    return { ok: true };
  }

  await db
    .update(planTasks)
    .set({ status: "someday", plannedFor: null, isPriority: false })
    .where(and(eq(planTasks.id, taskId), eq(planTasks.userId, userId)));
  refresh();
  return { ok: true, note: "Tomorrow is full, so this one is saved for Someday." };
}

export async function unplanTask(taskId: string): Promise<TaskResult> {
  const userId = await requireUserId();
  await db
    .update(planTasks)
    .set({ plannedFor: null, isPriority: false })
    .where(and(eq(planTasks.id, taskId), eq(planTasks.userId, userId)));
  refresh();
  return { ok: true };
}

/** Marks the one task that leads that day's Launch. Only one per planned day. */
export async function setPriorityTask(taskId: string): Promise<TaskResult> {
  const userId = await requireUserId();
  const [task] = await db
    .select({ plannedFor: planTasks.plannedFor })
    .from(planTasks)
    .where(and(eq(planTasks.id, taskId), eq(planTasks.userId, userId)));
  if (!task?.plannedFor) return { ok: false, error: "Plan it for tomorrow first." };

  await db
    .update(planTasks)
    .set({ isPriority: false })
    .where(and(eq(planTasks.userId, userId), eq(planTasks.plannedFor, task.plannedFor), ne(planTasks.id, taskId)));
  await db
    .update(planTasks)
    .set({ isPriority: true })
    .where(and(eq(planTasks.id, taskId), eq(planTasks.userId, userId)));
  refresh();
  return { ok: true };
}

/* ---------- Transition: energy check-in and rest ---------- */

export async function setEnergy(level: string): Promise<TaskResult> {
  if (!isEnergy(level)) return { ok: false, error: "Unknown energy level." };
  const userId = await requireUserId();
  const dateKey = await today(userId);
  // Changing the answer keeps any rest that already started.
  await db
    .insert(energyCheckins)
    .values({ userId, date: dateKey, level })
    .onConflictDoUpdate({ target: [energyCheckins.userId, energyCheckins.date], set: { level } });
  refresh();
  return { ok: true };
}

export async function startRest(): Promise<TaskResult> {
  const userId = await requireUserId();
  const dateKey = await today(userId);
  await db
    .update(energyCheckins)
    .set({ restStartedAt: new Date(), restDone: false })
    .where(and(eq(energyCheckins.userId, userId), eq(energyCheckins.date, dateKey)));
  refresh();
  return { ok: true };
}

export async function finishRest(): Promise<TaskResult> {
  const userId = await requireUserId();
  const dateKey = await today(userId);
  await db
    .update(energyCheckins)
    .set({ restDone: true })
    .where(and(eq(energyCheckins.userId, userId), eq(energyCheckins.date, dateKey)));
  refresh();
  return { ok: true };
}

/* ---------- Out tonight, and the day log ---------- */

export async function setOutTonight(on: boolean): Promise<TaskResult> {
  const userId = await requireUserId();
  const dateKey = await today(userId);
  await db
    .insert(dayFlags)
    .values({ userId, date: dateKey, outTonight: on, source: "manual" })
    .onConflictDoUpdate({
      target: [dayFlags.userId, dayFlags.date],
      set: { outTonight: on, source: "manual" },
    });
  refresh();
  return { ok: true };
}

export async function logDay(note: string): Promise<TaskResult> {
  const userId = await requireUserId();
  const dateKey = await today(userId);
  const finishedCount = await getFinishedCount(userId, dateKey);
  const clean = cleanText(note, 500);
  await db
    .insert(dayLogs)
    .values({ userId, date: dateKey, note: clean, finishedCount })
    .onConflictDoUpdate({
      target: [dayLogs.userId, dayLogs.date],
      set: { note: clean, finishedCount, loggedAt: new Date() },
    });
  refresh();
  return { ok: true };
}

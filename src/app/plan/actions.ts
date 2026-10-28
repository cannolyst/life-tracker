"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { dayFlags, dayLogs, energyCheckins, listCategories, listItems, planTasks } from "@/db/schema";
import { getUserSettings } from "@/db/userSettings";
import { getFinishedCount, getPlanTasks } from "@/db/planning";
import { requireUserId } from "@/lib/session";
import { addDays } from "@/lib/dashboard";
import { dateKeyIn } from "@/lib/timezone";
import { capacityCap, composeTitle, isBucket, isEnergy, isTaskBlock, roomLeft, type Bucket } from "@/lib/planning";

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

export type TaskDetails = {
  verb?: string;
  lowTitle?: string;
  firstStep?: string;
  bucket?: string;
  minutes?: number | null;
  energy?: string | null;
  block?: string | null;
};

function parseMinutes(value: number | null | undefined): number | null {
  return value && Number.isInteger(value) && value >= 1 && value <= 600 ? value : null;
}

function parseDetails(input: TaskDetails) {
  return {
    verb: cleanText(input.verb, 30) || null,
    lowTitle: cleanText(input.lowTitle, 200) || null,
    firstStep: cleanText(input.firstStep, 300) || null,
    minutes: parseMinutes(input.minutes),
    energy: input.energy && isEnergy(input.energy) ? input.energy : null,
    block: input.block && isTaskBlock(input.block) ? input.block : null,
  };
}

// A bare capture (just a title) lands in the Inbox. Adding with a verb and a
// time — the Plan page asks for both — makes it a ready-to-start task.
export async function addPlanTask(input: { title: string } & TaskDetails): Promise<TaskResult> {
  const details = parseDetails(input);
  const title = composeTitle(details.verb, cleanText(input.title, 200));
  if (!title) return { ok: false, error: "Give the task a name." };
  const bucket: Bucket = input.bucket && isBucket(input.bucket) ? input.bucket : "inbox";

  const userId = await requireUserId();
  await db.insert(planTasks).values({ userId, title, bucket, ...details });
  refresh();
  return { ok: true };
}

/** Turns an Inbox item into a task: a verb, a time, an area, and optionally energy, block and first step. */
export async function refineTask(taskId: string, input: TaskDetails): Promise<TaskResult> {
  const details = parseDetails(input);
  if (!details.verb) return { ok: false, error: "Pick a verb to start the task with." };
  if (!details.minutes) return { ok: false, error: "About how many minutes will it take?" };
  const bucket = input.bucket && isBucket(input.bucket) ? input.bucket : null;
  if (!bucket || bucket === "inbox") return { ok: false, error: "Pick an area for it." };

  const userId = await requireUserId();
  const [task] = await db
    .select({ title: planTasks.title })
    .from(planTasks)
    .where(and(eq(planTasks.id, taskId), eq(planTasks.userId, userId)));
  if (!task) return { ok: false, error: "That task is gone." };

  await db
    .update(planTasks)
    .set({ ...details, bucket, title: composeTitle(details.verb, task.title) })
    .where(and(eq(planTasks.id, taskId), eq(planTasks.userId, userId)));
  refresh();
  return { ok: true };
}

/** Files an Inbox item into one of the user's collections, as a list item, and clears it from the Inbox. */
export async function fileIntoCollection(taskId: string, categoryId: string): Promise<TaskResult> {
  const userId = await requireUserId();
  const [[task], [list]] = await Promise.all([
    db
      .select({ title: planTasks.title })
      .from(planTasks)
      .where(and(eq(planTasks.id, taskId), eq(planTasks.userId, userId))),
    db
      .select({ id: listCategories.id, name: listCategories.name })
      .from(listCategories)
      .where(and(eq(listCategories.id, categoryId), eq(listCategories.userId, userId))),
  ]);
  if (!task || !list) return { ok: false, error: "Couldn't find that list." };

  await db.insert(listItems).values({ userId, categoryId: list.id, text: task.title });
  await db.delete(planTasks).where(and(eq(planTasks.id, taskId), eq(planTasks.userId, userId)));
  revalidatePath("/lists");
  refresh();
  return { ok: true, note: `Filed into ${list.name}.` };
}

/** The 5-minute Start. It only records that you began; finishing is still a separate tap. */
export async function startTask(taskId: string): Promise<TaskResult> {
  const userId = await requireUserId();
  await db
    .update(planTasks)
    .set({ startedAt: new Date() })
    .where(and(eq(planTasks.id, taskId), eq(planTasks.userId, userId)));
  refresh();
  return { ok: true };
}

/** "Not this one": set it aside for today; the next card dealt is a smaller task. */
export async function skipTask(taskId: string): Promise<TaskResult> {
  const userId = await requireUserId();
  const dateKey = await today(userId);
  await db
    .update(planTasks)
    .set({ skippedDate: dateKey, skipCount: sql`${planTasks.skipCount} + 1`, startedAt: null })
    .where(and(eq(planTasks.id, taskId), eq(planTasks.userId, userId)));
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

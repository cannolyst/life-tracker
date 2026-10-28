"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { listCategories, listItems, planTasks } from "@/db/schema";
import { completeReset, saveHighlight } from "@/db/reset";
import { getUserSettings } from "@/db/userSettings";
import { requireUserId } from "@/lib/session";
import { addDays } from "@/lib/dashboard";
import { dateKeyIn } from "@/lib/timezone";
import { RESET_POINTS, resetWeekKey } from "@/lib/reset";

export type ResetResult = { ok: true; note?: string; points?: number } | { ok: false; error: string };

async function context() {
  const userId = await requireUserId();
  const { timezone } = await getUserSettings(userId);
  const todayKey = dateKeyIn(timezone);
  return { userId, todayKey, weekKey: resetWeekKey(todayKey) };
}

function refresh() {
  revalidatePath("/reset");
  revalidatePath("/");
  revalidatePath("/plan");
}

export async function saveResetHighlight(text: string): Promise<ResetResult> {
  const { userId, weekKey } = await context();
  await saveHighlight(userId, weekKey, text.trim().slice(0, 300));
  revalidatePath("/reset");
  return { ok: true };
}

/** Puts a task on one of the coming evenings (today through the next six days). */
export async function assignToEvening(taskId: string, dateKey: string): Promise<ResetResult> {
  const { userId, todayKey } = await context();
  const allowed = Array.from({ length: 7 }, (_, i) => addDays(todayKey, i));
  if (!allowed.includes(dateKey)) return { ok: false, error: "Pick one of the next seven evenings." };

  await db
    .update(planTasks)
    .set({ plannedFor: dateKey })
    .where(and(eq(planTasks.id, taskId), eq(planTasks.userId, userId), eq(planTasks.status, "open")));
  refresh();
  return { ok: true };
}

export async function addGroceryItem(text: string): Promise<ResetResult> {
  const item = text.trim().slice(0, 200);
  if (!item) return { ok: false, error: "Type an item first." };
  const { userId } = await context();
  const [list] = await db
    .select({ id: listCategories.id })
    .from(listCategories)
    .where(and(eq(listCategories.userId, userId), eq(listCategories.context, "groceries")))
    .orderBy(asc(listCategories.orderIndex))
    .limit(1);
  if (!list) return { ok: false, error: "Mark one of your lists as Groceries first (Lists → Use this list for)." };
  await db.insert(listItems).values({ userId, categoryId: list.id, text: item });
  revalidatePath("/reset");
  revalidatePath("/lists");
  return { ok: true };
}

/** "Keep" in clear-the-decks: it stops counting as stale for another few weeks. */
export async function keepTask(taskId: string): Promise<ResetResult> {
  const { userId } = await context();
  await db
    .update(planTasks)
    .set({ reviewedAt: new Date() })
    .where(and(eq(planTasks.id, taskId), eq(planTasks.userId, userId)));
  revalidatePath("/reset");
  return { ok: true };
}

export async function finishReset(): Promise<ResetResult> {
  const { userId, todayKey, weekKey } = await context();
  const { awarded } = await completeReset(userId, weekKey, todayKey);
  refresh();
  revalidatePath("/points");
  return awarded > 0
    ? { ok: true, points: awarded, note: `Reset done — +${RESET_POINTS} points. Have a good week.` }
    : { ok: true, note: "Reset done. Have a good week." };
}

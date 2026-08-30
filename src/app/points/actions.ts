"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { habitCategories, habitTasks, habitCompletions, rewards, redemptions } from "@/db/schema";
import { getPointsBalance } from "@/db/queries";
import { dateKeyInAppTimezone } from "@/lib/timezone";

export type ActionState = { error?: string };

function revalidateAll() {
  revalidatePath("/points");
  revalidatePath("/");
}

export async function addCategory(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    return { error: "Name is required" };
  }
  await db.insert(habitCategories).values({ name: name.trim() });
  revalidateAll();
  return {};
}

export async function addTask(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name");
  const pointsRaw = formData.get("points");
  const categoryId = formData.get("categoryId");

  if (typeof name !== "string" || !name.trim()) {
    return { error: "Name is required" };
  }
  const points = Number(pointsRaw);
  if (!Number.isInteger(points) || points <= 0) {
    return { error: "Points must be a positive whole number" };
  }

  await db.insert(habitTasks).values({
    name: name.trim(),
    points,
    categoryId: typeof categoryId === "string" && categoryId ? categoryId : null,
    repeatable: formData.get("repeatable") === "on",
  });
  revalidateAll();
  return {};
}

export async function archiveTask(taskId: string) {
  await db.update(habitTasks).set({ archived: true }).where(eq(habitTasks.id, taskId));
  revalidateAll();
}

// Non-repeatable tasks are a once-a-day checkbox: toggles the single
// completion for today on/off.
export async function toggleTaskCompletion(taskId: string) {
  const todayKey = dateKeyInAppTimezone();
  const [existing] = await db
    .select()
    .from(habitCompletions)
    .where(and(eq(habitCompletions.taskId, taskId), eq(habitCompletions.date, todayKey)));

  if (existing) {
    await db.delete(habitCompletions).where(eq(habitCompletions.id, existing.id));
  } else {
    const [task] = await db.select().from(habitTasks).where(eq(habitTasks.id, taskId));
    if (!task) return;
    await db.insert(habitCompletions).values({
      taskId,
      date: todayKey,
      pointsAwarded: task.points,
    });
  }
  revalidateAll();
}

// Repeatable tasks can be logged more than once per day.
export async function logRepeatableCompletion(taskId: string) {
  const [task] = await db.select().from(habitTasks).where(eq(habitTasks.id, taskId));
  if (!task) return;
  await db.insert(habitCompletions).values({
    taskId,
    date: dateKeyInAppTimezone(),
    pointsAwarded: task.points,
  });
  revalidateAll();
}

export async function undoRepeatableCompletion(taskId: string) {
  const todayKey = dateKeyInAppTimezone();
  const [mostRecent] = await db
    .select()
    .from(habitCompletions)
    .where(and(eq(habitCompletions.taskId, taskId), eq(habitCompletions.date, todayKey)))
    .orderBy(desc(habitCompletions.createdAt))
    .limit(1);
  if (!mostRecent) return;
  await db.delete(habitCompletions).where(eq(habitCompletions.id, mostRecent.id));
  revalidateAll();
}

export async function addReward(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name");
  const costRaw = formData.get("cost");
  const priceUsdRaw = formData.get("priceUsd");
  const link = formData.get("link");

  if (typeof name !== "string" || !name.trim()) {
    return { error: "Name is required" };
  }
  const cost = Number(costRaw);
  if (!Number.isInteger(cost) || cost <= 0) {
    return { error: "Cost must be a positive whole number" };
  }

  let priceUsd: string | null = null;
  if (typeof priceUsdRaw === "string" && priceUsdRaw.trim()) {
    const price = Number(priceUsdRaw);
    if (!Number.isFinite(price) || price < 0) {
      return { error: "Price must be a non-negative number" };
    }
    priceUsd = price.toFixed(2);
  }

  await db.insert(rewards).values({
    name: name.trim(),
    cost,
    priceUsd,
    link: typeof link === "string" && link.trim() ? link.trim() : null,
  });
  revalidateAll();
  return {};
}

export async function archiveReward(rewardId: string) {
  await db.update(rewards).set({ archived: true }).where(eq(rewards.id, rewardId));
  revalidateAll();
}

export async function redeemReward(rewardId: string) {
  const [reward] = await db.select().from(rewards).where(eq(rewards.id, rewardId));
  if (!reward) return;

  const balance = await getPointsBalance();
  if (balance < reward.cost) return;

  await db.insert(redemptions).values({
    rewardId: reward.id,
    rewardName: reward.name,
    pointsCost: reward.cost,
    date: dateKeyInAppTimezone(),
  });
  revalidateAll();
}

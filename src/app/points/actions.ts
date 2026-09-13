"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { habitCategories, habitTasks, habitCompletions, rewards, redemptions } from "@/db/schema";
import { getPointsBalance } from "@/db/queries";
import { requireUserId } from "@/lib/session";
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
  const userId = await requireUserId();
  await db.insert(habitCategories).values({ userId, name: name.trim() });
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

  const userId = await requireUserId();
  await db.insert(habitTasks).values({
    userId,
    name: name.trim(),
    points,
    categoryId: typeof categoryId === "string" && categoryId ? categoryId : null,
    repeatable: formData.get("repeatable") === "on",
  });
  revalidateAll();
  return {};
}

export async function archiveTask(taskId: string) {
  const userId = await requireUserId();
  await db
    .update(habitTasks)
    .set({ archived: true })
    .where(and(eq(habitTasks.id, taskId), eq(habitTasks.userId, userId)));
  revalidateAll();
}

export async function updateTask(
  taskId: string,
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

  const userId = await requireUserId();
  await db
    .update(habitTasks)
    .set({
      name: name.trim(),
      points,
      categoryId: typeof categoryId === "string" && categoryId ? categoryId : null,
      repeatable: formData.get("repeatable") === "on",
    })
    .where(and(eq(habitTasks.id, taskId), eq(habitTasks.userId, userId)));
  revalidateAll();
  return {};
}

// Non-repeatable tasks are a once-a-day checkbox: toggles the single
// completion for today on/off.
export async function toggleTaskCompletion(taskId: string) {
  const userId = await requireUserId();
  const todayKey = dateKeyInAppTimezone();
  const [existing] = await db
    .select()
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.taskId, taskId),
        eq(habitCompletions.date, todayKey),
        eq(habitCompletions.userId, userId),
      ),
    );

  if (existing) {
    await db
      .delete(habitCompletions)
      .where(and(eq(habitCompletions.id, existing.id), eq(habitCompletions.userId, userId)));
  } else {
    const [task] = await db
      .select()
      .from(habitTasks)
      .where(and(eq(habitTasks.id, taskId), eq(habitTasks.userId, userId)));
    if (!task) return;
    await db.insert(habitCompletions).values({
      userId,
      taskId,
      date: todayKey,
      pointsAwarded: task.points,
    });
  }
  revalidateAll();
}

// Repeatable tasks can be logged more than once per day.
export async function logRepeatableCompletion(taskId: string) {
  const userId = await requireUserId();
  const [task] = await db
    .select()
    .from(habitTasks)
    .where(and(eq(habitTasks.id, taskId), eq(habitTasks.userId, userId)));
  if (!task) return;
  await db.insert(habitCompletions).values({
    userId,
    taskId,
    date: dateKeyInAppTimezone(),
    pointsAwarded: task.points,
  });
  revalidateAll();
}

export async function undoRepeatableCompletion(taskId: string) {
  const userId = await requireUserId();
  const todayKey = dateKeyInAppTimezone();
  const [mostRecent] = await db
    .select()
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.taskId, taskId),
        eq(habitCompletions.date, todayKey),
        eq(habitCompletions.userId, userId),
      ),
    )
    .orderBy(desc(habitCompletions.createdAt))
    .limit(1);
  if (!mostRecent) return;
  await db
    .delete(habitCompletions)
    .where(and(eq(habitCompletions.id, mostRecent.id), eq(habitCompletions.userId, userId)));
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

  const userId = await requireUserId();
  await db.insert(rewards).values({
    userId,
    name: name.trim(),
    cost,
    priceUsd,
    link: typeof link === "string" && link.trim() ? link.trim() : null,
  });
  revalidateAll();
  return {};
}

export async function archiveReward(rewardId: string) {
  const userId = await requireUserId();
  await db
    .update(rewards)
    .set({ archived: true })
    .where(and(eq(rewards.id, rewardId), eq(rewards.userId, userId)));
  revalidateAll();
}

export async function redeemReward(rewardId: string) {
  const userId = await requireUserId();
  const [reward] = await db
    .select()
    .from(rewards)
    .where(and(eq(rewards.id, rewardId), eq(rewards.archived, false), eq(rewards.userId, userId)));
  if (!reward) return;

  const balance = await getPointsBalance(userId);
  if (balance < reward.cost) return;

  await db.insert(redemptions).values({
    userId,
    rewardId: reward.id,
    rewardName: reward.name,
    pointsCost: reward.cost,
    date: dateKeyInAppTimezone(),
  });
  // Redeeming is one-time: archive it so it drops off the active list and
  // can't be redeemed again.
  await db
    .update(rewards)
    .set({ archived: true })
    .where(and(eq(rewards.id, rewardId), eq(rewards.userId, userId)));
  revalidateAll();
}

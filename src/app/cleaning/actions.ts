"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { cleaningAreas, cleaningTasks, cleaningCompletions } from "@/db/schema";
import { requireUserId } from "@/lib/session";
import { dateKeyInAppTimezone } from "@/lib/timezone";

export type ActionState = { error?: string };

function revalidateAll() {
  revalidatePath("/cleaning");
  revalidatePath("/points");
  revalidatePath("/");
}

export async function addArea(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    return { error: "Name is required" };
  }
  const userId = await requireUserId();
  await db.insert(cleaningAreas).values({ userId, name: name.trim() });
  revalidateAll();
  return {};
}

export async function addTask(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name");
  const areaId = formData.get("areaId");
  const frequencyDaysRaw = formData.get("frequencyDays");
  const pointsRaw = formData.get("points");

  if (typeof name !== "string" || !name.trim()) {
    return { error: "Name is required" };
  }
  const frequencyDays = Number(frequencyDaysRaw);
  if (!Number.isInteger(frequencyDays) || frequencyDays <= 0) {
    return { error: "Frequency must be a positive whole number of days" };
  }
  const points = Number(pointsRaw);
  if (!Number.isInteger(points) || points <= 0) {
    return { error: "Points must be a positive whole number" };
  }

  const userId = await requireUserId();
  await db.insert(cleaningTasks).values({
    userId,
    name: name.trim(),
    areaId: typeof areaId === "string" && areaId ? areaId : null,
    frequencyDays,
    points,
  });
  revalidateAll();
  return {};
}

export async function archiveTask(taskId: string) {
  const userId = await requireUserId();
  await db
    .update(cleaningTasks)
    .set({ archived: true })
    .where(and(eq(cleaningTasks.id, taskId), eq(cleaningTasks.userId, userId)));
  revalidateAll();
}

export async function markDone(taskId: string) {
  const userId = await requireUserId();
  const todayKey = dateKeyInAppTimezone();
  const [existing] = await db
    .select()
    .from(cleaningCompletions)
    .where(
      and(
        eq(cleaningCompletions.taskId, taskId),
        eq(cleaningCompletions.date, todayKey),
        eq(cleaningCompletions.userId, userId),
      ),
    );

  if (existing) {
    await db
      .delete(cleaningCompletions)
      .where(and(eq(cleaningCompletions.id, existing.id), eq(cleaningCompletions.userId, userId)));
  } else {
    const [task] = await db
      .select()
      .from(cleaningTasks)
      .where(and(eq(cleaningTasks.id, taskId), eq(cleaningTasks.userId, userId)));
    if (!task) return;
    await db.insert(cleaningCompletions).values({
      userId,
      taskId,
      date: todayKey,
      pointsAwarded: task.points,
    });
  }
  revalidateAll();
}

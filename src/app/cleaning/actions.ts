"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { cleaningAreas, cleaningTasks, cleaningCompletions } from "@/db/schema";
import { dateKeyInAppTimezone } from "@/lib/timezone";

export type ActionState = { error?: string };

function revalidateAll() {
  revalidatePath("/cleaning");
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
  await db.insert(cleaningAreas).values({ name: name.trim() });
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

  await db.insert(cleaningTasks).values({
    name: name.trim(),
    areaId: typeof areaId === "string" && areaId ? areaId : null,
    frequencyDays,
    points,
  });
  revalidateAll();
  return {};
}

export async function archiveTask(taskId: string) {
  await db.update(cleaningTasks).set({ archived: true }).where(eq(cleaningTasks.id, taskId));
  revalidateAll();
}

export async function markDone(taskId: string) {
  const todayKey = dateKeyInAppTimezone();
  const [existing] = await db
    .select()
    .from(cleaningCompletions)
    .where(and(eq(cleaningCompletions.taskId, taskId), eq(cleaningCompletions.date, todayKey)));

  if (existing) {
    await db.delete(cleaningCompletions).where(eq(cleaningCompletions.id, existing.id));
  } else {
    const [task] = await db.select().from(cleaningTasks).where(eq(cleaningTasks.id, taskId));
    if (!task) return;
    await db.insert(cleaningCompletions).values({
      taskId,
      date: todayKey,
      pointsAwarded: task.points,
    });
  }
  revalidateAll();
  revalidatePath("/points");
}

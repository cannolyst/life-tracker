"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { habitTasks, habitCompletions, emotionEntries } from "@/db/schema";
import { requireUserId } from "@/lib/session";
import { dateKeyInAppTimezone } from "@/lib/timezone";

const EMOTION_CHECKIN_TASK_NAME = "Emotion check-in";

// Lazily created on first use, mirroring getOrCreateTodaySession in
// exercise/actions.ts — no migration-time backfill needed, and it works
// identically for every future signup.
async function getOrCreateEmotionCheckinTask(userId: string) {
  const [task] = await db
    .select()
    .from(habitTasks)
    .where(and(eq(habitTasks.userId, userId), eq(habitTasks.name, EMOTION_CHECKIN_TASK_NAME)));
  if (task) return task;

  const [created] = await db
    .insert(habitTasks)
    .values({ userId, name: EMOTION_CHECKIN_TASK_NAME, points: 2, repeatable: true })
    .returning();
  return created;
}

export type EmotionEntryInput = {
  moment: string;
  category: string;
  word: string;
  zone: string;
  mode: "quiet" | "stuck";
};

export async function saveEmotionEntry(input: EmotionEntryInput) {
  const userId = await requireUserId();
  const task = await getOrCreateEmotionCheckinTask(userId);
  const todayKey = dateKeyInAppTimezone();

  const [entry] = await db
    .insert(emotionEntries)
    .values({
      userId,
      date: todayKey,
      moment: input.moment,
      category: input.category,
      word: input.word,
      zone: input.zone,
      mode: input.mode,
      pointsAwarded: task.points,
    })
    .returning();

  await db.insert(habitCompletions).values({
    userId,
    taskId: task.id,
    date: todayKey,
    pointsAwarded: task.points,
  });

  revalidatePath("/emotion-checkin");
  revalidatePath("/points");
  revalidatePath("/");

  return entry;
}

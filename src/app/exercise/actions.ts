"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { workoutSessions, workoutSets, workoutExercises } from "@/db/schema";
import { dateKeyInAppTimezone } from "@/lib/timezone";

export type ActionState = { error?: string };

function revalidateAll() {
  revalidatePath("/exercise");
}

async function getOrCreateTodaySession(dayId: string) {
  const todayKey = dateKeyInAppTimezone();
  const [existing] = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.dayId, dayId), eq(workoutSessions.date, todayKey)));
  if (existing) return existing;

  const [created] = await db
    .insert(workoutSessions)
    .values({ dayId, date: todayKey })
    .returning();
  return created;
}

export async function addSet(dayId: string, exerciseId: string, formData: FormData) {
  const weightRaw = formData.get("weight");
  const repsRaw = formData.get("reps");
  const durationRaw = formData.get("durationSeconds");

  const weight = typeof weightRaw === "string" && weightRaw.trim() ? Number(weightRaw) : null;
  const reps = typeof repsRaw === "string" && repsRaw.trim() ? Number(repsRaw) : null;
  const durationSeconds =
    typeof durationRaw === "string" && durationRaw.trim() ? Number(durationRaw) : null;

  if (weight === null && durationSeconds === null) return;

  const session = await getOrCreateTodaySession(dayId);

  const existingSets = await db
    .select()
    .from(workoutSets)
    .where(and(eq(workoutSets.sessionId, session.id), eq(workoutSets.exerciseId, exerciseId)));
  const setNumber =
    existingSets.length > 0 ? Math.max(...existingSets.map((s) => s.setNumber)) + 1 : 1;

  await db.insert(workoutSets).values({
    sessionId: session.id,
    exerciseId,
    setNumber,
    weight: weight != null ? weight.toFixed(2) : null,
    reps,
    durationSeconds,
  });
  revalidateAll();
}

export async function deleteSet(setId: string) {
  await db.delete(workoutSets).where(eq(workoutSets.id, setId));
  revalidateAll();
}

export async function addExercise(
  dayId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    return { error: "Name is required" };
  }
  const tracksDuration = formData.get("tracksDuration") === "on";

  const targetRepsRaw = formData.get("targetReps");
  const targetReps =
    typeof targetRepsRaw === "string" && targetRepsRaw.trim() ? Number(targetRepsRaw) : 12;
  if (!Number.isInteger(targetReps) || targetReps <= 0) {
    return { error: "Target reps must be a positive whole number" };
  }

  const incrementRaw = formData.get("weightIncrement");
  const weightIncrement =
    typeof incrementRaw === "string" && incrementRaw.trim() ? Number(incrementRaw) : 5;
  if (!Number.isFinite(weightIncrement) || weightIncrement <= 0) {
    return { error: "Increment must be a positive number" };
  }

  const existing = await db
    .select()
    .from(workoutExercises)
    .where(eq(workoutExercises.dayId, dayId));

  await db.insert(workoutExercises).values({
    dayId,
    name: name.trim(),
    tracksDuration,
    targetReps,
    weightIncrement: weightIncrement.toFixed(2),
    orderIndex: existing.length,
  });
  revalidateAll();
  return {};
}

export async function updateExercise(
  exerciseId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const targetRepsRaw = formData.get("targetReps");
  const incrementRaw = formData.get("weightIncrement");
  const targetReps = Number(targetRepsRaw);
  const weightIncrement = Number(incrementRaw);

  if (!Number.isInteger(targetReps) || targetReps <= 0) {
    return { error: "Target reps must be a positive whole number" };
  }
  if (!Number.isFinite(weightIncrement) || weightIncrement <= 0) {
    return { error: "Increment must be a positive number" };
  }

  await db
    .update(workoutExercises)
    .set({ targetReps, weightIncrement: weightIncrement.toFixed(2) })
    .where(eq(workoutExercises.id, exerciseId));
  revalidateAll();
  return {};
}

export async function archiveExercise(exerciseId: string) {
  await db.update(workoutExercises).set({ archived: true }).where(eq(workoutExercises.id, exerciseId));
  revalidateAll();
}

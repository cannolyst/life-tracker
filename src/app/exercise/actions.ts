"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { workoutSessions, workoutSets, workoutExercises } from "@/db/schema";
import { requireUserId } from "@/lib/session";
import { dateKeyInAppTimezone } from "@/lib/timezone";
import { MUSCLE_GROUPS } from "@/lib/muscleGroups";

function parseMuscleGroups(formData: FormData): string[] {
  return formData
    .getAll("muscleGroups")
    .filter((v): v is string => typeof v === "string" && (MUSCLE_GROUPS as readonly string[]).includes(v));
}

export type ActionState = { error?: string };

function revalidateAll() {
  revalidatePath("/exercise");
}

async function getOrCreateTodaySession(dayId: string, userId: string) {
  const todayKey = dateKeyInAppTimezone();
  const [existing] = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.dayId, dayId),
        eq(workoutSessions.date, todayKey),
        eq(workoutSessions.userId, userId),
      ),
    );
  if (existing) return existing;

  const [created] = await db
    .insert(workoutSessions)
    .values({ userId, dayId, date: todayKey })
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

  const userId = await requireUserId();
  const session = await getOrCreateTodaySession(dayId, userId);

  const existingSets = await db
    .select()
    .from(workoutSets)
    .where(
      and(
        eq(workoutSets.sessionId, session.id),
        eq(workoutSets.exerciseId, exerciseId),
        eq(workoutSets.userId, userId),
      ),
    );
  const setNumber =
    existingSets.length > 0 ? Math.max(...existingSets.map((s) => s.setNumber)) + 1 : 1;

  await db.insert(workoutSets).values({
    userId,
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
  const userId = await requireUserId();
  await db.delete(workoutSets).where(and(eq(workoutSets.id, setId), eq(workoutSets.userId, userId)));
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

  const userId = await requireUserId();
  const existing = await db
    .select()
    .from(workoutExercises)
    .where(and(eq(workoutExercises.dayId, dayId), eq(workoutExercises.userId, userId)));

  await db.insert(workoutExercises).values({
    userId,
    dayId,
    name: name.trim(),
    tracksDuration,
    targetReps,
    weightIncrement: weightIncrement.toFixed(2),
    muscleGroups: parseMuscleGroups(formData),
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
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    return { error: "Name is required" };
  }

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

  const userId = await requireUserId();
  await db
    .update(workoutExercises)
    .set({
      name: name.trim(),
      targetReps,
      weightIncrement: weightIncrement.toFixed(2),
      muscleGroups: parseMuscleGroups(formData),
    })
    .where(and(eq(workoutExercises.id, exerciseId), eq(workoutExercises.userId, userId)));
  revalidateAll();
  return {};
}

export async function archiveExercise(exerciseId: string) {
  const userId = await requireUserId();
  await db
    .update(workoutExercises)
    .set({ archived: true })
    .where(and(eq(workoutExercises.id, exerciseId), eq(workoutExercises.userId, userId)));
  revalidateAll();
}

// Swaps orderIndex with the adjacent non-archived sibling within the same
// day — same two-row swap pattern as swapDayOrder in
// exercise/programs/actions.ts, scoped by dayId instead of programId.
async function swapExerciseOrder(exerciseId: string, direction: "up" | "down") {
  const userId = await requireUserId();
  const [exercise] = await db
    .select()
    .from(workoutExercises)
    .where(and(eq(workoutExercises.id, exerciseId), eq(workoutExercises.userId, userId)));
  if (!exercise) return;

  const siblings = await db
    .select()
    .from(workoutExercises)
    .where(
      and(
        eq(workoutExercises.dayId, exercise.dayId),
        eq(workoutExercises.userId, userId),
        eq(workoutExercises.archived, false),
      ),
    )
    .orderBy(workoutExercises.orderIndex);

  const index = siblings.findIndex((s) => s.id === exerciseId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= siblings.length) return;

  const sibling = siblings[swapIndex];
  await db
    .update(workoutExercises)
    .set({ orderIndex: sibling.orderIndex })
    .where(and(eq(workoutExercises.id, exercise.id), eq(workoutExercises.userId, userId)));
  await db
    .update(workoutExercises)
    .set({ orderIndex: exercise.orderIndex })
    .where(and(eq(workoutExercises.id, sibling.id), eq(workoutExercises.userId, userId)));

  revalidateAll();
}

export async function moveExerciseUp(exerciseId: string) {
  await swapExerciseOrder(exerciseId, "up");
}

export async function moveExerciseDown(exerciseId: string) {
  await swapExerciseOrder(exerciseId, "down");
}

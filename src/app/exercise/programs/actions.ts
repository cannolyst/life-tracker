"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { workoutPrograms, workoutDays } from "@/db/schema";
import { requireUserId } from "@/lib/session";
import { PROGRAM_PRESETS, type ProgramPreset } from "@/lib/workoutPrograms";

export type ActionState = { error?: string };

function revalidateAll() {
  revalidatePath("/exercise");
  revalidatePath("/exercise/programs");
}

export async function createProgram(
  presetId: ProgramPreset["id"],
  redirectTo: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    return { error: "Name is required" };
  }
  const preset = PROGRAM_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    return { error: "Invalid preset" };
  }

  const userId = await requireUserId();
  const existingPrograms = await db
    .select()
    .from(workoutPrograms)
    .where(eq(workoutPrograms.userId, userId));

  const [program] = await db
    .insert(workoutPrograms)
    .values({ userId, name: name.trim(), active: existingPrograms.length === 0 })
    .returning();

  if (preset.starterDays.length > 0) {
    await db.insert(workoutDays).values(
      preset.starterDays.map((dayName, i) => ({
        userId,
        programId: program.id,
        name: dayName,
        orderIndex: i,
      })),
    );
  }

  revalidateAll();
  redirect(redirectTo);
}

export async function setActiveProgram(programId: string) {
  const userId = await requireUserId();
  await db.update(workoutPrograms).set({ active: false }).where(eq(workoutPrograms.userId, userId));
  await db
    .update(workoutPrograms)
    .set({ active: true })
    .where(and(eq(workoutPrograms.id, programId), eq(workoutPrograms.userId, userId)));
  revalidateAll();
}

export async function renameProgram(
  programId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    return { error: "Name is required" };
  }
  const userId = await requireUserId();
  await db
    .update(workoutPrograms)
    .set({ name: name.trim() })
    .where(and(eq(workoutPrograms.id, programId), eq(workoutPrograms.userId, userId)));
  revalidateAll();
  return {};
}

export async function deleteProgram(programId: string) {
  const userId = await requireUserId();
  // Cascades to workout_days -> workout_exercises/workout_sessions -> workout_sets.
  await db
    .delete(workoutPrograms)
    .where(and(eq(workoutPrograms.id, programId), eq(workoutPrograms.userId, userId)));
  revalidateAll();
  redirect("/exercise/programs");
}

export async function createDay(
  programId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    return { error: "Name is required" };
  }

  const userId = await requireUserId();
  const existing = await db
    .select()
    .from(workoutDays)
    .where(and(eq(workoutDays.programId, programId), eq(workoutDays.userId, userId)));

  await db.insert(workoutDays).values({
    userId,
    programId,
    name: name.trim(),
    orderIndex: existing.length,
  });
  revalidateAll();
  return {};
}

export async function renameDay(
  dayId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    return { error: "Name is required" };
  }
  const userId = await requireUserId();
  await db
    .update(workoutDays)
    .set({ name: name.trim() })
    .where(and(eq(workoutDays.id, dayId), eq(workoutDays.userId, userId)));
  revalidateAll();
  return {};
}

export async function archiveDay(dayId: string) {
  const userId = await requireUserId();
  await db
    .update(workoutDays)
    .set({ archived: true })
    .where(and(eq(workoutDays.id, dayId), eq(workoutDays.userId, userId)));
  revalidateAll();
}

async function swapDayOrder(dayId: string, direction: "up" | "down") {
  const userId = await requireUserId();
  const [day] = await db
    .select()
    .from(workoutDays)
    .where(and(eq(workoutDays.id, dayId), eq(workoutDays.userId, userId)));
  if (!day) return;

  const siblings = await db
    .select()
    .from(workoutDays)
    .where(
      and(
        eq(workoutDays.programId, day.programId),
        eq(workoutDays.userId, userId),
        eq(workoutDays.archived, false),
      ),
    )
    .orderBy(workoutDays.orderIndex);

  const index = siblings.findIndex((s) => s.id === dayId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= siblings.length) return;

  const sibling = siblings[swapIndex];
  await db
    .update(workoutDays)
    .set({ orderIndex: sibling.orderIndex })
    .where(and(eq(workoutDays.id, day.id), eq(workoutDays.userId, userId)));
  await db
    .update(workoutDays)
    .set({ orderIndex: day.orderIndex })
    .where(and(eq(workoutDays.id, sibling.id), eq(workoutDays.userId, userId)));
  revalidateAll();
}

export async function moveDayUp(dayId: string) {
  await swapDayOrder(dayId, "up");
}

export async function moveDayDown(dayId: string) {
  await swapDayOrder(dayId, "down");
}

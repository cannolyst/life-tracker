"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { moduleSettings } from "@/db/schema";
import { requireUserId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string };

export async function saveModuleSettings(
  redirectTo: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();

  const values = {
    showPoints: formData.get("points") === "on",
    showCleaning: formData.get("cleaning") === "on",
    showExercise: formData.get("exercise") === "on",
    showFinance: formData.get("finance") === "on",
    showLists: formData.get("lists") === "on",
    showTodo: formData.get("todo") === "on",
    showYearReview: formData.get("yearReview") === "on",
    showEmotionCheckin: formData.get("emotionCheckin") === "on",
  };

  await db
    .insert(moduleSettings)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: moduleSettings.userId, set: values });

  // Idempotent — harmless if already true, and self-heals a user who
  // somehow reaches this action with a stale onboarded flag.
  const supabase = await createClient();
  await supabase.auth.updateUser({ data: { onboarded: true } });

  revalidatePath("/");
  revalidatePath("/settings");
  redirect(redirectTo);
}

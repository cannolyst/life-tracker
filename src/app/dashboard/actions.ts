"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { saveSpark, unsaveSpark } from "@/db/sparks";

export async function setSparkSaved(sparkId: string, saved: boolean): Promise<void> {
  const userId = await requireUserId();
  if (saved) await saveSpark(userId, sparkId);
  else await unsaveSpark(userId, sparkId);
  revalidatePath("/sparks");
}

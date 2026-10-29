"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { requireUserId } from "@/lib/session";

async function setSeen(seen: boolean) {
  const userId = await requireUserId();
  const walkthroughSeenAt = seen ? new Date() : null;
  await db
    .insert(userSettings)
    .values({ userId, walkthroughSeenAt })
    .onConflictDoUpdate({ target: userSettings.userId, set: { walkthroughSeenAt, updatedAt: new Date() } });
  revalidatePath("/");
}

// Finished or skipped: don't show the first-run walkthrough again.
export async function finishWalkthroughAction(): Promise<void> {
  await setSeen(true);
}

// From the Guide: show the walkthrough again on the home page.
export async function replayWalkthroughAction(): Promise<void> {
  await setSeen(false);
  redirect("/");
}

"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { regenerateBriefToken } from "@/db/brief";

// The plaintext token is only ever returned here, once; the database keeps
// just its hash.
export async function generateBriefToken(): Promise<{ token: string }> {
  const userId = await requireUserId();
  const token = await regenerateBriefToken(userId);
  revalidatePath("/settings");
  return { token };
}

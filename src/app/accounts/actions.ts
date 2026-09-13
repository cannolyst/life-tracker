"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { requireUserId } from "@/lib/session";

export async function deleteAccount(accountId: string) {
  const userId = await requireUserId();
  // Cascades to savings_details/debt_details/transactions/debt_statements/goals.
  await db.delete(accounts).where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  revalidatePath("/");
  redirect("/");
}

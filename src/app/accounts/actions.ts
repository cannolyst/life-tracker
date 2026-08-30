"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";

export async function deleteAccount(accountId: string) {
  // Cascades to savings_details/debt_details/transactions/debt_statements/goals.
  await db.delete(accounts).where(eq(accounts.id, accountId));
  revalidatePath("/");
  redirect("/");
}

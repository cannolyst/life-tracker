"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { transactions, savingsDetails, goals } from "@/db/schema";
import { requireUserId } from "@/lib/session";

export type ActionState = { error?: string };

export async function addSavingsTransaction(
  accountId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const amountRaw = formData.get("amount");
  const direction = formData.get("direction");
  const category = formData.get("category");
  const date = formData.get("date");
  const note = formData.get("note");

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Amount must be a positive number" };
  }
  if (category !== "one_time" && category !== "recurring_goal") {
    return { error: "Invalid category" };
  }
  if (typeof date !== "string" || !date) {
    return { error: "Date is required" };
  }

  const userId = await requireUserId();
  await db.insert(transactions).values({
    userId,
    accountId,
    amount: (direction === "subtract" ? -amount : amount).toFixed(2),
    category,
    date,
    note: typeof note === "string" && note.trim() ? note.trim() : null,
  });

  revalidatePath(`/savings/${accountId}`);
  revalidatePath("/");
  return {};
}

export async function deleteSavingsTransaction(accountId: string, transactionId: string) {
  const userId = await requireUserId();
  await db
    .delete(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));
  revalidatePath(`/savings/${accountId}`);
  revalidatePath("/");
}

export async function updateSavingsGoal(
  accountId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const dailyGoal = Number(formData.get("dailyGoal"));
  const targetAmountRaw = formData.get("targetAmount");
  const targetDateRaw = formData.get("targetDate");

  if (!Number.isFinite(dailyGoal) || dailyGoal < 0) {
    return { error: "Daily goal must be a non-negative number" };
  }

  const userId = await requireUserId();

  await db
    .update(savingsDetails)
    .set({ dailyGoal: dailyGoal.toFixed(2) })
    .where(and(eq(savingsDetails.accountId, accountId), eq(savingsDetails.userId, userId)));

  if (typeof targetAmountRaw === "string" && targetAmountRaw.trim() !== "") {
    const targetAmount = Number(targetAmountRaw);
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      return { error: "Goal amount must be a positive number" };
    }
    const targetDate =
      typeof targetDateRaw === "string" && targetDateRaw ? targetDateRaw : null;

    const [existing] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.accountId, accountId), eq(goals.userId, userId)));

    if (existing) {
      await db
        .update(goals)
        .set({ targetAmount: targetAmount.toFixed(2), targetDate })
        .where(and(eq(goals.id, existing.id), eq(goals.userId, userId)));
    } else {
      await db.insert(goals).values({
        userId,
        accountId,
        targetAmount: targetAmount.toFixed(2),
        targetDate,
      });
    }
  }

  revalidatePath(`/savings/${accountId}`);
  revalidatePath("/");
  return {};
}

"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { transactions, debtDetails, debtStatements, goals } from "@/db/schema";
import { requireUserId } from "@/lib/session";

export type ActionState = { error?: string };

export async function addDebtTransaction(
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
  if (
    category !== "one_time" &&
    category !== "recurring_goal" &&
    category !== "minimum_payment"
  ) {
    return { error: "Invalid category" };
  }
  if (typeof date !== "string" || !date) {
    return { error: "Date is required" };
  }

  const userId = await requireUserId();
  await db.insert(transactions).values({
    userId,
    accountId,
    amount: (direction === "add" ? amount : -amount).toFixed(2),
    category,
    date,
    note: typeof note === "string" && note.trim() ? note.trim() : null,
  });

  revalidatePath(`/debt/${accountId}`);
  revalidatePath("/");
  return {};
}

export async function addDebtStatement(
  accountId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const statementDate = formData.get("statementDate");
  const minimumPaymentDue = Number(formData.get("minimumPaymentDue"));
  const interestCharged = Number(formData.get("interestCharged"));
  const statementBalanceRaw = formData.get("statementBalance");

  if (typeof statementDate !== "string" || !statementDate) {
    return { error: "Statement date is required" };
  }
  if (!Number.isFinite(minimumPaymentDue) || minimumPaymentDue < 0) {
    return { error: "Minimum payment due must be a non-negative number" };
  }
  if (!Number.isFinite(interestCharged) || interestCharged < 0) {
    return { error: "Interest charged must be a non-negative number" };
  }

  const userId = await requireUserId();

  await db.insert(debtStatements).values({
    userId,
    accountId,
    statementDate,
    minimumPaymentDue: minimumPaymentDue.toFixed(2),
    interestCharged: interestCharged.toFixed(2),
    statementBalance:
      typeof statementBalanceRaw === "string" && statementBalanceRaw.trim() !== ""
        ? Number(statementBalanceRaw).toFixed(2)
        : null,
  });

  if (interestCharged > 0) {
    await db.insert(transactions).values({
      userId,
      accountId,
      amount: interestCharged.toFixed(2),
      category: "interest",
      date: statementDate,
      note: "Interest charged this statement",
    });
  }

  revalidatePath(`/debt/${accountId}`);
  revalidatePath("/");
  return {};
}

export async function deleteDebtTransaction(accountId: string, transactionId: string) {
  const userId = await requireUserId();
  await db
    .delete(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));
  revalidatePath(`/debt/${accountId}`);
  revalidatePath("/");
}

export async function updateDebtGoal(
  accountId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const targetDateRaw = formData.get("targetDate");
  const targetDate =
    typeof targetDateRaw === "string" && targetDateRaw.trim() !== "" ? targetDateRaw : null;

  const userId = await requireUserId();
  const [existing] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.accountId, accountId), eq(goals.userId, userId)));

  if (existing) {
    await db
      .update(goals)
      .set({ targetDate })
      .where(and(eq(goals.id, existing.id), eq(goals.userId, userId)));
  } else {
    await db.insert(goals).values({ userId, accountId, targetAmount: "0", targetDate });
  }

  revalidatePath(`/debt/${accountId}`);
  revalidatePath("/");
  return {};
}

export async function updateDebtSettings(
  accountId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const aprPercent = Number(formData.get("aprPercent"));
  const dailyMicropaymentGoal = Number(formData.get("dailyMicropaymentGoal"));
  const statementDay = Number(formData.get("statementDay"));

  if (!Number.isFinite(aprPercent) || aprPercent < 0) {
    return { error: "APR must be a non-negative number" };
  }
  if (!Number.isFinite(dailyMicropaymentGoal) || dailyMicropaymentGoal < 0) {
    return { error: "Daily micropayment goal must be a non-negative number" };
  }
  if (!Number.isInteger(statementDay) || statementDay < 1 || statementDay > 28) {
    return { error: "Statement day must be between 1 and 28" };
  }

  const userId = await requireUserId();
  await db
    .update(debtDetails)
    .set({
      apr: (aprPercent / 100).toFixed(4),
      dailyMicropaymentGoal: dailyMicropaymentGoal.toFixed(2),
      statementDay,
    })
    .where(and(eq(debtDetails.accountId, accountId), eq(debtDetails.userId, userId)));

  revalidatePath(`/debt/${accountId}`);
  revalidatePath("/");
  return {};
}

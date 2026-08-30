"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { accounts, savingsDetails, debtDetails, goals } from "@/db/schema";

export type CreateAccountState = { error?: string };

export async function createAccount(
  _prevState: CreateAccountState,
  formData: FormData,
): Promise<CreateAccountState> {
  const type = formData.get("type");
  const name = formData.get("name");
  const startingBalanceRaw = formData.get("startingBalance");

  if (type !== "savings" && type !== "debt") {
    return { error: "Invalid account type" };
  }
  if (typeof name !== "string" || name.trim().length === 0) {
    return { error: "Name is required" };
  }
  const startingBalance = Number(startingBalanceRaw);
  if (!Number.isFinite(startingBalance) || startingBalance < 0) {
    return { error: "Starting balance must be a non-negative number" };
  }

  let accountId: string;

  if (type === "savings") {
    const dailyGoal = Number(formData.get("dailyGoal") ?? 0);
    const targetAmountRaw = formData.get("targetAmount");
    const targetDateRaw = formData.get("targetDate");

    if (!Number.isFinite(dailyGoal) || dailyGoal < 0) {
      return { error: "Daily savings goal must be a non-negative number" };
    }

    const [account] = await db
      .insert(accounts)
      .values({ type, name: name.trim(), startingBalance: startingBalance.toFixed(2) })
      .returning();
    accountId = account.id;

    await db.insert(savingsDetails).values({
      accountId,
      dailyGoal: dailyGoal.toFixed(2),
    });

    if (typeof targetAmountRaw === "string" && targetAmountRaw.trim() !== "") {
      const targetAmount = Number(targetAmountRaw);
      if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
        return { error: "Goal amount must be a positive number" };
      }
      await db.insert(goals).values({
        accountId,
        targetAmount: targetAmount.toFixed(2),
        targetDate:
          typeof targetDateRaw === "string" && targetDateRaw ? targetDateRaw : null,
      });
    }
  } else {
    const aprPercentRaw = formData.get("aprPercent");
    const dailyMicropaymentGoal = Number(formData.get("dailyMicropaymentGoal") ?? 0);
    const statementDay = Number(formData.get("statementDay"));

    const aprPercent = Number(aprPercentRaw);
    if (!Number.isFinite(aprPercent) || aprPercent < 0) {
      return { error: "APR must be a non-negative number" };
    }
    if (!Number.isFinite(dailyMicropaymentGoal) || dailyMicropaymentGoal < 0) {
      return { error: "Daily micropayment goal must be a non-negative number" };
    }
    if (!Number.isInteger(statementDay) || statementDay < 1 || statementDay > 28) {
      return { error: "Statement day must be between 1 and 28" };
    }

    const [account] = await db
      .insert(accounts)
      .values({ type, name: name.trim(), startingBalance: startingBalance.toFixed(2) })
      .returning();
    accountId = account.id;

    await db.insert(debtDetails).values({
      accountId,
      apr: (aprPercent / 100).toFixed(4),
      dailyMicropaymentGoal: dailyMicropaymentGoal.toFixed(2),
      statementDay,
    });

    await db.insert(goals).values({
      accountId,
      targetAmount: "0",
    });
  }

  redirect(type === "savings" ? `/savings/${accountId}` : `/debt/${accountId}`);
}

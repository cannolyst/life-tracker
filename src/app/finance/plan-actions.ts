"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  paycheckPlan,
  billsLineItems,
  paycheckChecklistChecks,
  transactions,
  accounts,
} from "@/db/schema";
import { requireUserId } from "@/lib/session";
import { getBillsLineItems, getPaycheckPlan } from "@/db/queries";
import { dateKeyInAppTimezone } from "@/lib/timezone";

function revalidateFinance() {
  revalidatePath("/finance");
}

const AMOUNT_FIELDS = [
  "plannedAmount",
  "actualAmount",
  "billsTransferAmount",
  "hysaTransferAmount",
] as const;
const DAY_FIELDS = ["payDay1", "payDay2"] as const;
type PaycheckPlanField = (typeof AMOUNT_FIELDS)[number] | (typeof DAY_FIELDS)[number];

const DEFAULT_PLAN = {
  plannedAmount: "0",
  actualAmount: "0",
  payDay1: 1,
  payDay2: 15,
  billsTransferAmount: "0",
  hysaTransferAmount: "0",
  hysaAccountId: null as string | null,
};

// Called on blur/enter from a single inline-edit field. Merges the changed
// field onto the existing row (or sane defaults, for a not-yet-onboarded
// user) so the insert branch of the upsert always has every required
// column, while the update branch only touches the one field that changed.
export async function savePaycheckPlanField(field: PaycheckPlanField, rawValue: string) {
  const userId = await requireUserId();
  const isDayField = (DAY_FIELDS as readonly string[]).includes(field);
  const parsed = isDayField ? Math.max(1, Math.min(31, Number(rawValue) || 1)) : rawValue;

  const existing = await getPaycheckPlan(userId);
  const base = existing ?? { userId, ...DEFAULT_PLAN };
  const merged = { ...base, [field]: parsed };

  await db
    .insert(paycheckPlan)
    .values({
      userId,
      plannedAmount: String(merged.plannedAmount),
      actualAmount: String(merged.actualAmount),
      payDay1: Number(merged.payDay1),
      payDay2: Number(merged.payDay2),
      billsTransferAmount: String(merged.billsTransferAmount),
      hysaTransferAmount: String(merged.hysaTransferAmount),
      hysaAccountId: merged.hysaAccountId ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: paycheckPlan.userId,
      set: { [field]: parsed, updatedAt: new Date() },
    });

  revalidateFinance();
}

// A bill can either be a plain custom line (typed name) or tied to a real
// debt account (picked from a dropdown): in the latter case the name is
// derived server-side from the account's real name ("<Account> minimum
// payment") rather than trusted from the client, and the account link
// is what lets markBillPaid log a real payment against it later.
export async function addBillLineItem(formData: FormData) {
  const userId = await requireUserId();
  const accountIdRaw = formData.get("accountId");
  const monthlyAmount = formData.get("monthlyAmount");

  let name: string;
  let accountId: string | null = null;

  if (typeof accountIdRaw === "string" && accountIdRaw.trim()) {
    const [account] = await db
      .select({ name: accounts.name })
      .from(accounts)
      .where(and(eq(accounts.id, accountIdRaw), eq(accounts.userId, userId)));
    if (!account) return;
    name = `${account.name} minimum payment`;
    accountId = accountIdRaw;
  } else {
    const nameRaw = formData.get("name");
    if (typeof nameRaw !== "string" || !nameRaw.trim()) return;
    name = nameRaw.trim();
  }

  const existing = await getBillsLineItems(userId);
  await db.insert(billsLineItems).values({
    userId,
    name,
    monthlyAmount: String(monthlyAmount ?? "0"),
    accountId,
    orderIndex: existing.length,
  });

  revalidateFinance();
}

export async function updateBillLineItemField(
  id: string,
  field: "name" | "monthlyAmount",
  rawValue: string,
) {
  const userId = await requireUserId();
  if (!rawValue.trim()) return;

  await db
    .update(billsLineItems)
    .set({ [field]: rawValue })
    .where(and(eq(billsLineItems.id, id), eq(billsLineItems.userId, userId)));

  revalidateFinance();
}

export async function deleteBillLineItem(id: string) {
  const userId = await requireUserId();
  await db
    .delete(billsLineItems)
    .where(and(eq(billsLineItems.id, id), eq(billsLineItems.userId, userId)));
  revalidateFinance();
}

export async function toggleChecklistItem(itemKey: string, periodKey: string, checked: boolean) {
  const userId = await requireUserId();

  if (checked) {
    await db
      .insert(paycheckChecklistChecks)
      .values({ userId, itemKey, periodKey })
      .onConflictDoNothing();
  } else {
    await db
      .delete(paycheckChecklistChecks)
      .where(
        and(
          eq(paycheckChecklistChecks.userId, userId),
          eq(paycheckChecklistChecks.itemKey, itemKey),
          eq(paycheckChecklistChecks.periodKey, periodKey),
        ),
      );
  }

  revalidateFinance();
}

// Checking "Paid" on a bill linked to a real debt account also logs an
// actual payment transaction against that account (same shape as
// addDebtTransaction's minimum_payment category), so the account's balance
// actually moves — not just the checklist tick. Unchecking only removes the
// checklist tick; it deliberately does not try to reverse the transaction,
// since matching "the one this checkbox created" back out is ambiguous once
// other transactions exist — correct a mistaken log from the account's own
// page instead.
export async function markBillPaid(billId: string, periodKey: string, checked: boolean) {
  const userId = await requireUserId();
  const itemKey = `bill_${billId}`;

  if (checked) {
    const [bill] = await db
      .select()
      .from(billsLineItems)
      .where(and(eq(billsLineItems.id, billId), eq(billsLineItems.userId, userId)));
    if (!bill) return;

    await db
      .insert(paycheckChecklistChecks)
      .values({ userId, itemKey, periodKey })
      .onConflictDoNothing();

    if (bill.accountId) {
      await db.insert(transactions).values({
        userId,
        accountId: bill.accountId,
        amount: (-Number(bill.monthlyAmount)).toFixed(2),
        category: "minimum_payment",
        date: dateKeyInAppTimezone(),
        note: `Paycheck plan: ${bill.name}`,
      });
      revalidatePath(`/debt/${bill.accountId}`);
    }
  } else {
    await db
      .delete(paycheckChecklistChecks)
      .where(
        and(
          eq(paycheckChecklistChecks.userId, userId),
          eq(paycheckChecklistChecks.itemKey, itemKey),
          eq(paycheckChecklistChecks.periodKey, periodKey),
        ),
      );
  }

  revalidateFinance();
}

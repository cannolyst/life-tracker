"use client";

import { useState, useTransition } from "react";
import type { listAccountsSummary, getPaycheckPlan, getBillsLineItems } from "@/db/queries";
import { Card, ProgressBar, formatCurrency, formatDate, labelClass } from "@/components/ui";
import { InlineEditableAmount } from "./InlineEditableAmount";
import {
  savePaycheckPlanField,
  addBillLineItem,
  updateBillLineItemField,
  deleteBillLineItem,
  toggleChecklistItem,
  markBillPaid,
} from "./plan-actions";

type Plan = NonNullable<Awaited<ReturnType<typeof getPaycheckPlan>>>;
type BillItem = Awaited<ReturnType<typeof getBillsLineItems>>[number];
type DebtSummary = Awaited<ReturnType<typeof listAccountsSummary>>["debtSummaries"][number];
type SavingsSummary = Awaited<ReturnType<typeof listAccountsSummary>>["savingsSummaries"][number];

const DEFAULT_PLAN: Plan = {
  userId: "",
  plannedAmount: "0",
  actualAmount: "0",
  payDay1: 15,
  payDay2: 30,
  billsTransferAmount: "0",
  hysaTransferAmount: "0",
  hysaAccountId: null,
  updatedAt: new Date(),
};

function amount(n: string) {
  return Number(n);
}

function Checkbox({
  checked,
  onChange,
  label,
  title,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  title?: string;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <label className="flex items-center gap-2 text-sm text-neutral-300" title={title}>
      <input
        type="checkbox"
        checked={checked}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.checked;
          startTransition(() => onChange(next));
        }}
        className="h-4 w-4 rounded border-neutral-600 bg-neutral-800"
      />
      {label}
    </label>
  );
}

export function PaycheckPlanCard({
  plan: initialPlan,
  billsLineItems: initialBills,
  checkedItemKeys,
  currentPeriodKey,
  debtSummaries,
  savingsSummaries,
}: {
  plan: Plan | null;
  billsLineItems: BillItem[];
  checkedItemKeys: string[];
  currentPeriodKey: string;
  debtSummaries: DebtSummary[];
  savingsSummaries: SavingsSummary[];
}) {
  const plan = initialPlan ?? DEFAULT_PLAN;
  const [checked, setChecked] = useState(new Set(checkedItemKeys));
  const [addingBill, setAddingBill] = useState(false);

  const isChecked = (itemKey: string) => checked.has(itemKey);
  const markChecked = (itemKey: string, value: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (value) next.add(itemKey);
      else next.delete(itemKey);
      return next;
    });
  };
  const setItemChecked = (itemKey: string, value: boolean) => {
    markChecked(itemKey, value);
    toggleChecklistItem(itemKey, currentPeriodKey, value);
  };
  // Bills linked to a real account also log an actual payment transaction
  // when checked, so the account's balance moves — not just the checklist.
  const setBillPaid = (billId: string, value: boolean) => {
    markChecked(`bill_${billId}`, value);
    markBillPaid(billId, currentPeriodKey, value);
  };

  const billsTotal = initialBills.reduce((sum, b) => sum + amount(b.monthlyAmount), 0);
  const billsTransfer = amount(plan.billsTransferAmount);
  // Bills are monthly amounts, but the transfer happens once per paycheck —
  // two paychecks a month — so compare against the monthly total transferred.
  const billsTransferMonthly = billsTransfer * 2;
  const leftover =
    amount(plan.actualAmount) - amount(plan.billsTransferAmount) - amount(plan.hysaTransferAmount);

  const hysaSummary = plan.hysaAccountId
    ? savingsSummaries.find((s) => s.account.id === plan.hysaAccountId)
    : undefined;

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-medium">Paycheck allocation plan</h2>
        <span className="text-sm text-neutral-500">This period: {formatDate(currentPeriodKey)}</span>
      </div>

      {/* Paycheck overview */}
      <div className="mb-5">
        <h3 className="mb-2 text-sm font-medium text-neutral-400">Paycheck overview</h3>
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className={labelClass}>Planned</p>
            <InlineEditableAmount
              value={plan.plannedAmount}
              display={formatCurrency(amount(plan.plannedAmount))}
              className="font-medium"
              onSave={(v) => savePaycheckPlanField("plannedAmount", v)}
            />
          </div>
          <div>
            <p className={labelClass}>Actual</p>
            <InlineEditableAmount
              value={plan.actualAmount}
              display={formatCurrency(amount(plan.actualAmount))}
              className="font-medium"
              onSave={(v) => savePaycheckPlanField("actualAmount", v)}
            />
          </div>
          <div>
            <p className={labelClass}>Pay day 1</p>
            <InlineEditableAmount
              value={String(plan.payDay1)}
              display={String(plan.payDay1)}
              inputMode="numeric"
              onSave={(v) => savePaycheckPlanField("payDay1", v)}
            />
          </div>
          <div>
            <p className={labelClass}>Pay day 2</p>
            <InlineEditableAmount
              value={String(plan.payDay2)}
              display={String(plan.payDay2)}
              inputMode="numeric"
              onSave={(v) => savePaycheckPlanField("payDay2", v)}
            />
          </div>
        </div>
      </div>

      {/* Per-paycheck allocation */}
      <div className="mb-5 space-y-2 border-t border-neutral-800 pt-4">
        <h3 className="mb-2 text-sm font-medium text-neutral-400">Per-paycheck allocation</h3>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="text-neutral-300">Bills checking transfer</span>
            <InlineEditableAmount
              value={plan.billsTransferAmount}
              display={formatCurrency(billsTransfer)}
              className="font-medium"
              onSave={(v) => savePaycheckPlanField("billsTransferAmount", v)}
            />
          </div>
          <Checkbox
            checked={isChecked("bills_transfer")}
            onChange={(v) => setItemChecked("bills_transfer", v)}
            label="Transferred"
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="text-neutral-300">HYSA transfer</span>
            <InlineEditableAmount
              value={plan.hysaTransferAmount}
              display={formatCurrency(amount(plan.hysaTransferAmount))}
              className="font-medium"
              onSave={(v) => savePaycheckPlanField("hysaTransferAmount", v)}
            />
          </div>
          <Checkbox
            checked={isChecked("hysa_transfer")}
            onChange={(v) => setItemChecked("hysa_transfer", v)}
            label="Transferred"
          />
        </div>
        <div className="flex items-center justify-between text-sm text-neutral-500">
          <span>Leftover / checking</span>
          <span>{formatCurrency(leftover)}</span>
        </div>
        {hysaSummary && (
          <div className="mt-2 rounded-md bg-neutral-800/60 p-3">
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="text-neutral-300">{hysaSummary.account.name}</span>
              <span className="font-medium">{formatCurrency(hysaSummary.balance)}</span>
            </div>
            {hysaSummary.goal && (
              <>
                <ProgressBar fraction={hysaSummary.balance / Number(hysaSummary.goal.targetAmount)} />
                <div className="mt-1 flex justify-between text-xs text-neutral-500">
                  <span>Goal: {formatCurrency(Number(hysaSummary.goal.targetAmount))}</span>
                  <span>Projected: {formatDate(hysaSummary.projectedDate)}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bills checklist */}
      <div className="border-t border-neutral-800 pt-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-neutral-400">Bills</h3>
          <span
            className={`text-xs ${
              Math.abs(billsTotal - billsTransferMonthly) > 0.01
                ? "text-amber-400"
                : "text-neutral-500"
            }`}
          >
            {formatCurrency(billsTotal)} of {formatCurrency(billsTransferMonthly)}/mo
          </span>
        </div>
        <div>
          {initialBills.map((bill) => (
            <BillRow
              key={bill.id}
              bill={bill}
              paid={isChecked(`bill_${bill.id}`)}
              onTogglePaid={(v) =>
                bill.accountId ? setBillPaid(bill.id, v) : setItemChecked(`bill_${bill.id}`, v)
              }
            />
          ))}
        </div>

        {addingBill ? (
          <AddBillForm
            debtAccounts={debtSummaries.map((d) => d.account)}
            onDone={() => setAddingBill(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAddingBill(true)}
            className="mt-2 text-sm text-neutral-400 hover:text-neutral-100"
          >
            + Add bill
          </button>
        )}
      </div>
    </Card>
  );
}

function BillRow({
  bill,
  paid,
  onTogglePaid,
}: {
  bill: BillItem;
  paid: boolean;
  onTogglePaid: (value: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const textStyle = paid ? "text-neutral-500 line-through" : "";

  return (
    <div className="flex items-center gap-3 border-b border-neutral-800 py-2 last:border-b-0">
      <input
        type="checkbox"
        checked={paid}
        disabled={isPending}
        title={bill.accountId ? "Logs a real payment against this account when checked" : undefined}
        onChange={(e) => {
          const next = e.target.checked;
          startTransition(() => onTogglePaid(next));
        }}
        className="h-4 w-4 shrink-0 rounded border-neutral-600 bg-neutral-800"
      />
      <InlineEditableAmount
        value={bill.name}
        display={bill.name}
        inputMode="text"
        className={`flex-1 ${textStyle}`}
        onSave={(v) => updateBillLineItemField(bill.id, "name", v)}
      />
      <InlineEditableAmount
        value={bill.monthlyAmount}
        display={formatCurrency(amount(bill.monthlyAmount))}
        className={textStyle}
        onSave={(v) => updateBillLineItemField(bill.id, "monthlyAmount", v)}
      />
      <button
        type="button"
        onClick={() => deleteBillLineItem(bill.id)}
        className="text-neutral-600 hover:text-red-400"
        aria-label={`Delete ${bill.name}`}
      >
        ✕
      </button>
    </div>
  );
}

const selectClass =
  "rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500";

function AddBillForm({
  debtAccounts,
  onDone,
}: {
  debtAccounts: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [accountId, setAccountId] = useState("");

  return (
    <form
      action={(formData) => {
        addBillLineItem(formData);
        onDone();
      }}
      className="mt-2 flex flex-wrap items-center gap-2"
    >
      <select
        name="accountId"
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        className={`${selectClass} min-w-0`}
      >
        <option value="">Custom bill</option>
        {debtAccounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} minimum payment
          </option>
        ))}
      </select>
      {accountId === "" && (
        <input
          name="name"
          placeholder="Name"
          required
          className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
        />
      )}
      <input
        name="monthlyAmount"
        placeholder="Amount"
        inputMode="decimal"
        required
        className="w-28 shrink-0 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
      />
      <button type="submit" className="text-sm text-neutral-300 hover:text-neutral-100">
        Save
      </button>
      <button
        type="button"
        onClick={onDone}
        className="text-sm text-neutral-500 hover:text-neutral-300"
      >
        Cancel
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import {
  addDebtTransaction,
  addDebtStatement,
  updateDebtSettings,
  updateDebtGoal,
  type ActionState,
} from "./actions";
import { inputClass, labelClass, buttonClass } from "@/components/ui";
import { dateKeyInAppTimezone } from "@/lib/timezone";

const initialState: ActionState = {};

export function AddTransactionForm({ accountId }: { accountId: string }) {
  const action = addDebtTransaction.bind(null, accountId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={labelClass}>Amount</label>
          <input name="amount" type="number" step="0.01" min="0" required className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Direction</label>
          <select name="direction" defaultValue="subtract" className={inputClass}>
            <option value="subtract">Payment (reduces balance)</option>
            <option value="add">Charge (increases balance)</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={labelClass}>Category</label>
          <select name="category" defaultValue="one_time" className={inputClass}>
            <option value="one_time">One-time payment</option>
            <option value="recurring_goal">Daily micropayment</option>
            <option value="minimum_payment">Minimum payment</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Date</label>
          <input
            name="date"
            type="date"
            required
            defaultValue={dateKeyInAppTimezone()}
            className={inputClass}
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Note (optional)</label>
        <input name="note" className={inputClass} />
      </div>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Saving..." : "Add transaction"}
      </button>
    </form>
  );
}

export function StatementForm({ accountId }: { accountId: string }) {
  const action = addDebtStatement.bind(null, accountId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1">
        <label className={labelClass}>Statement date</label>
        <input
          name="statementDate"
          type="date"
          required
          defaultValue={dateKeyInAppTimezone()}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={labelClass}>Minimum payment due</label>
          <input
            name="minimumPaymentDue"
            type="number"
            step="0.01"
            min="0"
            required
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Interest charged</label>
          <input
            name="interestCharged"
            type="number"
            step="0.01"
            min="0"
            defaultValue="0"
            className={inputClass}
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Statement balance (optional)</label>
        <input
          name="statementBalance"
          type="number"
          step="0.01"
          min="0"
          className={inputClass}
        />
      </div>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Saving..." : "Log statement"}
      </button>
    </form>
  );
}

export function GoalForm({
  accountId,
  targetDate,
}: {
  accountId: string;
  targetDate?: string | null;
}) {
  const action = updateDebtGoal.bind(null, accountId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1">
        <label className={labelClass}>Payoff goal date (optional)</label>
        <input
          name="targetDate"
          type="date"
          defaultValue={targetDate ?? undefined}
          className={inputClass}
        />
      </div>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Saving..." : "Update goal"}
      </button>
    </form>
  );
}

export function SettingsForm({
  accountId,
  aprPercent,
  dailyMicropaymentGoal,
  statementDay,
}: {
  accountId: string;
  aprPercent: number;
  dailyMicropaymentGoal: number;
  statementDay: number;
}) {
  const action = updateDebtSettings.bind(null, accountId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1">
        <label className={labelClass}>APR (%)</label>
        <input
          name="aprPercent"
          type="number"
          step="0.01"
          min="0"
          defaultValue={aprPercent}
          className={inputClass}
        />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Daily micropayment goal</label>
        <input
          name="dailyMicropaymentGoal"
          type="number"
          step="0.01"
          min="0"
          defaultValue={dailyMicropaymentGoal}
          className={inputClass}
        />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Statement day of month (1-28)</label>
        <input
          name="statementDay"
          type="number"
          step="1"
          min="1"
          max="28"
          defaultValue={statementDay}
          className={inputClass}
        />
      </div>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Saving..." : "Update settings"}
      </button>
    </form>
  );
}

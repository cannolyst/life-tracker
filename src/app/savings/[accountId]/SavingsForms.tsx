"use client";

import { useActionState } from "react";
import { addSavingsTransaction, updateSavingsGoal, type ActionState } from "./actions";
import { inputClass, labelClass, buttonClass } from "@/components/ui";
import { dateKeyInAppTimezone } from "@/lib/timezone";

const initialState: ActionState = {};

export function AddTransactionForm({ accountId }: { accountId: string }) {
  const action = addSavingsTransaction.bind(null, accountId);
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
          <select name="direction" defaultValue="add" className={inputClass}>
            <option value="add">Add</option>
            <option value="subtract">Subtract</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={labelClass}>Category</label>
          <select name="category" defaultValue="one_time" className={inputClass}>
            <option value="one_time">One-time</option>
            <option value="recurring_goal">Daily savings goal</option>
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

export function GoalForm({
  accountId,
  dailyGoal,
  targetAmount,
  targetDate,
}: {
  accountId: string;
  dailyGoal: number;
  targetAmount?: number;
  targetDate?: string | null;
}) {
  const action = updateSavingsGoal.bind(null, accountId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1">
        <label className={labelClass}>Daily savings goal</label>
        <input
          name="dailyGoal"
          type="number"
          step="0.01"
          min="0"
          defaultValue={dailyGoal}
          className={inputClass}
        />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Target amount</label>
        <input
          name="targetAmount"
          type="number"
          step="0.01"
          min="0"
          defaultValue={targetAmount}
          className={inputClass}
        />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Target date (optional)</label>
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

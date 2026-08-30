"use client";

import { useActionState, useState } from "react";
import { createAccount } from "./actions";
import { Card, inputClass, labelClass, buttonClass } from "@/components/ui";

export default function NewAccountPage() {
  const [type, setType] = useState<"savings" | "debt">("savings");
  const [state, formAction, pending] = useActionState(createAccount, {});

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">New account</h1>
      <Card>
        <div className="mb-5 flex gap-2 rounded-md bg-neutral-800 p-1">
          <button
            type="button"
            onClick={() => setType("savings")}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${
              type === "savings" ? "bg-neutral-100 text-neutral-900" : "text-neutral-300"
            }`}
          >
            Savings
          </button>
          <button
            type="button"
            onClick={() => setType("debt")}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${
              type === "debt" ? "bg-neutral-100 text-neutral-900" : "text-neutral-300"
            }`}
          >
            Credit card debt
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="type" value={type} />

          <div className="space-y-1">
            <label htmlFor="name" className={labelClass}>
              {type === "savings" ? "Goal name" : "Card name"}
            </label>
            <input
              id="name"
              name="name"
              required
              placeholder={type === "savings" ? "Emergency fund" : "Chase Sapphire"}
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="startingBalance" className={labelClass}>
              Starting balance
            </label>
            <input
              id="startingBalance"
              name="startingBalance"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue="0"
              className={inputClass}
            />
          </div>

          {type === "savings" ? (
            <>
              <div className="space-y-1">
                <label htmlFor="dailyGoal" className={labelClass}>
                  Daily savings goal
                </label>
                <input
                  id="dailyGoal"
                  name="dailyGoal"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="0"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="targetAmount" className={labelClass}>
                  Target amount (optional)
                </label>
                <input
                  id="targetAmount"
                  name="targetAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="targetDate" className={labelClass}>
                  Target date (optional)
                </label>
                <input
                  id="targetDate"
                  name="targetDate"
                  type="date"
                  className={inputClass}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <label htmlFor="aprPercent" className={labelClass}>
                  APR (%)
                </label>
                <input
                  id="aprPercent"
                  name="aprPercent"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="24.99"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="dailyMicropaymentGoal" className={labelClass}>
                  Daily micropayment goal
                </label>
                <input
                  id="dailyMicropaymentGoal"
                  name="dailyMicropaymentGoal"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="0"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="statementDay" className={labelClass}>
                  Statement day of month (1-28)
                </label>
                <input
                  id="statementDay"
                  name="statementDay"
                  type="number"
                  step="1"
                  min="1"
                  max="28"
                  required
                  placeholder="15"
                  className={inputClass}
                />
              </div>
            </>
          )}

          {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

          <button type="submit" disabled={pending} className={`${buttonClass} w-full`}>
            {pending ? "Creating..." : "Create account"}
          </button>
        </form>
      </Card>
    </div>
  );
}

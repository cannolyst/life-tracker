"use client";

import { useActionState } from "react";
import { saveModuleSettings, type ActionState } from "./actions";
import { MODULES } from "@/lib/modules";
import { buttonClass } from "@/components/ui";

const initialState: ActionState = {};

type InitialValues = {
  showPoints: boolean;
  showCleaning: boolean;
  showExercise: boolean;
  showFinance: boolean;
  showLists: boolean;
  showTodo: boolean;
  showYearReview: boolean;
  showEmotionCheckin: boolean;
};

const FIELD_BY_KEY: Record<string, keyof InitialValues> = {
  points: "showPoints",
  cleaning: "showCleaning",
  exercise: "showExercise",
  finance: "showFinance",
  lists: "showLists",
  todo: "showTodo",
  yearReview: "showYearReview",
  emotionCheckin: "showEmotionCheckin",
};

export function ModulePicker({
  initialValues,
  redirectTo,
  submitLabel,
}: {
  initialValues: InitialValues;
  redirectTo: string;
  submitLabel: string;
}) {
  const action = saveModuleSettings.bind(null, redirectTo);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        {MODULES.map((module) => (
          <label
            key={module.key}
            className="flex items-center gap-3 rounded-md border border-neutral-800 px-3 py-2.5 text-sm"
          >
            <input
              type="checkbox"
              name={module.key}
              defaultChecked={initialValues[FIELD_BY_KEY[module.key]]}
              className="rounded border-neutral-700 bg-neutral-800"
            />
            {module.label}
          </label>
        ))}
      </div>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

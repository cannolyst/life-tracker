"use client";

import { useActionState } from "react";
import { addExercise, type ActionState } from "./actions";
import { inputClass, labelClass, buttonClass } from "@/components/ui";
import { MUSCLE_GROUPS } from "@/lib/muscleGroups";

const initialState: ActionState = {};

export function AddExerciseForm({ dayId }: { dayId: string }) {
  const action = addExercise.bind(null, dayId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[160px] flex-1 space-y-1">
        <label className={labelClass}>Exercise name</label>
        <input name="name" placeholder="Adductor Machine" required className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Target reps</label>
        <input
          name="targetReps"
          type="number"
          step="1"
          min="1"
          defaultValue={12}
          className={`${inputClass} w-24`}
        />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Increment</label>
        <input
          name="weightIncrement"
          type="number"
          step="0.5"
          min="0.5"
          defaultValue={5}
          className={`${inputClass} w-24`}
        />
      </div>
      <label className="flex items-center gap-2 pb-2 text-sm text-neutral-400">
        <input name="tracksDuration" type="checkbox" className="rounded border-neutral-700 bg-neutral-800" />
        Tracks hold time
      </label>
      <div className="w-full space-y-1">
        <label className={labelClass}>Muscle groups</label>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {MUSCLE_GROUPS.map((group) => (
            <label key={group} className="flex items-center gap-1.5 text-sm text-neutral-400">
              <input
                name="muscleGroups"
                type="checkbox"
                value={group}
                className="rounded border-neutral-700 bg-neutral-800"
              />
              {group}
            </label>
          ))}
        </div>
      </div>
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Adding..." : "Add"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-400">{state.error}</p>}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { createDay, type ActionState } from "./actions";
import { inputClass, buttonClass } from "@/components/ui";

const initialState: ActionState = {};

export function AddDayForm({ programId }: { programId: string }) {
  const action = createDay.bind(null, programId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 pt-2">
      <input name="name" placeholder="New day name" required className={`${inputClass} flex-1`} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Adding..." : "Add day"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-400">{state.error}</p>}
    </form>
  );
}

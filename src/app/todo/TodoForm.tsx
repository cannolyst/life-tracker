"use client";

import { useActionState } from "react";
import { addTodo, type ActionState } from "./actions";
import { inputClass, buttonClass } from "@/components/ui";

const initialState: ActionState = {};

export function AddTodoForm() {
  const [state, formAction, pending] = useActionState(addTodo, initialState);

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input name="text" placeholder="Add a to-do..." required className={`${inputClass} flex-1`} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Adding..." : "Add"}
      </button>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
    </form>
  );
}

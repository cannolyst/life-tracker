"use client";

import { useActionState } from "react";
import { addListCategory, addListItem, type ActionState } from "./actions";
import { inputClass, labelClass, buttonClass } from "@/components/ui";

const initialState: ActionState = {};

export function AddListCategoryForm() {
  const [state, formAction, pending] = useActionState(addListCategory, initialState);

  return (
    <form action={formAction} className="flex items-end gap-3">
      <div className="flex-1 space-y-1">
        <label className={labelClass}>New list</label>
        <input name="name" placeholder="Books to read" className={inputClass} />
      </div>
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Adding..." : "Add"}
      </button>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
    </form>
  );
}

export function AddListItemForm({ categoryId }: { categoryId: string }) {
  const action = addListItem.bind(null, categoryId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input name="text" placeholder="Add an item..." required className={`${inputClass} flex-1`} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "..." : "Add"}
      </button>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
    </form>
  );
}

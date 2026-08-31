"use client";

import { useActionState } from "react";
import { addYearReviewCategory, addYearReviewItem, type ActionState } from "./actions";
import { inputClass, labelClass, buttonClass } from "@/components/ui";
import { dateKeyInAppTimezone } from "@/lib/timezone";

const initialState: ActionState = {};

export function AddYearReviewCategoryForm() {
  const [state, formAction, pending] = useActionState(addYearReviewCategory, initialState);

  return (
    <form action={formAction} className="flex items-end gap-3">
      <div className="flex-1 space-y-1">
        <label className={labelClass}>New category</label>
        <input name="name" placeholder="Concerts" className={inputClass} />
      </div>
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Adding..." : "Add"}
      </button>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
    </form>
  );
}

export function AddYearReviewItemForm({ categoryId }: { categoryId: string }) {
  const action = addYearReviewItem.bind(null, categoryId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input name="text" placeholder="Add an item..." required className={`${inputClass} flex-1`} />
      <input
        name="date"
        type="date"
        required
        defaultValue={dateKeyInAppTimezone()}
        className={inputClass}
      />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "..." : "Add"}
      </button>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
    </form>
  );
}

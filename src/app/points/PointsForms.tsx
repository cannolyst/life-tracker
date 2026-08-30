"use client";

import { useActionState } from "react";
import { addCategory, addTask, addReward, type ActionState } from "./actions";
import { inputClass, labelClass, buttonClass } from "@/components/ui";

const initialState: ActionState = {};

export function AddCategoryForm() {
  const [state, formAction, pending] = useActionState(addCategory, initialState);

  return (
    <form action={formAction} className="flex items-end gap-3">
      <div className="flex-1 space-y-1">
        <label className={labelClass}>New category</label>
        <input name="name" placeholder="Drink more water" className={inputClass} />
      </div>
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Adding..." : "Add"}
      </button>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
    </form>
  );
}

export function AddTaskForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(addTask, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={labelClass}>Task name</label>
          <input name="name" required placeholder="Read for 20 minutes" className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Points</label>
          <input name="points" type="number" step="1" min="1" required defaultValue="1" className={inputClass} />
        </div>
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Category (optional)</label>
        <select name="categoryId" defaultValue="" className={inputClass}>
          <option value="">None</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-neutral-400">
        <input name="repeatable" type="checkbox" className="rounded border-neutral-700 bg-neutral-800" />
        Repeatable (can be logged more than once per day)
      </label>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Adding..." : "Add task"}
      </button>
    </form>
  );
}

export function AddRewardForm() {
  const [state, formAction, pending] = useActionState(addReward, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={labelClass}>Reward name</label>
          <input name="name" required placeholder="Cozy movie night" className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Cost (points)</label>
          <input name="cost" type="number" step="1" min="1" required defaultValue="10" className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className={labelClass}>Price (optional)</label>
          <input name="priceUsd" type="number" step="0.01" min="0" className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Link (optional)</label>
          <input name="link" type="url" className={inputClass} />
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Adding..." : "Add reward"}
      </button>
    </form>
  );
}

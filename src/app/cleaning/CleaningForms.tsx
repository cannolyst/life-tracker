"use client";

import { useActionState } from "react";
import { addArea, addTask, type ActionState } from "./actions";
import { inputClass, labelClass, buttonClass } from "@/components/ui";

const initialState: ActionState = {};

export function AddAreaForm() {
  const [state, formAction, pending] = useActionState(addArea, initialState);

  return (
    <form action={formAction} className="flex items-end gap-3">
      <div className="flex-1 space-y-1">
        <label className={labelClass}>New area</label>
        <input name="name" placeholder="Kitchen" className={inputClass} />
      </div>
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Adding..." : "Add"}
      </button>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
    </form>
  );
}

export function AddTaskForm({
  areas,
}: {
  areas: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(addTask, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1">
        <label className={labelClass}>Task name</label>
        <input name="name" required placeholder="Wipe down counters" className={inputClass} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className={labelClass}>Area (optional)</label>
          <select name="areaId" defaultValue="" className={inputClass}>
            <option value="">None</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Every N days</label>
          <input name="frequencyDays" type="number" step="1" min="1" required defaultValue="7" className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Points</label>
          <input name="points" type="number" step="1" min="1" required defaultValue="2" className={inputClass} />
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Adding..." : "Add task"}
      </button>
    </form>
  );
}

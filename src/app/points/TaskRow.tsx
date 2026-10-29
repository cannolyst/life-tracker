"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  toggleTaskCompletion,
  logRepeatableCompletion,
  undoRepeatableCompletion,
  archiveTask,
  updateTask,
  type ActionState,
} from "./actions";
import { inputClass, labelClass, buttonClass } from "@/components/ui";
import { BLOCK_IDS } from "@/lib/planning";

type Task = {
  id: string;
  name: string;
  points: number;
  repeatable: boolean;
  categoryId: string | null;
  block?: string | null;
};

const initialState: ActionState = {};

export function TaskRow({
  task,
  count,
  jewel,
  categories,
  showBlocks = false,
}: {
  task: Task;
  count: number;
  jewel: { color: string; soft: string };
  categories: { id: string; name: string }[];
  showBlocks?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateTask.bind(null, task.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      setEditing(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  if (editing) {
    return (
      <li className="rounded-md border border-neutral-800 p-3">
        <form action={formAction} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className={labelClass}>Name</label>
              <input name="name" defaultValue={task.name} required className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Points</label>
              <input
                name="points"
                type="number"
                step="1"
                min="1"
                defaultValue={task.points}
                required
                className={inputClass}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Category</label>
            <select name="categoryId" defaultValue={task.categoryId ?? ""} className={inputClass}>
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {showBlocks && (
            <div className="space-y-1">
              <label className={labelClass}>Part of the day</label>
              <select name="block" defaultValue={task.block ?? ""} className={inputClass}>
                <option value="">Anytime</option>
                {BLOCK_IDS.map((b) => (
                  <option key={b} value={b}>
                    {b.charAt(0).toUpperCase() + b.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-neutral-400">
            <input
              name="repeatable"
              type="checkbox"
              defaultChecked={task.repeatable}
              className="rounded border-neutral-700 bg-neutral-800"
            />
            Repeatable (can be logged more than once per day)
          </label>
          {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={buttonClass}>
              {pending ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-400 hover:text-neutral-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-1 border-t border-neutral-800 first:border-t-0">
      {task.repeatable ? (
        <div className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-sm">
          <span
            aria-hidden
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]"
            style={count > 0 ? { backgroundColor: jewel.color, borderColor: jewel.color, color: "#fff" } : { borderColor: "#999" }}
          >
            {count > 0 ? count : ""}
          </span>
          <span className="min-w-0 flex-1 text-neutral-200">{task.name}</span>
          <span className="shrink-0 text-xs text-neutral-500">
            {count > 0 ? `${count}× today · ` : ""}
            {task.points} pts
          </span>
          <form action={undoRepeatableCompletion.bind(null, task.id)}>
            <button
              type="submit"
              disabled={count === 0}
              aria-label={`Undo ${task.name}`}
              className="rounded border border-neutral-700 px-2 text-neutral-400 disabled:opacity-40"
            >
              −
            </button>
          </form>
          <form action={logRepeatableCompletion.bind(null, task.id)}>
            <button
              type="submit"
              aria-label={`Log ${task.name}`}
              className="rounded border border-neutral-700 px-2 text-neutral-400 hover:text-neutral-100"
            >
              +
            </button>
          </form>
        </div>
      ) : (
        <form action={toggleTaskCompletion.bind(null, task.id)} className="min-w-0 flex-1">
          <button type="submit" className="flex min-h-11 w-full items-center gap-3 text-left text-sm">
            <span
              aria-hidden
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${count > 0 ? "text-white" : "border-neutral-600 text-transparent"}`}
              style={count > 0 ? { backgroundColor: jewel.color, borderColor: jewel.color } : undefined}
            >
              ✓
            </span>
            <span className={`min-w-0 flex-1 ${count > 0 ? "text-neutral-500 line-through" : "text-neutral-200"}`}>{task.name}</span>
            <span className="shrink-0 text-xs text-neutral-500">{task.points} pts</span>
          </button>
        </form>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Edit task"
        className="text-neutral-600 hover:text-neutral-100"
      >
        ✎
      </button>
      <form action={archiveTask.bind(null, task.id)}>
        <button
          type="submit"
          aria-label="Archive task"
          className="text-neutral-600 hover:text-red-400"
        >
          ✕
        </button>
      </form>
    </li>
  );
}

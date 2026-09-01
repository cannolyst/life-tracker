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
import { jewelChipStyle } from "@/lib/jewels";

type Task = {
  id: string;
  name: string;
  points: number;
  repeatable: boolean;
  categoryId: string | null;
};

const initialState: ActionState = {};

export function TaskRow({
  task,
  count,
  jewel,
  categories,
}: {
  task: Task;
  count: number;
  jewel: { color: string; soft: string };
  categories: { id: string; name: string }[];
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
    <li className="flex items-center justify-between gap-3">
      {task.repeatable ? (
        <div
          className="flex flex-1 flex-col gap-2 rounded-md border px-3 py-2 text-sm text-neutral-300 sm:flex-row sm:items-center sm:justify-between"
          style={count > 0 ? jewelChipStyle(jewel) : undefined}
        >
          <span>{task.name}</span>
          <div className="flex items-center gap-3">
            <span className={count > 0 ? "" : "text-neutral-500"}>
              {count > 0 ? `${count}× today · ` : ""}
              {task.points} pts
            </span>
            <form action={undoRepeatableCompletion.bind(null, task.id)}>
              <button
                type="submit"
                disabled={count === 0}
                className="rounded border border-neutral-700 px-2 text-neutral-400 disabled:opacity-40"
              >
                −
              </button>
            </form>
            <form action={logRepeatableCompletion.bind(null, task.id)}>
              <button
                type="submit"
                className="rounded border border-neutral-700 px-2 text-neutral-400 hover:text-neutral-100"
              >
                +
              </button>
            </form>
          </div>
        </div>
      ) : (
        <form action={toggleTaskCompletion.bind(null, task.id)} className="flex-1">
          <button
            type="submit"
            className="flex w-full flex-col items-start gap-1 rounded-md border px-3 py-2 text-left text-sm border-neutral-800 text-neutral-300 hover:border-neutral-600 sm:flex-row sm:items-center sm:justify-between"
            style={count > 0 ? jewelChipStyle(jewel) : undefined}
          >
            <span>
              {count > 0 ? "✓ " : ""}
              {task.name}
            </span>
            <span className={count > 0 ? "" : "text-neutral-500"}>{task.points} pts</span>
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

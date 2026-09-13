"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { renameDay, archiveDay, moveDayUp, moveDayDown, type ActionState } from "./actions";
import { inputClass, buttonClass } from "@/components/ui";

const initialState: ActionState = {};

export function DayRow({
  day,
  isFirst,
  isLast,
}: {
  day: { id: string; name: string };
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const renameAction = renameDay.bind(null, day.id);
  const [state, formAction, pending] = useActionState(renameAction, initialState);
  const wasPending = useRef(false);
  const [isMoving, startMoving] = useTransition();
  const [isArchiving, startArchiving] = useTransition();

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      setEditing(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  if (editing) {
    return (
      <form action={formAction} className="flex flex-wrap items-end gap-2 py-1.5">
        <input name="name" defaultValue={day.name} required className={`${inputClass} flex-1`} />
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Saving..." : "Save"}
        </button>
        {state?.error && <p className="w-full text-sm text-red-400">{state.error}</p>}
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-sm">
      <span>{day.name}</span>
      <div className="flex items-center gap-2 text-neutral-500">
        <button
          type="button"
          disabled={isFirst || isMoving}
          onClick={() => startMoving(() => moveDayUp(day.id))}
          aria-label="Move day up"
          className="hover:text-neutral-100 disabled:opacity-30"
        >
          ↑
        </button>
        <button
          type="button"
          disabled={isLast || isMoving}
          onClick={() => startMoving(() => moveDayDown(day.id))}
          aria-label="Move day down"
          className="hover:text-neutral-100 disabled:opacity-30"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Rename day"
          className="hover:text-neutral-100"
        >
          ✎
        </button>
        <button
          type="button"
          disabled={isArchiving}
          onClick={() => startArchiving(() => archiveDay(day.id))}
          aria-label="Archive day"
          className="hover:text-red-400 disabled:opacity-60"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

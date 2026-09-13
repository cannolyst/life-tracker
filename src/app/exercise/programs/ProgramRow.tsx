"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { renameProgram, deleteProgram, setActiveProgram, type ActionState } from "./actions";
import { DayRow } from "./DayRow";
import { AddDayForm } from "./AddDayForm";
import { Card, inputClass, buttonClass } from "@/components/ui";

const initialState: ActionState = {};

export function ProgramRow({
  program,
  days,
}: {
  program: { id: string; name: string; active: boolean };
  days: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const renameAction = renameProgram.bind(null, program.id);
  const [state, formAction, pending] = useActionState(renameAction, initialState);
  const wasPending = useRef(false);
  const [isActivating, startActivating] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      setEditing(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {editing ? (
          <form action={formAction} className="flex flex-1 items-end gap-2">
            <input name="name" defaultValue={program.name} required className={`${inputClass} flex-1`} />
            <button type="submit" disabled={pending} className={buttonClass}>
              {pending ? "Saving..." : "Save"}
            </button>
            {state?.error && <p className="w-full text-sm text-red-400">{state.error}</p>}
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{program.name}</h3>
            {program.active && (
              <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300">
                Active
              </span>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Rename program"
              className="text-neutral-600 hover:text-neutral-100"
            >
              ✎
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          {!program.active && (
            <button
              type="button"
              disabled={isActivating}
              onClick={() => startActivating(() => setActiveProgram(program.id))}
              className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-500 disabled:opacity-60"
            >
              {isActivating ? "Switching..." : "Set active"}
            </button>
          )}
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => {
              if (
                confirm(
                  `Delete "${program.name}" and all its days, exercises, and logged history? This cannot be undone.`,
                )
              ) {
                startDeleting(() => {
                  deleteProgram(program.id);
                });
              }
            }}
            className="text-neutral-600 hover:text-red-400 disabled:opacity-60"
            aria-label="Delete program"
          >
            {isDeleting ? "Deleting..." : "✕"}
          </button>
        </div>
      </div>

      {days.length === 0 ? (
        <p className="text-sm text-neutral-500">No days yet — add one below.</p>
      ) : (
        <div className="divide-y divide-neutral-800">
          {days.map((day, i) => (
            <DayRow key={day.id} day={day} isFirst={i === 0} isLast={i === days.length - 1} />
          ))}
        </div>
      )}
      <AddDayForm programId={program.id} />
    </Card>
  );
}

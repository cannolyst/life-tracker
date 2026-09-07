"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  addSet,
  deleteSet,
  updateExercise,
  archiveExercise,
  type ActionState,
} from "./actions";
import { inputClass, labelClass, buttonClass } from "@/components/ui";
import { jewelChipStyle, JEWELS, NEUTRAL_JEWEL } from "@/lib/jewels";
import { Sparkle } from "@/components/Sparkle";
import type { WeekTrend } from "@/lib/workout";
import Link from "next/link";

const UP_JEWEL = JEWELS[2];
const DOWN_JEWEL = JEWELS[3];
const READY_JEWEL = JEWELS[4];

type SetRow = {
  id: string;
  setNumber: number;
  weight: string | null;
  reps: number | null;
  durationSeconds: number | null;
};

type Exercise = {
  id: string;
  dayId: string;
  name: string;
  tracksDuration: boolean;
  targetReps: number;
  weightIncrement: string;
  todaySets: SetRow[];
  trend: WeekTrend;
  overload: { ready: boolean; currentWeight: number | null };
  lastWeightUsed: number | null;
};

const initialState: ActionState = {};

export function TrendBadge({ trend }: { trend: WeekTrend }) {
  if (trend === "no-data") return null;
  const jewel = trend === "up" ? UP_JEWEL : trend === "down" ? DOWN_JEWEL : NEUTRAL_JEWEL;
  const label = trend === "up" ? "▲ Up" : trend === "down" ? "▼ Down" : "— Flat";
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs"
      style={{ backgroundColor: jewel.soft, color: jewel.color }}
    >
      {label}
    </span>
  );
}

export function ExerciseCard({
  exercise,
  jewel,
}: {
  exercise: Exercise;
  jewel: { color: string; soft: string };
}) {
  const [editing, setEditing] = useState(false);
  const updateAction = updateExercise.bind(null, exercise.id);
  const [state, formAction, pending] = useActionState(updateAction, initialState);
  const wasPending = useRef(false);
  const [isRemoving, startRemoving] = useTransition();

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      setEditing(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/exercise/${exercise.id}`}
          className="flex items-center gap-2 font-medium hover:underline"
        >
          <Sparkle className="h-3.5 w-3.5" color={jewel.color} />
          {exercise.name}
        </Link>
        <div className="flex items-center gap-2">
          <TrendBadge trend={exercise.trend} />
          {exercise.overload.ready && exercise.overload.currentWeight != null && (
            <span
              className="rounded-full px-2 py-0.5 text-xs"
              style={{ backgroundColor: READY_JEWEL.soft, color: READY_JEWEL.color }}
            >
              Ready to increase →{" "}
              {(exercise.overload.currentWeight + Number(exercise.weightIncrement)).toFixed(0)} lbs
            </span>
          )}
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            aria-label="Edit exercise settings"
            className="text-neutral-600 hover:text-neutral-100"
          >
            ✎
          </button>
          <button
            type="button"
            disabled={isRemoving}
            onClick={() => {
              if (confirm(`Remove "${exercise.name}" and all its logged history? This can't be undone.`)) {
                startRemoving(() => {
                  archiveExercise(exercise.id);
                });
              }
            }}
            aria-label="Remove exercise"
            className="text-neutral-600 hover:text-red-400 disabled:opacity-60"
          >
            ✕
          </button>
        </div>
      </div>

      {editing && (
        <form
          action={formAction}
          className="mb-3 flex flex-wrap items-end gap-2 rounded-md border border-neutral-800 p-3"
        >
          <div className="space-y-1">
            <label className={labelClass}>Target reps</label>
            <input
              name="targetReps"
              type="number"
              step="1"
              min="1"
              defaultValue={exercise.targetReps}
              required
              className={`${inputClass} w-24`}
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Weight increment</label>
            <input
              name="weightIncrement"
              type="number"
              step="0.5"
              min="0.5"
              defaultValue={exercise.weightIncrement}
              required
              className={`${inputClass} w-24`}
            />
          </div>
          <button type="submit" disabled={pending} className={buttonClass}>
            {pending ? "Saving..." : "Save"}
          </button>
          {state?.error && <p className="w-full text-sm text-red-400">{state.error}</p>}
        </form>
      )}

      {exercise.todaySets.length > 0 && (
        <ul className="mb-3 space-y-1">
          {exercise.todaySets.map((set) => (
            <li
              key={set.id}
              className="flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm"
              style={jewelChipStyle(jewel)}
            >
              <span>
                Set {set.setNumber}:{" "}
                {exercise.tracksDuration
                  ? `${set.durationSeconds}s`
                  : `${set.weight != null ? Number(set.weight) : "—"} lbs × ${set.reps ?? "—"}`}
              </span>
              <form action={deleteSet.bind(null, set.id)}>
                <button type="submit" aria-label="Delete set" className="hover:text-red-400">
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <AddSetForm exercise={exercise} />
    </div>
  );
}

function AddSetForm({ exercise }: { exercise: Exercise }) {
  const action = addSet.bind(null, exercise.dayId, exercise.id);

  if (exercise.tracksDuration) {
    return (
      <form action={action} className="flex items-end gap-2">
        <div className="space-y-1">
          <label className={labelClass}>Hold time (seconds)</label>
          <input
            name="durationSeconds"
            type="number"
            step="1"
            min="1"
            className={`${inputClass} w-32`}
          />
        </div>
        <button type="submit" className={buttonClass}>
          Add set
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <label className={labelClass}>Weight (lbs)</label>
        <input
          name="weight"
          type="number"
          step="0.5"
          min="0"
          defaultValue={exercise.lastWeightUsed ?? undefined}
          className={`${inputClass} w-24`}
        />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Reps</label>
        <input name="reps" type="number" step="1" min="1" className={`${inputClass} w-20`} />
      </div>
      <button type="submit" className={buttonClass}>
        Add set
      </button>
    </form>
  );
}

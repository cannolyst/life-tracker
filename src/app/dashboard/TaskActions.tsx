"use client";

import { useEffect, useState, useTransition } from "react";
import { START_SECONDS, formatCountdown } from "@/lib/planning";
import { completePlanTask, skipTask, startTask } from "../plan/actions";

const secondary = "min-h-11 rounded-md border border-accent px-4 text-sm font-medium text-neutral-100 disabled:opacity-60";

// The card's three moves: a five-minute Start (with the first step spelled
// out above it), "Not this one" for a smaller task, and Done. Starting is a
// small promise — five minutes — not a commitment to finish.
export function TaskActions({
  taskId,
  firstStep,
  minutes,
  startedElapsedSec,
  swap,
}: {
  taskId: string;
  firstStep?: string;
  minutes?: number | null;
  startedElapsedSec?: number | null;
  swap?: boolean;
}) {
  const [elapsed, setElapsed] = useState<number | null>(startedElapsedSec ?? null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const started = elapsed !== null;

  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => setElapsed((e) => (e === null ? null : e + 1)), 1000);
    return () => clearInterval(id);
  }, [started]);

  const left = started ? Math.max(0, START_SECONDS - elapsed) : START_SECONDS;

  function begin() {
    setElapsed(0);
    startTransition(async () => void (await startTask(taskId)));
  }

  function finish() {
    setDone(true);
    startTransition(async () => void (await completePlanTask(taskId)));
  }

  return (
    <div className="mt-3 space-y-3">
      {firstStep && (
        <p className="text-sm text-neutral-300">
          <span className="text-neutral-500">First step · </span>
          {firstStep}
        </p>
      )}
      {minutes ? <p className="text-xs text-neutral-500">About {minutes} minutes in all</p> : null}

      {started ? (
        <div className="space-y-3">
          <p className="text-sm text-neutral-300">
            {left > 0 ? `${formatCountdown(left)} left — just this much.` : "Five minutes in. Keep going, or call it done."}
          </p>
          <button
            type="button"
            disabled={pending || done}
            onClick={finish}
            className="min-h-11 w-full rounded-md bg-accent px-4 font-medium text-neutral-900 disabled:opacity-70"
          >
            {done ? "Done ✓" : "Done"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            disabled={pending || done}
            onClick={begin}
            className="min-h-12 w-full rounded-md bg-accent px-4 text-base font-medium text-neutral-900 disabled:opacity-70"
          >
            Start 5 minutes
          </button>
          <div className="flex gap-2">
            {swap && (
              <button
                type="button"
                disabled={pending || done}
                onClick={() => startTransition(async () => void (await skipTask(taskId)))}
                className={`${secondary} flex-1`}
              >
                Not this one
              </button>
            )}
            <button type="button" disabled={pending || done} onClick={finish} className={`${secondary} flex-1`}>
              {done ? "Done ✓" : "Already done"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

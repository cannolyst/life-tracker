"use client";

import { useState, useTransition } from "react";
import { completePlanTask } from "../plan/actions";

// One tap to finish a plan task. Shows "Done" right away; the server refresh
// then moves the page on to whatever is next.
export function CompleteButton({ taskId, label = "Done" }: { taskId: string; label?: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      disabled={pending || done}
      onClick={() =>
        startTransition(async () => {
          setDone(true);
          await completePlanTask(taskId);
        })
      }
      className="mt-4 min-h-11 w-full rounded-md bg-accent px-4 font-medium text-neutral-900 disabled:opacity-70"
    >
      {done ? "Done ✓" : label}
    </button>
  );
}

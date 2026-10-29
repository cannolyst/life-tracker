"use client";

import { useState, useTransition } from "react";
import { markRecurringDone, skipRecurringTonight } from "../life/actions";

// The evening card for a life admin item that has come due. Done resets its
// clock; "Not tonight" lets it wait until tomorrow without any penalty.
export function RecurringActions({ id }: { id: string }) {
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        disabled={pending || done}
        onClick={() =>
          startTransition(async () => {
            setDone(true);
            await markRecurringDone(id);
          })
        }
        className="min-h-12 w-full rounded-md bg-accent px-4 text-base font-medium text-neutral-900 disabled:opacity-70"
      >
        {done ? "Done ✓" : "Done — reset the clock"}
      </button>
      <button
        type="button"
        disabled={pending || done}
        onClick={() => startTransition(async () => void (await skipRecurringTonight(id)))}
        className="min-h-11 w-full rounded-md border border-accent px-4 text-sm font-medium text-neutral-100 disabled:opacity-60"
      >
        Not tonight
      </button>
    </div>
  );
}

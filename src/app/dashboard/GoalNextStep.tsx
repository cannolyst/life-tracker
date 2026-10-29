"use client";

import { useState, useTransition } from "react";
import { addGoalNextAction } from "../goals/actions";

// When a finish goal has no next step waiting, ask for one — it becomes a card straight away.
export function GoalNextStep({ goalId }: { goalId: string }) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-1"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await addGoalNextAction(goalId, text);
          if (result.ok) setText("");
          else setMessage(result.error);
        });
      }}
    >
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setMessage(null);
          }}
          maxLength={200}
          placeholder="What's the next step?"
          aria-label="Next step for this goal"
          className="min-h-11 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 text-sm text-neutral-100 outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="min-h-11 shrink-0 rounded-md border border-neutral-700 px-4 text-sm text-neutral-300 disabled:opacity-60"
        >
          Add
        </button>
      </div>
      {message && <p className="text-xs text-neutral-500">{message}</p>}
    </form>
  );
}

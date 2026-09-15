"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { inputClass } from "@/components/ui";

// A click-to-edit primitive: shows `display`, swaps to a text input on
// click, saves on blur/Enter via `onSave`, and reverts on Escape. Used for
// every editable number/name on the paycheck plan card.
export function InlineEditableAmount({
  value,
  display,
  onSave,
  inputMode = "decimal",
  className = "",
}: {
  value: string;
  display: string;
  onSave: (newValue: string) => void | Promise<void>;
  inputMode?: "decimal" | "numeric" | "text";
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isPending, startTransition] = useTransition();

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft !== value) {
      startTransition(() => {
        onSave(draft.trim());
      });
    } else {
      setDraft(value);
    }
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      cancel();
    }
  };

  if (editing) {
    return (
      <input
        autoFocus
        inputMode={inputMode}
        className={`${inputClass} ${className}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      disabled={isPending}
      className={`rounded px-1 -mx-1 text-left hover:bg-neutral-800 disabled:opacity-60 ${className}`}
    >
      {display}
    </button>
  );
}

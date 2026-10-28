"use client";

import { useState, useTransition } from "react";
import { LIST_CONTEXTS, LIST_CONTEXT_LABEL, type ListContext } from "@/lib/planning";
import { setListContext } from "./actions";

const HINT: Record<ListContext, string> = {
  groceries: "Shows up during your Sunday reset and meal prep.",
  movies: "Offered as an easy option on low-energy evenings.",
  books: "Your next book shows up at Shutdown.",
};

// Tells the app what a collection is for, so it can appear at the right moment.
export function ListContextSelect({
  categoryId,
  context,
}: {
  categoryId: string;
  context: ListContext | null;
}) {
  const [value, setValue] = useState<ListContext | "">(context ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <div className="mb-3 space-y-1">
      <label className="flex flex-wrap items-center gap-2 text-sm text-neutral-400">
        <span>Use this list for</span>
        <select
          value={value}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value as ListContext | "";
            setValue(next);
            startTransition(async () => void (await setListContext(categoryId, next || null)));
          }}
          className="min-h-11 rounded-md border border-neutral-700 bg-neutral-800 px-3 text-sm text-neutral-200"
        >
          <option value="">Just keeping it</option>
          {LIST_CONTEXTS.map((c) => (
            <option key={c} value={c}>
              {LIST_CONTEXT_LABEL[c]}
            </option>
          ))}
        </select>
      </label>
      {value && <p className="text-xs text-neutral-500">{HINT[value]}</p>}
    </div>
  );
}

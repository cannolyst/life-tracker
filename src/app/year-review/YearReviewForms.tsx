"use client";

import { useActionState } from "react";
import { addYearReviewCategory, addYearReviewItem, type ActionState } from "./actions";
import { inputClass, labelClass, buttonClass } from "@/components/ui";
import { dateKeyInAppTimezone } from "@/lib/timezone";

const initialState: ActionState = {};

export function AddYearReviewCategoryForm() {
  const [state, formAction, pending] = useActionState(addYearReviewCategory, initialState);

  return (
    <form action={formAction} className="flex items-end gap-3">
      <div className="flex-1 space-y-1">
        <label className={labelClass}>New category</label>
        <input name="name" placeholder="Concerts" className={inputClass} />
      </div>
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Adding..." : "Add"}
      </button>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
    </form>
  );
}

export function AddYearReviewItemForm({
  categoryId,
  people,
  places,
}: {
  categoryId: string;
  people: { id: string; name: string }[];
  places: { id: string; name: string }[];
}) {
  const action = addYearReviewItem.bind(null, categoryId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const peopleDatalistId = `people-${categoryId}`;
  const placesDatalistId = `places-${categoryId}`;

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="min-w-[140px] flex-1">
        <input name="text" placeholder="Add an item..." required className={inputClass} />
      </div>
      <div className="min-w-[140px] flex-1">
        <input
          name="people"
          placeholder="With... (comma-separated)"
          list={peopleDatalistId}
          className={inputClass}
        />
        <datalist id={peopleDatalistId}>
          {people.map((p) => (
            <option key={p.id} value={p.name} />
          ))}
        </datalist>
      </div>
      <div className="min-w-[140px] flex-1">
        <input
          name="places"
          placeholder="Where... (comma-separated)"
          list={placesDatalistId}
          className={inputClass}
        />
        <datalist id={placesDatalistId}>
          {places.map((p) => (
            <option key={p.id} value={p.name} />
          ))}
        </datalist>
      </div>
      <div>
        <input
          name="date"
          type="date"
          required
          defaultValue={dateKeyInAppTimezone()}
          className={inputClass}
        />
      </div>
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "..." : "Add"}
      </button>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
    </form>
  );
}

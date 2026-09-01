"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateYearReviewItem, deleteYearReviewItem, type ActionState } from "./actions";
import { inputClass, labelClass, buttonClass, formatDate } from "@/components/ui";

type Tag = { id: string; name: string };
type Item = {
  id: string;
  text: string;
  date: string;
  people: Tag[];
  places: Tag[];
};

const initialState: ActionState = {};

export function YearReviewItemRow({
  item,
  jewel,
  allPeople,
  allPlaces,
}: {
  item: Item;
  jewel: { color: string; soft: string };
  allPeople: Tag[];
  allPlaces: Tag[];
}) {
  const [editing, setEditing] = useState(false);
  const action = updateYearReviewItem.bind(null, item.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const wasPending = useRef(false);
  const peopleDatalistId = `edit-people-${item.id}`;
  const placesDatalistId = `edit-places-${item.id}`;

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      setEditing(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  if (editing) {
    return (
      <li className="rounded-md border border-neutral-800 p-3">
        <form action={formAction} className="space-y-2">
          <div className="space-y-1">
            <label className={labelClass}>Item</label>
            <input name="text" defaultValue={item.text} required className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className={labelClass}>With</label>
              <input
                name="people"
                defaultValue={item.people.map((p) => p.name).join(", ")}
                placeholder="Comma-separated"
                list={peopleDatalistId}
                className={inputClass}
              />
              <datalist id={peopleDatalistId}>
                {allPeople.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Where</label>
              <input
                name="places"
                defaultValue={item.places.map((p) => p.name).join(", ")}
                placeholder="Comma-separated"
                list={placesDatalistId}
                className={inputClass}
              />
              <datalist id={placesDatalistId}>
                {allPlaces.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Date</label>
            <input name="date" type="date" defaultValue={item.date} required className={inputClass} />
          </div>
          {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={buttonClass}>
              {pending ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-400 hover:text-neutral-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-2 text-sm">
      <div>
        <span>
          {item.text} <span className="text-neutral-500">· {formatDate(item.date)}</span>
        </span>
        {(item.people.length > 0 || item.places.length > 0) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {item.people.map((p) => (
              <span
                key={p.id}
                className="rounded-full px-2 py-0.5 text-xs"
                style={{ backgroundColor: jewel.soft, color: jewel.color }}
              >
                {p.name}
              </span>
            ))}
            {item.places.map((p) => (
              <span
                key={p.id}
                className="rounded-full border px-2 py-0.5 text-xs text-neutral-500"
                style={{ borderColor: jewel.color }}
              >
                {p.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Edit item"
          className="text-neutral-600 hover:text-neutral-100"
        >
          ✎
        </button>
        <form action={deleteYearReviewItem.bind(null, item.id)}>
          <button
            type="submit"
            aria-label="Delete item"
            className="text-neutral-600 hover:text-red-400"
          >
            ✕
          </button>
        </form>
      </div>
    </li>
  );
}

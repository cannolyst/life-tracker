"use client";

import { useState, useTransition } from "react";
import type { Energy } from "@/lib/planning";
import { addPlanTask, completePlanTask, logDay, setEnergy, setOutTonight } from "../plan/actions";

const inputClass =
  "min-h-11 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 text-neutral-100 outline-none focus:border-neutral-500";
const buttonClass = "min-h-11 shrink-0 rounded-md bg-neutral-100 px-4 font-medium text-neutral-900 disabled:opacity-60";
const quietClass = "min-h-11 rounded-md px-3 text-sm text-neutral-400 disabled:opacity-60";

/** One-line capture into the Inbox — sits at the bottom of the page, within thumb reach. */
export function QuickAdd() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      const result = await addPlanTask({ title });
      if (result.ok) {
        setTitle("");
        setMessage("Added to your Inbox.");
      } else {
        setMessage(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-1" aria-label="Capture">
      <label className="px-1 text-xs font-medium text-neutral-500" htmlFor="quick-add">
        Capture for later
      </label>
      <div className="flex gap-2">
        <input
          id="quick-add"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setMessage(null);
          }}
          maxLength={200}
          placeholder="Something on your mind…"
          className={inputClass}
        />
        <button type="submit" disabled={pending || !title.trim()} className={buttonClass}>
          Add
        </button>
      </div>
      {message && <p className="px-1 text-xs text-neutral-500">{message}</p>}
    </form>
  );
}

export function OutTonightToggle() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => void (await setOutTonight(true)))}
      className={`${quietClass} -ml-1`}
    >
      Out tonight? Tap to protect your streak and quiet the evening.
    </button>
  );
}

/** Out tonight: the evening collapses to a one-line log, and the streak is safe. */
export function OutTonightCard({ initialNote, logged }: { initialNote: string; logged: boolean }) {
  const [note, setNote] = useState(initialNote);
  const [saved, setSaved] = useState(logged);
  const [pending, startTransition] = useTransition();

  return (
    <section aria-label="Out tonight" className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-4">
      <p className="text-sm font-medium text-neutral-200">Quick log</p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            await logDay(note);
            setSaved(true);
          });
        }}
      >
        <input
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setSaved(false);
          }}
          maxLength={500}
          placeholder="How was it?"
          aria-label="How was your evening?"
          className={inputClass}
        />
        <button type="submit" disabled={pending} className={buttonClass}>
          {saved ? "Logged ✓" : "Log it"}
        </button>
      </form>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => void (await setOutTonight(false)))}
        className={`${quietClass} -ml-3`}
      >
        Not going out after all? Turn this off
      </button>
    </section>
  );
}

export function EnergyChips({ level }: { level: Energy | null }) {
  const [current, setCurrent] = useState(level);
  const [pending, startTransition] = useTransition();

  function choose(next: Energy) {
    setCurrent(next);
    startTransition(async () => void (await setEnergy(next)));
  }

  const chip = (value: Energy, label: string) => (
    <button
      type="button"
      disabled={pending}
      aria-pressed={current === value}
      onClick={() => choose(value)}
      className={`min-h-11 rounded-full border px-4 text-sm ${
        current === value
          ? "border-neutral-100 bg-neutral-100 text-neutral-900"
          : "border-neutral-700 text-neutral-400"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-neutral-500">Energy tonight</span>
      {chip("high", "High")}
      {chip("low", "Low")}
    </div>
  );
}

export function TaskDoneRow({ taskId, title, hint }: { taskId: string; title: string; hint?: string }) {
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <li className={`flex items-center justify-between gap-3 py-1 transition-opacity ${done ? "opacity-40" : ""}`}>
      <span className="min-w-0 text-sm text-neutral-200">
        {title}
        {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
      </span>
      <button
        type="button"
        disabled={pending || done}
        onClick={() =>
          startTransition(async () => {
            setDone(true);
            await completePlanTask(taskId);
          })
        }
        className="min-h-11 shrink-0 rounded-md border border-neutral-700 px-4 text-sm text-neutral-300 disabled:opacity-70"
      >
        {done ? "✓" : "Done"}
      </button>
    </li>
  );
}

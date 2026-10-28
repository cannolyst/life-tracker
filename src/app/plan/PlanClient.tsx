"use client";

import { useState, useTransition } from "react";
import { BLOCK_IDS, BUCKETS, BUCKET_LABEL, VERB_SUGGESTIONS, type Bucket, type PlanStatus } from "@/lib/planning";
import {
  addPlanTask,
  completePlanTask,
  deletePlanTask,
  movePlanTask,
  planForTomorrow,
  reopenPlanTask,
  restoreFromSomeday,
  sendToSomeday,
  setPriorityTask,
  unplanTask,
} from "./actions";

export type PlanRowTask = {
  id: string;
  title: string;
  lowTitle: string | null;
  bucket: Bucket;
  minutes: number | null;
  status: PlanStatus;
  planned: "today" | "tomorrow" | null;
  isPriority: boolean;
};

const inputClass =
  "min-h-11 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 text-neutral-100 outline-none focus:border-neutral-500";
const labelClass = "text-sm text-neutral-400";
const buttonClass = "min-h-11 rounded-md bg-neutral-100 px-4 font-medium text-neutral-900 disabled:opacity-60";
const smallButton =
  "min-h-11 shrink-0 rounded-md border border-neutral-700 px-4 text-sm text-neutral-300 disabled:opacity-60";

export function AddTaskForm() {
  const [verb, setVerb] = useState("");
  const [what, setWhat] = useState("");
  const [minutes, setMinutes] = useState("");
  const [area, setArea] = useState<Bucket | "">("");
  const [energy, setEnergy] = useState("");
  const [block, setBlock] = useState("");
  const [firstStep, setFirstStep] = useState("");
  const [lowTitle, setLowTitle] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await addPlanTask({
        title: what,
        verb,
        lowTitle,
        firstStep,
        bucket: area,
        energy: energy || null,
        block: block || null,
        minutes: minutes.trim() ? Number(minutes) : null,
      });
      if (result.ok) {
        setVerb("");
        setWhat("");
        setMinutes("");
        setFirstStep("");
        setLowTitle("");
        setMessage("Added.");
      } else {
        setMessage(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-neutral-500">
        A task starts with a verb and has a size. For a quick thought, use the capture box on the home page.
      </p>
      <div className="grid grid-cols-[8rem_1fr] gap-3">
        <label className="block space-y-1">
          <span className={labelClass}>Verb</span>
          <input
            list="plan-verbs"
            value={verb}
            onChange={(e) => setVerb(e.target.value)}
            maxLength={30}
            placeholder="Call"
            required
            className={inputClass}
          />
          <datalist id="plan-verbs">
            {VERB_SUGGESTIONS.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>What</span>
          <input
            value={what}
            onChange={(e) => setWhat(e.target.value)}
            maxLength={200}
            placeholder="the dentist"
            required
            className={inputClass}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className={labelClass}>Minutes</span>
          <input
            value={minutes}
            onChange={(e) => setMinutes(e.target.value.replace(/\D/g, "").slice(0, 3))}
            inputMode="numeric"
            required
            className={inputClass}
          />
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>Area</span>
          <select value={area} onChange={(e) => setArea(e.target.value as Bucket)} required className={inputClass}>
            <option value="" disabled>
              Choose…
            </option>
            {BUCKETS.filter((b) => b !== "inbox").map((b) => (
              <option key={b} value={b}>
                {BUCKET_LABEL[b]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <details>
        <summary className="cursor-pointer py-1 text-sm text-neutral-400">More (optional)</summary>
        <div className="mt-2 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className={labelClass}>Energy it needs</span>
              <select value={energy} onChange={(e) => setEnergy(e.target.value)} className={inputClass}>
                <option value="">Any</option>
                <option value="low">Low</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>Best part of the day</span>
              <select value={block} onChange={(e) => setBlock(e.target.value)} className={inputClass}>
                <option value="">Any</option>
                {BLOCK_IDS.map((b) => (
                  <option key={b} value={b}>
                    {b.charAt(0).toUpperCase() + b.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block space-y-1">
            <span className={labelClass}>First step (shown under the 5-minute Start)</span>
            <input value={firstStep} onChange={(e) => setFirstStep(e.target.value)} maxLength={300} className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className={labelClass}>Easier version for low-energy days</span>
            <input
              value={lowTitle}
              onChange={(e) => setLowTitle(e.target.value)}
              maxLength={200}
              placeholder="e.g. just open the book"
              className={inputClass}
            />
          </label>
        </div>
      </details>
      {message && <p className="text-sm text-neutral-400">{message}</p>}
      <button type="submit" disabled={pending || !what.trim() || !verb.trim() || !area || !minutes} className={buttonClass}>
        {pending ? "Adding..." : "Add task"}
      </button>
    </form>
  );
}

type Run = (fn: () => Promise<{ ok: boolean; note?: string; error?: string }>) => void;

export function PlanRow({ task }: { task: PlanRowTask }) {
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run: Run = (fn) =>
    startTransition(async () => {
      const result = await fn();
      setNote(result.ok ? (result.note ?? null) : (result.error ?? null));
    });

  const isDone = task.status === "done";
  const isSomeday = task.status === "someday";

  function onMore(value: string) {
    if (value.startsWith("bucket:")) run(() => movePlanTask(task.id, value.slice(7)));
    else if (value === "tomorrow") run(() => planForTomorrow(task.id));
    else if (value === "unplan") run(() => unplanTask(task.id));
    else if (value === "priority") run(() => setPriorityTask(task.id));
    else if (value === "someday") run(() => sendToSomeday(task.id));
    else if (value === "delete") run(() => deletePlanTask(task.id));
  }

  return (
    <li className={`space-y-1 py-2 ${isDone ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 text-sm text-neutral-200">
          {task.isPriority && <span aria-label="Priority">★ </span>}
          {task.title}
          <span className="block text-xs text-neutral-500">
            {[
              task.planned === "today" ? "Planned for today" : task.planned === "tomorrow" ? "Planned for tomorrow" : null,
              task.lowTitle ? `Easier: ${task.lowTitle}` : null,
              task.minutes ? `${task.minutes} min` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        <span className="flex shrink-0 gap-2">
          {isDone ? (
            <button type="button" disabled={pending} onClick={() => run(() => reopenPlanTask(task.id))} className={smallButton}>
              Reopen
            </button>
          ) : isSomeday ? (
            <button type="button" disabled={pending} onClick={() => run(() => restoreFromSomeday(task.id))} className={smallButton}>
              To Inbox
            </button>
          ) : (
            <button type="button" disabled={pending} onClick={() => run(() => completePlanTask(task.id))} className={smallButton}>
              Done
            </button>
          )}
          <select
            aria-label={`More for “${task.title}”`}
            value=""
            disabled={pending}
            onChange={(e) => onMore(e.target.value)}
            className="min-h-11 w-24 rounded-md border border-neutral-700 bg-neutral-800 px-2 text-sm text-neutral-300"
          >
            <option value="" disabled>
              More…
            </option>
            {!isDone && !isSomeday && (
              <>
                {BUCKETS.filter((b) => b !== task.bucket).map((b) => (
                  <option key={b} value={`bucket:${b}`}>
                    Move to {BUCKET_LABEL[b]}
                  </option>
                ))}
                {task.planned === "tomorrow" ? (
                  <>
                    {!task.isPriority && <option value="priority">Lead tomorrow</option>}
                    <option value="unplan">Take off tomorrow</option>
                  </>
                ) : (
                  <option value="tomorrow">Plan for tomorrow</option>
                )}
                <option value="someday">Save for Someday</option>
              </>
            )}
            <option value="delete">Remove</option>
          </select>
        </span>
      </div>
      {note && <p className="text-xs text-neutral-500">{note}</p>}
    </li>
  );
}

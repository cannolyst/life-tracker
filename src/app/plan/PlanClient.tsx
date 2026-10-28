"use client";

import { useState, useTransition } from "react";
import { BUCKETS, BUCKET_LABEL, type Bucket, type PlanStatus } from "@/lib/planning";
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
  const [title, setTitle] = useState("");
  const [lowTitle, setLowTitle] = useState("");
  const [bucket, setBucket] = useState<Bucket>("inbox");
  const [minutes, setMinutes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await addPlanTask({
        title,
        lowTitle,
        bucket,
        minutes: minutes.trim() ? Number(minutes) : null,
      });
      if (result.ok) {
        setTitle("");
        setLowTitle("");
        setMinutes("");
        setMessage("Added.");
      } else {
        setMessage(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block space-y-1">
        <span className={labelClass}>Task</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required className={inputClass} />
      </label>
      <label className="block space-y-1">
        <span className={labelClass}>Easier version for low-energy days (optional)</span>
        <input
          value={lowTitle}
          onChange={(e) => setLowTitle(e.target.value)}
          maxLength={200}
          placeholder="e.g. just open the book"
          className={inputClass}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className={labelClass}>Bucket</span>
          <select value={bucket} onChange={(e) => setBucket(e.target.value as Bucket)} className={inputClass}>
            {BUCKETS.map((b) => (
              <option key={b} value={b}>
                {BUCKET_LABEL[b]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>Minutes (optional)</span>
          <input
            value={minutes}
            onChange={(e) => setMinutes(e.target.value.replace(/\D/g, "").slice(0, 3))}
            inputMode="numeric"
            className={inputClass}
          />
        </label>
      </div>
      {message && <p className="text-sm text-neutral-400">{message}</p>}
      <button type="submit" disabled={pending || !title.trim()} className={buttonClass}>
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

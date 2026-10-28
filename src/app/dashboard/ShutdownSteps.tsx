"use client";

import { useState, useTransition, type ReactNode } from "react";
import { BUCKETS, BUCKET_LABEL, type Bucket } from "@/lib/planning";
import {
  deletePlanTask,
  logDay,
  movePlanTask,
  planForTomorrow,
  sendToSomeday,
  setPriorityTask,
  unplanTask,
} from "../plan/actions";

export type ShutdownTask = {
  id: string;
  title: string;
  bucket: Bucket;
  plannedFor: string | null;
  isPriority: boolean;
};

const inputClass =
  "min-h-11 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 text-neutral-100 outline-none focus:border-neutral-500";
const smallButton =
  "min-h-11 shrink-0 rounded-md border border-neutral-700 px-3 text-sm text-neutral-300 disabled:opacity-60";

function Step({
  number,
  title,
  status,
  open,
  children,
}: {
  number: number;
  title: string;
  status: string;
  open: boolean;
  children: ReactNode;
}) {
  return (
    <details open={open} className="group border-t border-neutral-800 first:border-t-0">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2">
        <span className="text-sm font-medium text-neutral-200">
          {number}. {title}
        </span>
        <span className="text-xs text-neutral-500">{status}</span>
      </summary>
      <div className="space-y-3 pb-4">{children}</div>
    </details>
  );
}

// The Shutdown block: log the day, tidy the Inbox, plan tomorrow. Each step
// opens in order and says when it's done; nothing here earns or costs points.
export function ShutdownSteps({
  logged,
  initialNote,
  finishedToday,
  tasks,
  tomorrowKey,
  cap,
}: {
  logged: boolean;
  initialNote: string;
  finishedToday: number;
  tasks: ShutdownTask[];
  tomorrowKey: string;
  cap: number;
}) {
  const [note, setNote] = useState(initialNote);
  const [savedLog, setSavedLog] = useState(logged);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const inbox = tasks.filter((t) => t.bucket === "inbox" && t.plannedFor === null);
  const planned = tasks.filter((t) => t.plannedFor === tomorrowKey);
  const candidates = tasks.filter((t) => t.plannedFor !== tomorrowKey);
  const room = Math.max(0, cap - planned.length);

  const run = (fn: () => Promise<{ ok: boolean; note?: string; error?: string }>) =>
    startTransition(async () => {
      const result = await fn();
      setMessage(result.ok ? (result.note ?? null) : (result.error ?? null));
    });

  return (
    <section aria-label="Shutdown" className="rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-2">
      <Step number={1} title="Log the day" status={savedLog ? "Done ✓" : "Not yet"} open={!savedLog}>
        <p className="text-sm text-neutral-400">
          {finishedToday > 0
            ? `${finishedToday} ${finishedToday === 1 ? "thing" : "things"} finished today.`
            : "A quieter day — that's allowed."}
        </p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              await logDay(note);
              setSavedLog(true);
            });
          }}
        >
          <input
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setSavedLog(false);
            }}
            maxLength={500}
            placeholder="One line about today (optional)"
            aria-label="One line about today"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 shrink-0 rounded-md bg-neutral-100 px-4 font-medium text-neutral-900 disabled:opacity-60"
          >
            {savedLog ? "Logged ✓" : "Log it"}
          </button>
        </form>
      </Step>

      <Step
        number={2}
        title="Tidy the Inbox"
        status={inbox.length === 0 ? "Clear ✓" : `${inbox.length} to sort`}
        open={savedLog && inbox.length > 0}
      >
        {inbox.length === 0 ? (
          <p className="text-sm text-neutral-500">Nothing in your Inbox.</p>
        ) : (
          <ul className="space-y-3">
            {inbox.map((task) => (
              <li key={task.id} className="space-y-2">
                <p className="text-sm text-neutral-200">{task.title}</p>
                <div className="flex flex-wrap gap-2">
                  <select
                    aria-label={`Sort “${task.title}” into a bucket`}
                    defaultValue=""
                    disabled={pending}
                    onChange={(e) => e.target.value && run(() => movePlanTask(task.id, e.target.value))}
                    className="min-h-11 rounded-md border border-neutral-700 bg-neutral-800 px-3 text-sm text-neutral-200"
                  >
                    <option value="" disabled>
                      Move to…
                    </option>
                    {BUCKETS.filter((b) => b !== "inbox").map((b) => (
                      <option key={b} value={b}>
                        {BUCKET_LABEL[b]}
                      </option>
                    ))}
                  </select>
                  <button type="button" disabled={pending} onClick={() => run(() => sendToSomeday(task.id))} className={smallButton}>
                    Someday
                  </button>
                  <button type="button" disabled={pending} onClick={() => run(() => deletePlanTask(task.id))} className={smallButton}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Step>

      <Step
        number={3}
        title="Plan tomorrow"
        status={planned.length > 0 ? `${planned.length} planned` : "Not yet"}
        open={savedLog && inbox.length === 0}
      >
        <p className="text-sm text-neutral-400">
          Tomorrow has room for about {cap} {cap === 1 ? "thing" : "things"} — matching what you finished today.
          {room === 0 ? " It's full; anything more waits in Someday." : ""}
        </p>

        {planned.length > 0 && (
          <ul className="space-y-2">
            {planned.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 text-sm text-neutral-200">
                  {task.isPriority && <span aria-label="Priority">★ </span>}
                  {task.title}
                </span>
                <span className="flex shrink-0 gap-2">
                  {!task.isPriority && (
                    <button type="button" disabled={pending} onClick={() => run(() => setPriorityTask(task.id))} className={smallButton}>
                      ★ Lead
                    </button>
                  )}
                  <button type="button" disabled={pending} onClick={() => run(() => unplanTask(task.id))} className={smallButton}>
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        {candidates.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-neutral-500">Add from your list</p>
            <ul className="space-y-1">
              {candidates.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 text-sm text-neutral-300">
                    {task.title}
                    <span className="ml-2 text-xs text-neutral-500">{BUCKET_LABEL[task.bucket]}</span>
                  </span>
                  <button type="button" disabled={pending} onClick={() => run(() => planForTomorrow(task.id))} className={smallButton}>
                    Tomorrow
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {candidates.length === 0 && planned.length === 0 && (
          <p className="text-sm text-neutral-500">Nothing to plan yet. Capture something below, or enjoy a clear tomorrow.</p>
        )}
        {message && <p className="text-sm text-neutral-400">{message}</p>}
      </Step>
    </section>
  );
}

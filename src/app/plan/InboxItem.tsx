"use client";

import { useState, useTransition } from "react";
import { BUCKETS, BUCKET_LABEL, VERB_SUGGESTIONS, BLOCK_IDS, type Bucket } from "@/lib/planning";
import { deletePlanTask, fileIntoCollection, refineTask, sendToSomeday } from "./actions";

const inputClass =
  "min-h-11 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 text-neutral-100 outline-none focus:border-neutral-500";
const smallButton =
  "min-h-11 shrink-0 rounded-md border border-neutral-700 px-3 text-sm text-neutral-300 disabled:opacity-60";
const labelClass = "text-xs text-neutral-500";

// One Inbox item and the three things it can become: a task (given a verb and
// a time), an entry in a collection, or Someday. Nothing leaves the Inbox
// until you choose.
export function InboxItem({
  taskId,
  title,
  collections,
}: {
  taskId: string;
  title: string;
  collections: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [verb, setVerb] = useState("");
  const [minutes, setMinutes] = useState("");
  const [area, setArea] = useState<Bucket | "">("");
  const [energy, setEnergy] = useState("");
  const [block, setBlock] = useState("");
  const [firstStep, setFirstStep] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; note?: string; error?: string }>) =>
    startTransition(async () => {
      const result = await fn();
      setMessage(result.ok ? (result.note ?? null) : (result.error ?? null));
    });

  return (
    <li className="space-y-2 py-2">
      <p className="text-sm text-neutral-200">{title}</p>

      {!open ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending} onClick={() => setOpen(true)} className={smallButton}>
            Make it a task
          </button>
          {collections.length > 0 && (
            <select
              aria-label={`File “${title}” into a list`}
              defaultValue=""
              disabled={pending}
              onChange={(e) => e.target.value && run(() => fileIntoCollection(taskId, e.target.value))}
              className="min-h-11 rounded-md border border-neutral-700 bg-neutral-800 px-3 text-sm text-neutral-200"
            >
              <option value="" disabled>
                File in a list…
              </option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <button type="button" disabled={pending} onClick={() => run(() => sendToSomeday(taskId))} className={smallButton}>
            Someday
          </button>
          <button type="button" disabled={pending} onClick={() => run(() => deletePlanTask(taskId))} className={smallButton}>
            Remove
          </button>
        </div>
      ) : (
        <form
          className="space-y-3 rounded-md border border-neutral-800 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() =>
              refineTask(taskId, {
                verb,
                minutes: minutes ? Number(minutes) : null,
                bucket: area,
                energy: energy || null,
                block: block || null,
                firstStep,
              }),
            );
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className={labelClass}>Starts with the verb</span>
              <input
                list={`verbs-${taskId}`}
                value={verb}
                onChange={(e) => setVerb(e.target.value)}
                maxLength={30}
                placeholder="Call, Write…"
                required
                className={inputClass}
              />
              <datalist id={`verbs-${taskId}`}>
                {VERB_SUGGESTIONS.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </label>
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
          </div>
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
                <span className={labelClass}>First step</span>
                <input
                  value={firstStep}
                  onChange={(e) => setFirstStep(e.target.value)}
                  maxLength={300}
                  placeholder="e.g. Find the dentist's number"
                  className={inputClass}
                />
              </label>
            </div>
          </details>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 rounded-md bg-neutral-100 px-4 font-medium text-neutral-900 disabled:opacity-60"
            >
              Save task
            </button>
            <button type="button" disabled={pending} onClick={() => setOpen(false)} className={smallButton}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {message && <p className="text-xs text-neutral-500">{message}</p>}
    </li>
  );
}

"use client";

import { useState, useTransition } from "react";
import { deletePlanTask, restoreFromSomeday, sendToSomeday, unplanTask } from "../plan/actions";
import { InboxItem } from "../plan/InboxItem";
import { setListItemDone } from "../lists/actions";
import { archiveSubscription } from "../life/actions";
import { addGroceryItem, assignToEvening, finishReset, keepTask, saveResetHighlight } from "./actions";

const inputClass =
  "min-h-11 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 text-neutral-100 outline-none focus:border-neutral-500";
const primary = "min-h-11 shrink-0 rounded-md bg-neutral-100 px-4 font-medium text-neutral-900 disabled:opacity-60";
const small = "min-h-11 shrink-0 rounded-md border border-neutral-700 px-3 text-sm text-neutral-300 disabled:opacity-60";

/* ---------- 1. look back: the one highlight ---------- */

export function HighlightForm({ initial, suggestion }: { initial: string; suggestion: string }) {
  const [text, setText] = useState(initial || suggestion);
  const [saved, setSaved] = useState(initial !== "");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await saveResetHighlight(text);
          setSaved(true);
        });
      }}
    >
      <label className="block space-y-1">
        <span className="text-sm text-neutral-400">One highlight from the week</span>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSaved(false);
          }}
          maxLength={300}
          placeholder="What went well?"
          className={inputClass}
        />
      </label>
      <button type="submit" disabled={pending || !text.trim()} className={primary}>
        {saved ? "Saved ✓" : "Save highlight"}
      </button>
    </form>
  );
}

/* ---------- 3. plan the week: big items onto open evenings ---------- */

export type EveningOption = { dateKey: string; label: string; assignedId: string | null; suggestedId: string | null };
export type AssignableTask = { id: string; title: string; minutes: number | null };

export function AssignEvenings({ evenings, tasks }: { evenings: EveningOption[]; tasks: AssignableTask[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function choose(evening: EveningOption, taskId: string) {
    startTransition(async () => {
      if (taskId === "") {
        if (evening.assignedId) await unplanTask(evening.assignedId);
        setMessage(null);
        return;
      }
      const result = await assignToEvening(taskId, evening.dateKey);
      setMessage(result.ok ? null : result.error);
    });
  }

  function useSuggestions() {
    startTransition(async () => {
      for (const evening of evenings) {
        if (evening.suggestedId && !evening.assignedId) await assignToEvening(evening.suggestedId, evening.dateKey);
      }
    });
  }

  if (evenings.length === 0) {
    return <p className="text-sm text-neutral-500">No open evenings this week — enjoy them.</p>;
  }
  if (tasks.length === 0) {
    return <p className="text-sm text-neutral-500">Nothing to assign yet. Add tasks on the Plan page first.</p>;
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {evenings.map((evening) => (
          <li key={evening.dateKey} className="space-y-1">
            <label className="text-sm text-neutral-300" htmlFor={`eve-${evening.dateKey}`}>
              {evening.label} evening
            </label>
            <select
              id={`eve-${evening.dateKey}`}
              value={evening.assignedId ?? ""}
              disabled={pending}
              onChange={(e) => choose(evening, e.target.value)}
              className={inputClass}
            >
              <option value="">Leave open</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                  {t.minutes ? ` (${t.minutes} min)` : ""}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      {evenings.some((e) => e.suggestedId && !e.assignedId) && (
        <button type="button" disabled={pending} onClick={useSuggestions} className={small}>
          Suggest my biggest tasks
        </button>
      )}
      {message && <p className="text-sm text-neutral-400">{message}</p>}
    </div>
  );
}

/* ---------- 4. groceries ---------- */

export function Groceries({
  listName,
  items,
  hasList,
}: {
  listName: string | null;
  items: { id: string; text: string }[];
  hasList: boolean;
}) {
  const [text, setText] = useState("");
  const [gone, setGone] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!hasList) {
    return (
      <p className="text-sm text-neutral-500">
        Tell the app which list is your groceries: on the Lists page, set “Use this list for” to Groceries.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-neutral-500">From {listName}</p>
      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing on the list yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-800">
          {items.map((item) => (
            <li key={item.id} className={`flex items-center justify-between gap-3 py-1 ${gone.has(item.id) ? "opacity-40" : ""}`}>
              <span className="min-w-0 text-sm text-neutral-200">{item.text}</span>
              <button
                type="button"
                disabled={pending || gone.has(item.id)}
                onClick={() =>
                  startTransition(async () => {
                    setGone((prev) => new Set(prev).add(item.id));
                    await setListItemDone(item.id, true);
                  })
                }
                className={small}
              >
                {gone.has(item.id) ? "✓" : "Have it"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const result = await addGroceryItem(text);
            if (result.ok) {
              setText("");
              setMessage(null);
            } else setMessage(result.error);
          });
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          placeholder="Add something we need"
          aria-label="Add a grocery item"
          className={inputClass}
        />
        <button type="submit" disabled={pending || !text.trim()} className={primary}>
          Add
        </button>
      </form>
      {message && <p className="text-sm text-neutral-400">{message}</p>}
    </div>
  );
}

/* ---------- 5. clear the decks ---------- */

type DeckTask = { id: string; title: string };

function DeckRow({ children, title, hint }: { children: React.ReactNode; title: string; hint?: string }) {
  return (
    <li className="space-y-2 py-2">
      <p className="text-sm text-neutral-200">
        {title}
        {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </li>
  );
}

export function ClearDecks({
  inbox,
  someday,
  stale,
  collections,
}: {
  inbox: DeckTask[];
  someday: DeckTask[];
  stale: (DeckTask & { age: string })[];
  collections: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<unknown>) => startTransition(async () => void (await fn()));

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-medium text-neutral-500">Inbox ({inbox.length})</h3>
        {inbox.length === 0 ? (
          <p className="mt-1 text-sm text-neutral-500">Clear ✓</p>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {inbox.map((t) => (
              <InboxItem key={t.id} taskId={t.id} title={t.title} collections={collections} />
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-xs font-medium text-neutral-500">Someday ({someday.length})</h3>
        {someday.length === 0 ? (
          <p className="mt-1 text-sm text-neutral-500">Nothing saved for later.</p>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {someday.map((t) => (
              <DeckRow key={t.id} title={t.title}>
                <button type="button" disabled={pending} onClick={() => run(() => restoreFromSomeday(t.id))} className={small}>
                  Bring back
                </button>
                <button type="button" disabled={pending} onClick={() => run(() => deletePlanTask(t.id))} className={small}>
                  Drop it
                </button>
              </DeckRow>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-xs font-medium text-neutral-500">Gathering dust ({stale.length})</h3>
        {stale.length === 0 ? (
          <p className="mt-1 text-sm text-neutral-500">Nothing stale — nice.</p>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {stale.map((t) => (
              <DeckRow key={t.id} title={t.title} hint={`On your list for ${t.age}`}>
                <button type="button" disabled={pending} onClick={() => run(() => keepTask(t.id))} className={small}>
                  Keep
                </button>
                <button type="button" disabled={pending} onClick={() => run(() => sendToSomeday(t.id))} className={small}>
                  Someday
                </button>
                <button type="button" disabled={pending} onClick={() => run(() => deletePlanTask(t.id))} className={small}>
                  Drop it
                </button>
              </DeckRow>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------- finish ---------- */

export function FinishReset({ completed, points }: { completed: boolean; points: number }) {
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState(completed);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <p className="rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-4 text-sm text-neutral-300">
        {note ?? "This week’s reset is done ✓. Have a good week."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await finishReset();
            if (result.ok) {
              setNote(result.note ?? null);
              setDone(true);
            }
          })
        }
        className="min-h-12 w-full rounded-md bg-neutral-100 px-4 text-base font-medium text-neutral-900 disabled:opacity-60"
      >
        {pending ? "Finishing..." : `Finish reset (+${points} points)`}
      </button>
      <p className="text-center text-xs text-neutral-500">Skipped a step? That’s fine — finish whenever you’re ready.</p>
    </div>
  );
}

/* ---------- monthly review: subscription audit ---------- */

export type AuditSub = { id: string; name: string; label: string; monthly: number };

export function SubscriptionAudit({ subs }: { subs: AuditSub[] }) {
  const [kept, setKept] = useState<Set<string>>(() => new Set());
  const [gone, setGone] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();

  if (subs.length === 0) return <p className="text-sm text-neutral-500">No subscriptions to review.</p>;

  return (
    <ul className="divide-y divide-neutral-800">
      {subs.map((s) => (
        <li key={s.id} className={`space-y-2 py-2 ${gone.has(s.id) ? "opacity-40" : ""}`}>
          <p className="text-sm text-neutral-200">
            {s.name}
            <span className="block text-xs text-neutral-500">{s.label}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={gone.has(s.id)}
              aria-pressed={kept.has(s.id)}
              onClick={() => setKept((prev) => new Set(prev).add(s.id))}
              className={small}
            >
              {kept.has(s.id) ? "Keeping it ✓" : "Still using it"}
            </button>
            <button
              type="button"
              disabled={pending || gone.has(s.id)}
              onClick={() =>
                confirm(`Take “${s.name}” off the list? Remember to cancel it with the company too.`) &&
                startTransition(async () => {
                  setGone((prev) => new Set(prev).add(s.id));
                  await archiveSubscription(s.id);
                })
              }
              className={small}
            >
              {gone.has(s.id) ? "Removed" : "Cancel it"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

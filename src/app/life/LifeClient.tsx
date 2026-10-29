"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { describeInterval, dueLabel } from "@/lib/lifeAdmin";
import type { PersonRow, RecurringRow, SubscriptionRow } from "@/db/lifeAdmin";
import { formatPrice } from "@/lib/dashboard";
import {
  addGiftIdea,
  addPerson,
  addRecurring,
  addSubscription,
  archiveRecurring,
  archiveSubscription,
  createGiftList,
  markPersonSeen,
  markRecurringDone,
  savePersonDetails,
  toggleSubscriptionAutopay,
} from "./actions";

const inputClass =
  "min-h-11 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 text-neutral-100 outline-none focus:border-neutral-500";
const labelClass = "text-xs text-neutral-500";
const primary = "min-h-11 shrink-0 rounded-md bg-neutral-100 px-4 font-medium text-neutral-900 disabled:opacity-60";
const small = "min-h-11 shrink-0 rounded-md border border-neutral-700 px-3 text-sm text-neutral-300 disabled:opacity-60";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayLabel(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

function useAction() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, onOk?: () => void) =>
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        setMessage(null);
        onOk?.();
      } else setMessage(result.error ?? "Something went wrong.");
    });
  return { message, pending, run };
}

/* ---------- recurring ---------- */

export function RecurringSection({ items, todayKey }: { items: RecurringRow[]; todayKey: string }) {
  const { message, pending, run } = useAction();
  const [name, setName] = useState("");
  const [count, setCount] = useState("3");
  const [unit, setUnit] = useState("months");
  const [lastDone, setLastDone] = useState(todayKey);

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing yet. Add things like “renew registration” or “change the furnace filter”.</p>
      ) : (
        <ul className="divide-y divide-neutral-800">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0 text-sm text-neutral-200">
                {item.name}
                <span className="block text-xs text-neutral-500">
                  {describeInterval(item.intervalDays)} · {dueLabel(item.status.daysUntil)}
                </span>
              </span>
              <span className="flex shrink-0 gap-2">
                <button type="button" disabled={pending} onClick={() => run(() => markRecurringDone(item.id))} className={small}>
                  Done
                </button>
                <button
                  type="button"
                  disabled={pending}
                  aria-label={`Remove ${item.name}`}
                  onClick={() => confirm(`Remove “${item.name}”?`) && run(() => archiveRecurring(item.id))}
                  className={small}
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form
        className="space-y-3 border-t border-neutral-800 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => addRecurring({ name, count: Number(count), unit, lastDone: lastDone || null }),
            () => setName(""),
          );
        }}
      >
        <label className="block space-y-1">
          <span className={labelClass}>Add one</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="e.g. Change the furnace filter" className={inputClass} />
        </label>
        <div className="grid grid-cols-[5rem_1fr] gap-3">
          <label className="block space-y-1">
            <span className={labelClass}>Every</span>
            <input value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className={labelClass}>&nbsp;</span>
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass}>
              <option value="days">days</option>
              <option value="weeks">weeks</option>
              <option value="months">months</option>
              <option value="years">years</option>
            </select>
          </label>
        </div>
        <label className="block space-y-1">
          <span className={labelClass}>Last done (leave empty if you’re not sure — it will show as ready now)</span>
          <input type="date" value={lastDone} onChange={(e) => setLastDone(e.target.value)} className={inputClass} />
        </label>
        {message && <p className="text-sm text-neutral-400">{message}</p>}
        <button type="submit" disabled={pending || !name.trim()} className={primary}>
          Add
        </button>
      </form>
    </div>
  );
}

/* ---------- subscriptions ---------- */

export function SubscriptionsSection({ items }: { items: SubscriptionRow[] }) {
  const { message, pending, run } = useAction();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState("monthly");
  const [date, setDate] = useState("");
  const [autopay, setAutopay] = useState(true);
  const [isTrial, setIsTrial] = useState(false);

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing yet. Add subscriptions and free trials so nothing renews by surprise.</p>
      ) : (
        <ul className="divide-y divide-neutral-800">
          {items.map((s) => (
            <li key={s.id} className="space-y-2 py-2">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 text-sm text-neutral-200">
                  {s.name}
                  {s.status.isTrial && (
                    <span className="ml-2 rounded-full border border-neutral-600 px-2 py-0.5 text-xs text-neutral-300">free trial</span>
                  )}
                  <span className="block text-xs text-neutral-500">
                    {formatPrice(s.amount)}/{s.cycle === "yearly" ? "year" : "month"} ·{" "}
                    {s.status.isTrial ? "converts" : "next charge"} {dayLabel(s.status.chargeKey)} ({dueLabel(s.status.daysUntil)})
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={pending} onClick={() => run(() => toggleSubscriptionAutopay(s.id))} className={small}>
                  {s.autopay ? "Autopay on" : "Manual"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => confirm(`Take “${s.name}” off the list? (Cancel it with the company too.)`) && run(() => archiveSubscription(s.id))}
                  className={small}
                >
                  {s.status.isTrial ? "Cancelled it" : "Remove"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        className="space-y-3 border-t border-neutral-800 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => addSubscription({ name, amount: Number(amount), cycle, nextCharge: date, autopay, isTrial }),
            () => {
              setName("");
              setAmount("");
              setDate("");
              setIsTrial(false);
            },
          );
        }}
      >
        <label className="block space-y-1">
          <span className={labelClass}>Add one</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="e.g. Streaming service" className={inputClass} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className={labelClass}>{isTrial ? "Price after the trial" : "Price"}</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="9.99" className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className={labelClass}>Billed</span>
            <select value={cycle} onChange={(e) => setCycle(e.target.value)} className={inputClass}>
              <option value="monthly">monthly</option>
              <option value="yearly">yearly</option>
            </select>
          </label>
        </div>
        <label className="block space-y-1">
          <span className={labelClass}>{isTrial ? "Free trial ends" : "Next charge"}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm text-neutral-300">
          <input type="checkbox" checked={isTrial} onChange={(e) => setIsTrial(e.target.checked)} className="h-4 w-4" />
          This is a free trial
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm text-neutral-300">
          <input type="checkbox" checked={autopay} onChange={(e) => setAutopay(e.target.checked)} className="h-4 w-4" />
          Pays automatically
        </label>
        {message && <p className="text-sm text-neutral-400">{message}</p>}
        <button type="submit" disabled={pending || !name.trim() || !amount || !date} className={primary}>
          Add
        </button>
      </form>
    </div>
  );
}

/* ---------- people ---------- */

function PersonCard({ person }: { person: PersonRow }) {
  const { message, pending, run } = useAction();
  const [month, setMonth] = useState(person.birthMonth ? String(person.birthMonth) : "");
  const [day, setDay] = useState(person.birthDay ? String(person.birthDay) : "");
  const [year, setYear] = useState(person.birthYear ? String(person.birthYear) : "");
  const [weeks, setWeeks] = useState(person.seeEveryWeeks ? String(person.seeEveryWeeks) : "");
  const [idea, setIdea] = useState("");
  const [saved, setSaved] = useState(false);

  const details = [
    person.birthday ? `Birthday ${dayLabel(person.birthday.dateKey)}${person.birthday.turning ? ` (turning ${person.birthday.turning})` : ""}` : null,
    person.seeEveryWeeks
      ? `see every ${person.seeEveryWeeks} ${person.seeEveryWeeks === 1 ? "week" : "weeks"}${person.lastSeen ? ` · last ${dayLabel(person.lastSeen)}` : ""}`
      : null,
  ].filter(Boolean);

  return (
    <li className="space-y-2 py-3">
      <div>
        <p className="text-sm font-medium text-neutral-200">{person.name}</p>
        <p className="text-xs text-neutral-500">{details.length > 0 ? details.join(" · ") : "No details yet"}</p>
        {person.nudge && (
          <p className="text-xs text-neutral-400">It’s been about {person.nudge.weeksSince} weeks — maybe reach out.</p>
        )}
      </div>

      <details>
        <summary className="cursor-pointer py-1 text-sm text-neutral-400">Details &amp; gift ideas</summary>
        <div className="mt-2 space-y-3">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () =>
                  savePersonDetails(person.id, {
                    birthMonth: month ? Number(month) : null,
                    birthDay: day ? Number(day) : null,
                    birthYear: year ? Number(year) : null,
                    seeEveryWeeks: weeks ? Number(weeks) : null,
                  }),
                () => setSaved(true),
              );
            }}
          >
            <div className="grid grid-cols-3 gap-3">
              <label className="block space-y-1">
                <span className={labelClass}>Birth month</span>
                <select value={month} onChange={(e) => { setMonth(e.target.value); setSaved(false); }} className={inputClass}>
                  <option value="">—</option>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className={labelClass}>Day</span>
                <input value={day} onChange={(e) => { setDay(e.target.value.replace(/\D/g, "").slice(0, 2)); setSaved(false); }} inputMode="numeric" className={inputClass} />
              </label>
              <label className="block space-y-1">
                <span className={labelClass}>Year (optional)</span>
                <input value={year} onChange={(e) => { setYear(e.target.value.replace(/\D/g, "").slice(0, 4)); setSaved(false); }} inputMode="numeric" className={inputClass} />
              </label>
            </div>
            <label className="block space-y-1">
              <span className={labelClass}>See them every … weeks (optional)</span>
              <input value={weeks} onChange={(e) => { setWeeks(e.target.value.replace(/\D/g, "").slice(0, 3)); setSaved(false); }} inputMode="numeric" className={inputClass} />
            </label>
            {message && <p className="text-sm text-neutral-400">{message}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={pending} className={primary}>
                {saved ? "Saved ✓" : "Save"}
              </button>
              <button type="button" disabled={pending} onClick={() => run(() => markPersonSeen(person.id))} className={small}>
                I saw them today
              </button>
            </div>
          </form>

          <div className="space-y-2 border-t border-neutral-800 pt-3">
            <p className={labelClass}>Gift ideas</p>
            {person.giftListId ? (
              <>
                <p className="text-sm text-neutral-300">
                  {person.giftIdeas} {person.giftIdeas === 1 ? "idea" : "ideas"} saved.{" "}
                  <Link href="/lists" className="underline">
                    See the list
                  </Link>
                </p>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(() => addGiftIdea(person.id, idea), () => setIdea(""));
                  }}
                >
                  <input value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={200} placeholder="Add an idea" aria-label={`Gift idea for ${person.name}`} className={inputClass} />
                  <button type="submit" disabled={pending || !idea.trim()} className={primary}>
                    Add
                  </button>
                </form>
              </>
            ) : (
              <button type="button" disabled={pending} onClick={() => run(() => createGiftList(person.id))} className={small}>
                Start a gift-ideas list
              </button>
            )}
          </div>
        </div>
      </details>
    </li>
  );
}

export function PeopleSection({ people }: { people: PersonRow[] }) {
  const { message, pending, run } = useAction();
  const [name, setName] = useState("");

  return (
    <div className="space-y-4">
      {people.length === 0 ? (
        <p className="text-sm text-neutral-500">Add the people you want to remember birthdays for or stay in touch with.</p>
      ) : (
        <ul className="divide-y divide-neutral-800">
          {people.map((p) => (
            <PersonCard key={p.id} person={p} />
          ))}
        </ul>
      )}
      <form
        className="flex gap-2 border-t border-neutral-800 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addPerson(name), () => setName(""));
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Add a person" aria-label="Add a person" className={inputClass} />
        <button type="submit" disabled={pending || !name.trim()} className={primary}>
          Add
        </button>
      </form>
      {message && <p className="text-sm text-neutral-400">{message}</p>}
    </div>
  );
}

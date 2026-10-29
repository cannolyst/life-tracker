"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type { TodayDone, TodayTodo } from "@/db/todayBoard";
import { addPlanTask, completePlanTask } from "../plan/actions";
import { logRepeatableCompletion, toggleTaskCompletion } from "../points/actions";

const SHOW = 8;

// Always-on capture across the top of the home page: Enter saves and keeps the
// cursor here for the next one, and "/" jumps to it from anywhere on the page.
export function CaptureBar({ done, left }: { done: number | null; left: number | null }) {
  const counts = done === null || left === null ? null : { done, left };
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = title.trim();
    if (!text) return;
    startTransition(async () => {
      const result = await addPlanTask({ title: text });
      setMessage(result.ok ? "Added to your Inbox." : result.error);
      if (result.ok) setTitle("");
      input.current?.focus();
    });
  }

  return (
    <form onSubmit={submit} aria-label="Capture" className="space-y-1">
      <div className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3">
        <span aria-hidden className="text-neutral-500">
          +
        </span>
        <input
          ref={input}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setMessage(null);
          }}
          maxLength={200}
          placeholder="Jot something down…"
          title="Press / anywhere on this page to start typing"
          aria-label="Capture something for later"
          className="min-h-11 w-full bg-transparent text-neutral-100 outline-none placeholder:text-neutral-500"
        />
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className="min-h-9 shrink-0 rounded-md bg-neutral-100 px-3 text-sm font-medium text-neutral-900 disabled:opacity-50"
        >
          Add
        </button>
        {counts && (
          <span className="hidden shrink-0 border-l border-neutral-800 pl-3 text-xs text-neutral-400 sm:block">
            {counts.done} done · {counts.left} to go
          </span>
        )}
      </div>
      {counts && (
        <p className="px-1 text-xs text-neutral-500 sm:hidden">
          {counts.done} done · {counts.left} to go today
        </p>
      )}
      {message && (
        <p role="status" className="px-1 text-xs text-neutral-500">
          {message}
        </p>
      )}
    </form>
  );
}

function Row({ item }: { item: TodayTodo }) {
  const [checked, setChecked] = useState(false);
  const [count, setCount] = useState(item.kind === "habit" ? item.count : 0);
  const [pending, startTransition] = useTransition();
  const repeatable = item.kind === "habit" && item.repeatable;

  const tick = () =>
    startTransition(async () => {
      if (item.kind === "task") {
        setChecked(true);
        await completePlanTask(item.id);
      } else if (item.repeatable) {
        setCount((c) => c + 1);
        await logRepeatableCompletion(item.id);
      } else {
        setChecked(true);
        await toggleTaskCompletion(item.id);
      }
    });

  return (
    <li className={`flex items-center gap-3 border-t border-neutral-800 py-1 first:border-t-0 ${checked ? "opacity-40" : ""}`}>
      <button
        type="button"
        onClick={tick}
        disabled={pending || checked}
        aria-label={repeatable ? `Log ${item.title}` : `Mark ${item.title} done`}
        className="flex h-11 w-11 shrink-0 items-center justify-center"
      >
        <span
          aria-hidden
          className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] ${
            checked ? "border-neutral-400 bg-neutral-400 text-neutral-900" : "border-neutral-500 text-transparent hover:text-neutral-400"
          }`}
        >
          {repeatable ? "+" : "✓"}
        </span>
      </button>
      <span className={`min-w-0 flex-1 text-sm ${checked ? "text-neutral-500 line-through" : "text-neutral-200"}`}>
        {item.kind === "task" && item.priority && <span aria-label="Priority">★ </span>}
        {item.title}
        <span className="ml-2 text-xs text-neutral-500">
          {item.kind === "task"
            ? item.minutes
              ? `${item.minutes} min`
              : ""
            : repeatable
              ? count > 0
                ? `×${count} today`
                : `+${item.points}`
              : `+${item.points}`}
        </span>
      </span>
    </li>
  );
}

// Everything due today in one place: planned tasks and habits, tick them off right here.
export function TodaysList({ items }: { items: TodayTodo[] }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? items : items.slice(0, SHOW);
  const left = items.filter((i) => !(i.kind === "habit" && i.repeatable)).length;

  return (
    <section aria-label="Today’s list" className="rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-3">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-neutral-200">Today’s list</h2>
        <span className="text-xs text-neutral-500">{left === 0 ? "All clear" : `${left} left`}</span>
      </div>
      {items.length === 0 ? (
        <p className="py-2 text-sm text-neutral-500">
          Nothing planned for today.{" "}
          <Link href="/plan" className="tap underline">
            Pick something on Plan
          </Link>
          .
        </p>
      ) : (
        <ul>
          {shown.map((item) => (
            <Row key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </ul>
      )}
      {items.length > SHOW && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="tap -ml-1 px-1 text-xs text-neutral-500 underline">
          {showAll ? "Show fewer" : `Show ${items.length - SHOW} more`}
        </button>
      )}
    </section>
  );
}

export function DoneToday({ items, points }: { items: TodayDone[]; points: number }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? items : items.slice(0, SHOW);

  return (
    <section aria-label="Done today" className="rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-3">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-neutral-200">Done today</h2>
        <span className="text-xs text-neutral-500">{points > 0 ? `+${points} points` : `${items.length} finished`}</span>
      </div>
      {items.length === 0 ? (
        <p className="py-2 text-sm text-neutral-500">Nothing yet. One small thing counts.</p>
      ) : (
        <ul className="space-y-1 py-1">
          {shown.map((d) => (
            <li key={d.key} className="flex items-center gap-2 text-sm text-neutral-400">
              <span aria-hidden className="text-neutral-500">
                ✓
              </span>
              <span className="min-w-0">
                {d.title}
                {d.detail && <span className="ml-2 text-xs text-neutral-500">{d.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {items.length > SHOW && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="tap -ml-1 px-1 text-xs text-neutral-500 underline">
          {showAll ? "Show fewer" : `Show ${items.length - SHOW} more`}
        </button>
      )}
    </section>
  );
}

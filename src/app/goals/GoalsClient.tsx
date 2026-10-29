"use client";

import { useState, useTransition } from "react";
import type { GoalView } from "@/db/goals";
import { EXTEND_CHOICES, KIND_BLURB, KIND_LABEL, type GoalKind } from "@/lib/goals";
import {
  activateGoal,
  addGoalNextAction,
  addMilestone,
  completeGoal,
  createGoal,
  extendGoal,
  moveGoalToSomeday,
  retireGoal,
  toggleMilestone,
} from "./actions";

const inputClass =
  "min-h-11 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 text-neutral-100 outline-none focus:border-neutral-500";
const labelClass = "text-xs text-neutral-500";
const primary = "min-h-11 shrink-0 rounded-md bg-neutral-100 px-4 font-medium text-neutral-900 disabled:opacity-60";
const small = "min-h-11 shrink-0 rounded-md border border-neutral-700 px-3 text-sm text-neutral-300 disabled:opacity-60";

function plusDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function useAction() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; note?: string }>, onOk?: (note?: string) => void) =>
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        setMessage(result.note ?? null);
        onOk?.(result.note);
      } else setMessage(result.error ?? "Something went wrong.");
    });
  return { message, pending, run };
}

/* ---------- one goal ---------- */

export function GoalCard({ goal }: { goal: GoalView }) {
  const { message, pending, run } = useAction();
  const [milestone, setMilestone] = useState("");
  const [step, setStep] = useState("");
  const [extend, setExtend] = useState("30");
  const percent = Math.round(goal.metrics.progress * 100);

  return (
    <li className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-4">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-base font-medium text-neutral-100">{goal.title}</p>
          <span className="shrink-0 rounded-full border border-neutral-700 px-2.5 py-0.5 text-xs text-neutral-400">
            {KIND_LABEL[goal.kind]}
          </span>
        </div>
        {goal.why && <p className="text-sm text-neutral-300">“{goal.why}”</p>}
        {goal.finishLine && <p className="text-sm text-neutral-400">Finish line: {goal.finishLine}</p>}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-neutral-300">{goal.metrics.detail}</span>
          <span className="shrink-0 text-xs text-neutral-500">
            {goal.deadlineReached ? "Deadline reached" : goal.metrics.paceLabel}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={`${goal.title} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-2 w-full overflow-hidden rounded-full bg-neutral-800"
        >
          <div className="h-full rounded-full bg-neutral-500" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-xs text-neutral-500">
          {goal.daysLeftLabel}
          {goal.neededPace ? ` · ${goal.neededPace}` : ""}
        </p>
      </div>

      {goal.deadlineReached && (
        <div className="space-y-2 rounded-md border border-neutral-700 p-3">
          <p className="text-sm text-neutral-200">The deadline has come. How did it go?</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={pending} onClick={() => run(() => completeGoal(goal.id))} className={primary}>
              It&apos;s done
            </button>
            <span className="flex items-center gap-2">
              <select
                aria-label="Extend by"
                value={extend}
                onChange={(e) => setExtend(e.target.value)}
                className="min-h-11 rounded-md border border-neutral-700 bg-neutral-800 px-2 text-sm text-neutral-200"
              >
                {EXTEND_CHOICES.map((d) => (
                  <option key={d} value={d}>
                    {d} days
                  </option>
                ))}
              </select>
              <button type="button" disabled={pending} onClick={() => run(() => extendGoal(goal.id, Number(extend)))} className={small}>
                Extend
              </button>
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() => confirm(`Retire “${goal.title}”? There's no penalty.`) && run(() => retireGoal(goal.id))}
              className={small}
            >
              Retire it
            </button>
          </div>
        </div>
      )}

      {goal.milestones.length > 0 && (
        <ul className="divide-y divide-neutral-800">
          {goal.milestones.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                disabled={pending}
                aria-pressed={m.done}
                onClick={() => run(() => toggleMilestone(m.id))}
                className={`flex min-h-11 w-full items-center gap-3 text-left text-sm ${m.done ? "text-neutral-500 line-through" : "text-neutral-200"}`}
              >
                <span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-neutral-600 text-xs">
                  {m.done ? "✓" : ""}
                </span>
                {m.title}
              </button>
            </li>
          ))}
        </ul>
      )}

      {goal.kind === "finish" && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => addMilestone(goal.id, milestone), () => setMilestone(""));
          }}
        >
          <input value={milestone} onChange={(e) => setMilestone(e.target.value)} maxLength={150} placeholder="Add a milestone" aria-label="Add a milestone" className={inputClass} />
          <button type="submit" disabled={pending || !milestone.trim()} className={small}>
            Add
          </button>
        </form>
      )}

      <div className="space-y-2">
        <p className={labelClass}>Next steps</p>
        {goal.openTasks.length > 0 ? (
          <ul className="space-y-1">
            {goal.openTasks.map((t) => (
              <li key={t.id} className="text-sm text-neutral-300">
                {t.title}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">Nothing queued. Add the next small step and it becomes a card.</p>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => addGoalNextAction(goal.id, step), () => setStep(""));
          }}
        >
          <input value={step} onChange={(e) => setStep(e.target.value)} maxLength={200} placeholder="Next step" aria-label="Next step" className={inputClass} />
          <button type="submit" disabled={pending || !step.trim()} className={small}>
            Add
          </button>
        </form>
      </div>

      {message && <p className="text-sm text-neutral-400">{message}</p>}

      {!goal.deadlineReached && (
        <div className="flex flex-wrap gap-2 border-t border-neutral-800 pt-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => confirm(`Mark “${goal.title}” as done?`) && run(() => completeGoal(goal.id))}
            className={small}
          >
            Mark done
          </button>
          <button type="button" disabled={pending} onClick={() => run(() => moveGoalToSomeday(goal.id))} className={small}>
            Pause (Someday)
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => confirm(`Retire “${goal.title}”? There's no penalty.`) && run(() => retireGoal(goal.id))}
            className={small}
          >
            Retire
          </button>
        </div>
      )}
    </li>
  );
}

/* ---------- Someday goals ---------- */

export function SomedayGoal({ goal, canActivate }: { goal: GoalView; canActivate: boolean }) {
  const { message, pending, run } = useAction();
  return (
    <li className="space-y-2 py-3">
      <p className="text-sm text-neutral-200">
        {goal.title}
        <span className="block text-xs text-neutral-500">
          {KIND_LABEL[goal.kind]}
          {goal.why ? ` · “${goal.why}”` : ""}
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending || !canActivate} onClick={() => run(() => activateGoal(goal.id))} className={small}>
          {canActivate ? "Make it active" : "Three goals are active"}
        </button>
        <button type="button" disabled={pending} onClick={() => confirm(`Retire “${goal.title}”?`) && run(() => retireGoal(goal.id))} className={small}>
          Retire
        </button>
      </div>
      {message && <p className="text-xs text-neutral-500">{message}</p>}
    </li>
  );
}

/* ---------- new goal ---------- */

export function NewGoalForm({
  todayKey,
  habits,
  activeCount,
}: {
  todayKey: string;
  habits: { id: string; name: string }[];
  activeCount: number;
}) {
  const { message, pending, run } = useAction();
  const [kind, setKind] = useState<GoalKind>("finish");
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [finishLine, setFinishLine] = useState("");
  const [weekly, setWeekly] = useState("3");
  const [deadline, setDeadline] = useState(plusDays(todayKey, 90));
  const [area, setArea] = useState("learning");
  const [linkWorkouts, setLinkWorkouts] = useState(false);
  const [habitIds, setHabitIds] = useState<string[]>([]);
  const [milestones, setMilestones] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [open, setOpen] = useState(false);

  function reset() {
    setTitle("");
    setWhy("");
    setFinishLine("");
    setMilestones("");
    setNextAction("");
    setHabitIds([]);
    setLinkWorkouts(false);
  }

  return (
    <details open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)} className="rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-2">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-medium text-neutral-200">
        New goal
        <span className="text-xs font-normal text-neutral-500">
          {activeCount >= 3 ? "will wait in Someday" : `${3 - activeCount} of 3 slots open`}
        </span>
      </summary>
      <form
        className="space-y-3 pb-3 pt-1"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () =>
              createGoal({
                title,
                why,
                kind,
                finishLine,
                weeklyTarget: kind === "rhythm" ? Number(weekly) : null,
                deadline,
                area,
                linkWorkouts,
                habitIds,
                milestones: milestones.split("\n"),
                nextAction,
              }),
            () => {
              reset();
              setOpen(false);
            },
          );
        }}
      >
        <fieldset className="space-y-2">
          <legend className={labelClass}>What kind of goal?</legend>
          <div className="grid grid-cols-3 gap-2">
            {(["finish", "rhythm", "ongoing"] as GoalKind[]).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={`min-h-11 rounded-md border px-2 text-sm ${kind === k ? "border-neutral-100 bg-neutral-100 text-neutral-900" : "border-neutral-700 text-neutral-300"}`}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-500">{KIND_BLURB[kind]}</p>
        </fieldset>

        <label className="block space-y-1">
          <span className={labelClass}>The goal, in a line</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={inputClass} />
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>Why it matters (one line)</span>
          <input value={why} onChange={(e) => setWhy(e.target.value)} maxLength={200} className={inputClass} />
        </label>

        {kind === "finish" && (
          <label className="block space-y-1">
            <span className={labelClass}>Finish line — what does done look like?</span>
            <input value={finishLine} onChange={(e) => setFinishLine(e.target.value)} maxLength={200} className={inputClass} />
          </label>
        )}
        {kind === "rhythm" && (
          <label className="block space-y-1">
            <span className={labelClass}>Times per week</span>
            <input value={weekly} onChange={(e) => setWeekly(e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" className={inputClass} />
          </label>
        )}

        <div className="space-y-2">
          <label className="block space-y-1">
            <span className={labelClass}>{kind === "ongoing" ? "Review date" : "Deadline"} (a month to a year out)</span>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} />
          </label>
          <div className="flex flex-wrap gap-2">
            {[30, 60, 90, 180, 365].map((d) => (
              <button key={d} type="button" onClick={() => setDeadline(plusDays(todayKey, d))} className={small}>
                {d} days
              </button>
            ))}
          </div>
        </div>

        {kind === "finish" && (
          <label className="block space-y-1">
            <span className={labelClass}>Milestones, one per line (optional)</span>
            <textarea value={milestones} onChange={(e) => setMilestones(e.target.value)} rows={3} className={`${inputClass} py-2`} />
          </label>
        )}

        <fieldset className="space-y-1">
          <legend className={labelClass}>What counts toward it? (progress tracks itself)</legend>
          <label className="flex min-h-11 items-center gap-3 text-sm text-neutral-300">
            <input type="checkbox" checked={linkWorkouts} onChange={(e) => setLinkWorkouts(e.target.checked)} className="h-4 w-4" />
            Logged workouts
          </label>
          {habits.map((h) => (
            <label key={h.id} className="flex min-h-11 items-center gap-3 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={habitIds.includes(h.id)}
                onChange={(e) => setHabitIds((prev) => (e.target.checked ? [...prev, h.id] : prev.filter((id) => id !== h.id)))}
                className="h-4 w-4"
              />
              {h.name}
            </label>
          ))}
          <p className="text-xs text-neutral-500">Tasks you tag to this goal count too.</p>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className={labelClass}>Its tasks go in</span>
            <select value={area} onChange={(e) => setArea(e.target.value)} className={inputClass}>
              <option value="learning">Learning</option>
              <option value="body">Body</option>
              <option value="home">Home</option>
            </select>
          </label>
        </div>
        <label className="block space-y-1">
          <span className={labelClass}>The very next step (becomes a card)</span>
          <input value={nextAction} onChange={(e) => setNextAction(e.target.value)} maxLength={200} className={inputClass} />
        </label>

        {message && <p className="text-sm text-neutral-400">{message}</p>}
        <button type="submit" disabled={pending || !title.trim()} className={primary}>
          {pending ? "Adding..." : "Add goal"}
        </button>
      </form>
    </details>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { requireUserId } from "@/lib/session";
import { getUserSettings } from "@/db/userSettings";
import { getPointsSummary } from "@/db/queries";
import { getCollectionChoices, getPlanTasks } from "@/db/planning";
import { getGroceryList, getMarkedOutDates, getResetState, getWeekLookBack } from "@/db/reset";
import { getCalendarEvents } from "@/lib/calendarService";
import { isFeatureOn } from "@/lib/features";
import { addDays, weekdayLong } from "@/lib/dashboard";
import { dateKeyIn } from "@/lib/timezone";
import {
  RESET_POINTS,
  buildLookAhead,
  resetWeekKey,
  staleTasks,
  suggestAssignments,
  suggestHighlight,
  summarizeWeek,
} from "@/lib/reset";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui";
import {
  AssignEvenings,
  ClearDecks,
  FinishReset,
  Groceries,
  HighlightForm,
  type AssignableTask,
  type EveningOption,
} from "./ResetClient";

export const dynamic = "force-dynamic";

function Step({ number, title, summary, open, children }: { number: number; title: string; summary: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-2">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3">
        <span className="text-sm font-medium text-neutral-200">
          {number}. {title}
        </span>
        <span className="text-xs text-neutral-500">{summary}</span>
      </summary>
      <div className="space-y-3 pb-4 pt-1">{children}</div>
    </details>
  );
}

function ageLabel(date: Date, nowMs: number): string {
  const weeks = Math.max(1, Math.round((nowMs - date.getTime()) / (7 * 86_400_000)));
  return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}

export default async function ResetPage() {
  const userId = await requireUserId();
  const settings = await getUserSettings(userId);
  const tz = settings.timezone;
  const todayKey = dateKeyIn(tz);
  const weekKey = resetWeekKey(todayKey);
  const nowMs = new Date().getTime();

  if (!isFeatureOn(settings.features, "dashboard")) {
    return (
      <div className="flex min-h-full flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
          <h1 className="text-xl font-semibold">Sunday reset</h1>
          <Card>
            <p className="text-sm text-neutral-400">
              The Sunday reset is part of the home dashboard, which is switched off.{" "}
              <Link href="/settings" className="underline">
                Turn it on in Settings
              </Link>
              .
            </p>
          </Card>
        </main>
      </div>
    );
  }

  const calendarOn = isFeatureOn(settings.features, "calendar");
  const [state, lookBack, summary, tasks, collections, grocery, markedOut, calendar] = await Promise.all([
    getResetState(userId, weekKey),
    getWeekLookBack(userId, todayKey),
    getPointsSummary(userId),
    getPlanTasks(userId),
    getCollectionChoices(userId),
    getGroceryList(userId),
    getMarkedOutDates(userId, todayKey, addDays(todayKey, 6)),
    calendarOn ? getCalendarEvents(userId, { days: 7 }) : Promise.resolve(null),
  ]);

  const week = summarizeWeek(lookBack.rows, todayKey);
  const suggestion = suggestHighlight({ finished: lookBack.finished, best: week.best });

  const days = buildLookAhead({
    todayKey,
    events: calendar && calendar.status === "ok" ? calendar.events : [],
    markedOut,
    tz,
  });
  const open = tasks.filter((t) => t.status === "open");
  const openEveningKeys = days.filter((d) => d.openEvening).map((d) => d.dateKey);
  const suggestions = suggestAssignments(open, openEveningKeys);
  const evenings: EveningOption[] = days
    .filter((d) => d.openEvening)
    .map((d) => ({
      dateKey: d.dateKey,
      label: d.label,
      assignedId: open.find((t) => t.plannedFor === d.dateKey)?.id ?? null,
      suggestedId: suggestions[d.dateKey] ?? null,
    }));
  const assignable: AssignableTask[] = open
    .filter((t) => t.plannedFor === null || openEveningKeys.includes(t.plannedFor))
    .sort((a, b) => (b.minutes ?? 0) - (a.minutes ?? 0))
    .map((t) => ({ id: t.id, title: t.title, minutes: t.minutes }));

  const inbox = open.filter((t) => t.bucket === "inbox" && t.plannedFor === null).map((t) => ({ id: t.id, title: t.title }));
  const someday = tasks.filter((t) => t.status === "someday").map((t) => ({ id: t.id, title: t.title }));
  const stale = staleTasks(open, nowMs).map((t) => ({
    id: t.id,
    title: t.title,
    age: ageLabel(t.reviewedAt ?? t.createdAt, nowMs),
  }));

  const outCount = days.filter((d) => d.outTonight).length;

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 pb-24 pt-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Sunday reset</h1>
          <p className="text-sm text-neutral-500">
            About ten minutes to close the week and set up the next. Skip anything you like.
          </p>
        </div>

        <Step number={1} title="Look back" summary={`${week.total} points`} open={!state.completed}>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-neutral-500">Points</p>
              <p className="text-2xl font-semibold">{week.total}</p>
            </div>
            <div>
              <p className="text-neutral-500">Active days</p>
              <p className="text-2xl font-semibold">{week.activeDays}/7</p>
            </div>
            <div>
              <p className="text-neutral-500">Streak</p>
              <p className="text-2xl font-semibold">{summary.streak > 0 ? `${summary.streak}d` : "—"}</p>
            </div>
          </div>
          {week.best && (
            <p className="text-sm text-neutral-400">
              Best day: {weekdayLong(week.best.dateKey)} with {week.best.points} points.
            </p>
          )}
          {lookBack.finished.length > 0 && (
            <p className="text-sm text-neutral-400">
              Tasks you finished: {lookBack.finished.length}.
            </p>
          )}
          <HighlightForm initial={state.highlight} suggestion={suggestion} />
        </Step>

        <Step number={2} title="Look ahead" summary={outCount > 0 ? `${outCount} out, ${7 - outCount} open` : "7 evenings open"}>
          {!calendarOn && (
            <p className="text-sm text-neutral-500">
              Turn on Calendar in Settings to see your events here. Nights you marked “Out tonight” still show.
            </p>
          )}
          <ul className="space-y-3">
            {days.map((day) => (
              <li key={day.dateKey} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-neutral-200">{day.label}</p>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs ${
                      day.outTonight ? "border-neutral-600 text-neutral-300" : "border-neutral-800 text-neutral-500"
                    }`}
                  >
                    {day.outTonight ? "Out tonight" : "Open evening"}
                  </span>
                </div>
                {day.events.length > 0 && (
                  <ul className="space-y-0.5">
                    {day.events.map((event, i) => (
                      <li key={i} className="text-sm text-neutral-400">
                        {event.time && <span className="mr-2 text-xs text-neutral-500">{event.time}</span>}
                        {event.title}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </Step>

        <Step number={3} title="Plan the week" summary={`${evenings.length} open ${evenings.length === 1 ? "evening" : "evenings"}`}>
          <p className="text-sm text-neutral-400">Give your bigger tasks a home on an open evening. Leave the rest open.</p>
          <AssignEvenings evenings={evenings} tasks={assignable} />
        </Step>

        <Step number={4} title="Groceries" summary={grocery ? `${grocery.items.length} on the list` : "No list yet"}>
          <Groceries listName={grocery?.name ?? null} items={grocery?.items ?? []} hasList={grocery !== null} />
        </Step>

        <Step
          number={5}
          title="Clear the decks"
          summary={`${inbox.length} in Inbox · ${someday.length} Someday`}
        >
          <ClearDecks inbox={inbox} someday={someday} stale={stale} collections={collections} />
        </Step>

        <FinishReset completed={state.completed} points={RESET_POINTS} />
      </main>
    </div>
  );
}

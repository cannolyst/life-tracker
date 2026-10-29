import type { CalendarEvent } from "./calendarParse";
import { addDays, clockLabel, eventOnDay, weekdayLong } from "./dashboard";

// The Sunday reset (about ten minutes): look back, look ahead, plan the week,
// groceries, clear the decks. Everything here is pure; the page loads the data.

export const RESET_POINTS = 5;
/** An open, unplanned task untouched this long is "stale" and gets a gentle review. */
export const STALE_DAYS = 21;
export const BIG_TASK_MINUTES = 30;

function weekdayIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
}

export function isSunday(dateKey: string): boolean {
  return weekdayIndex(dateKey) === 0;
}

/** The first Sunday of a month (day 1–7): the reset runs about ten minutes longer. */
export function isFirstSundayOfMonth(dateKey: string): boolean {
  return isSunday(dateKey) && Number(dateKey.slice(8, 10)) <= 7;
}

/** The Sunday on or before a day: the week the reset belongs to (weeks run Sun–Sat). */
export function resetWeekKey(todayKey: string): string {
  return addDays(todayKey, -weekdayIndex(todayKey));
}

/* ---------- look back ---------- */

export type WeekSummary = {
  total: number;
  activeDays: number;
  best: { dateKey: string; points: number } | null;
};

/** The seven days before today, newest excluded of today itself: Sunday's reset reviews the week just ended. */
export function summarizeWeek(rows: { date: string; points: number }[], todayKey: string): WeekSummary {
  const start = addDays(todayKey, -7);
  const byDay = new Map<string, number>();
  for (const row of rows) {
    if (row.date >= start && row.date < todayKey) byDay.set(row.date, (byDay.get(row.date) ?? 0) + row.points);
  }
  let best: WeekSummary["best"] = null;
  let total = 0;
  for (const [dateKey, points] of byDay) {
    total += points;
    if (points > 0 && (best === null || points > best.points)) best = { dateKey, points };
  }
  return { total, activeDays: [...byDay.values()].filter((p) => p > 0).length, best };
}

/** A starting point for the one highlight — the biggest finished task, else the best day. Always editable. */
export function suggestHighlight(opts: {
  finished: { title: string; minutes: number | null }[];
  best: WeekSummary["best"];
}): string {
  const biggest = [...opts.finished].sort((a, b) => (b.minutes ?? 0) - (a.minutes ?? 0))[0];
  if (biggest) return `Finished: ${biggest.title}`;
  if (opts.best) return `Best day: ${weekdayLong(opts.best.dateKey)}, ${opts.best.points} points`;
  return "";
}

/* ---------- look ahead and plan ---------- */

export type LookAheadDay = {
  dateKey: string;
  label: string;
  events: { title: string; time: string | null; allDay: boolean }[];
  /** An evening plan exists (a calendar event, or the user marked the night out). */
  outTonight: boolean;
  outReason: "calendar" | "marked" | null;
  openEvening: boolean;
};

export function buildLookAhead(opts: {
  todayKey: string;
  days?: number;
  events: CalendarEvent[];
  markedOut: ReadonlySet<string>;
  tz: string;
}): LookAheadDay[] {
  const days = opts.days ?? 7;
  const out: LookAheadDay[] = [];
  for (let i = 0; i < days; i++) {
    const dateKey = addDays(opts.todayKey, i);
    const dayEvents = opts.events.filter((e) => eventOnDay(e, dateKey, opts.tz));
    const evening = dayEvents.some((e) => !e.allDay && e.isEvening);
    // An explicit "not out" the user chose is stored as a day flag too, but only
    // dates marked out reach here, so a marked night is always an out night.
    const marked = opts.markedOut.has(dateKey);
    const outTonight = evening || marked;
    out.push({
      dateKey,
      label: i === 0 ? "Today" : weekdayLong(dateKey),
      events: dayEvents.map((e) => ({
        title: e.title,
        time: e.allDay ? null : clockLabel(e.start, opts.tz),
        allDay: e.allDay,
      })),
      outTonight,
      outReason: evening ? "calendar" : marked ? "marked" : null,
      openEvening: !outTonight,
    });
  }
  return out;
}

type Plannable = { id: string; title: string; minutes: number | null; status: string; plannedFor: string | null };

/** Big open tasks (30+ minutes), biggest first, one per open evening. A suggestion only — each can be changed. */
export function suggestAssignments<T extends Plannable>(tasks: T[], openEveningKeys: string[]): Record<string, string> {
  const big = tasks
    .filter((t) => t.status === "open" && t.plannedFor === null && (t.minutes ?? 0) >= BIG_TASK_MINUTES)
    .sort((a, b) => (b.minutes ?? 0) - (a.minutes ?? 0));
  const picks: Record<string, string> = {};
  openEveningKeys.forEach((dateKey, i) => {
    if (big[i]) picks[dateKey] = big[i].id;
  });
  return picks;
}

/* ---------- clear the decks ---------- */

type Reviewable = { status: string; plannedFor: string | null; createdAt: Date; reviewedAt: Date | null };

export function staleTasks<T extends Reviewable>(tasks: T[], nowMs: number): T[] {
  const cutoff = nowMs - STALE_DAYS * 86_400_000;
  return tasks.filter(
    (t) => t.status === "open" && t.plannedFor === null && (t.reviewedAt ?? t.createdAt).getTime() < cutoff,
  );
}

/* ---------- monthly review: points by area ---------- */

export type AreaTrend = {
  area: string;
  current: number;
  previous: number;
  delta: number;
  direction: "up" | "down" | "same";
};

/** This stretch against the one before it, biggest areas first. An area in only one of them still shows. */
export function compareAreas(current: ReadonlyMap<string, number>, previous: ReadonlyMap<string, number>): AreaTrend[] {
  const areas = new Set([...current.keys(), ...previous.keys()]);
  return [...areas]
    .map((area) => {
      const now = current.get(area) ?? 0;
      const before = previous.get(area) ?? 0;
      const delta = now - before;
      return { area, current: now, previous: before, delta, direction: delta > 0 ? "up" : delta < 0 ? "down" : "same" } as AreaTrend;
    })
    .filter((a) => a.current > 0 || a.previous > 0)
    .sort((a, b) => b.current - a.current || b.previous - a.previous || a.area.localeCompare(b.area));
}

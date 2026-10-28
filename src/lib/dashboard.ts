import type { CalendarEvent } from "./calendarParse";
import { currentBlock, dayBlocks, formatMinutes, type BlockId, type DayBlock } from "./dayBlocks";
import { minutesIntoDayIn, zonedParts } from "./timezone";
import type { DayStructure } from "./userSettingsDefaults";

// Everything here is pure: the dashboard page loads the data, these turn it
// into the calm, short wording the screen shows.

/* ---------- small helpers ---------- */

export function clockLabel(iso: string, tz: string): string {
  return new Date(iso)
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz })
    .toLowerCase();
}

function dayKeyOf(iso: string, tz: string): string {
  const p = zonedParts(tz, new Date(iso));
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function weekdayLong(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

function shorten(text: string, max = 28): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/** Does a calendar event touch the given local day? (All-day events span their whole days.) */
export function eventOnDay(event: CalendarEvent, dateKey: string, tz: string): boolean {
  const startKey = dayKeyOf(event.start, tz);
  if (!event.allDay) return startKey === dateKey;
  // All-day `end` is local midnight of the day *after* the last day.
  const endKey = dayKeyOf(event.end, tz);
  return startKey <= dateKey && dateKey < endKey;
}

/* ---------- greeting ---------- */

export function greetingWord(minutes: number): string {
  if (minutes < 12 * 60) return "Morning";
  if (minutes < 17 * 60) return "Afternoon";
  return "Evening";
}

export function buildGreeting(opts: {
  name: string | null;
  minutes: number;
  weekday: string;
  highlights: string[];
}): string {
  const who = opts.name ? `${greetingWord(opts.minutes)}, ${opts.name}.` : `${greetingWord(opts.minutes)}.`;
  const highlights = opts.highlights.slice(0, 2);
  const rest = highlights.length > 0 ? highlights.join(", ") : "nothing pressing";
  return `${who} ${opts.weekday}: ${rest}.`;
}

export function greetingHighlights(opts: {
  workoutName: string | null;
  todayEvents: CalendarEvent[];
  nowMinutes: number;
  onDeckCount: number;
  tz: string;
}): string[] {
  const out: string[] = [];
  if (opts.workoutName) out.push(`${shorten(opts.workoutName, 18)} day`);

  const timed = opts.todayEvents.filter((e) => !e.allDay);
  const evening = timed.find((e) => e.isEvening);
  const next = timed.find((e) => minutesIntoDayIn(opts.tz, new Date(e.start)) >= opts.nowMinutes);
  if (evening) out.push(`${shorten(evening.title)} tonight`);
  else if (next) out.push(`${shorten(next.title)} at ${clockLabel(next.start, opts.tz)}`);

  if (out.length === 0 && opts.onDeckCount > 0) {
    out.push(`${opts.onDeckCount} ${plural(opts.onDeckCount, "thing", "things")} on deck`);
  }
  return out;
}

/* ---------- Now card ---------- */

export type NowInput = {
  structure: DayStructure;
  minutes: number;
  /** First daily habit not yet done today. */
  habit: { name: string; points: number } | null;
  /** The most due cleaning task not yet done today. */
  cleaning: { name: string; overdue: boolean } | null;
  /** First weekly task not yet done this week. */
  weekly: { name: string } | null;
  /** The next workout day this week that hasn't been logged. */
  workout: { dayName: string } | null;
  /** How many things were finished today. */
  doneToday: number;
};

export type NowCard = {
  eyebrow: string;
  title: string;
  detail?: string;
  href?: string;
  cta?: string;
};

type Candidate = { title: string; detail?: string; href: string; cta: string };

function candidates(input: NowInput, order: ("workout" | "habit" | "cleaning" | "weekly")[]): Candidate[] {
  const list: Candidate[] = [];
  for (const kind of order) {
    if (kind === "workout" && input.workout) {
      list.push({ title: input.workout.dayName, detail: "Your workout for the day.", href: "/exercise", cta: "Open workout" });
    } else if (kind === "habit" && input.habit) {
      list.push({
        title: input.habit.name,
        detail: `+${input.habit.points} ${plural(input.habit.points, "point", "points")}`,
        href: "/points",
        cta: "Open Points",
      });
    } else if (kind === "cleaning" && input.cleaning) {
      list.push({
        title: input.cleaning.name,
        detail: input.cleaning.overdue ? "Ready whenever you are." : "Due today.",
        href: "/cleaning",
        cta: "Open Cleaning",
      });
    } else if (kind === "weekly" && input.weekly) {
      list.push({ title: input.weekly.name, detail: "This week's task.", href: "/points", cta: "Open Points" });
    }
  }
  return list;
}

/** The single next action for the current part of the day. */
export function buildNowCard(input: NowInput): NowCard {
  const block = currentBlock(input.structure, input.minutes);
  const eyebrow = block ? `Now · ${block.label}` : "Now";

  if (!block) {
    return { eyebrow, title: "It's early", detail: "Rest is part of the plan. Launch begins at " + formatMinutes(input.structure.launchStartMinutes) + "." };
  }

  const pick = (order: ("workout" | "habit" | "cleaning" | "weekly")[]): NowCard | null => {
    const first = candidates(input, order)[0];
    return first ? { eyebrow, ...first } : null;
  };

  switch (block.id as BlockId) {
    case "launch":
      return (
        pick(["workout", "habit", "weekly"]) ?? {
          eyebrow,
          title: "Launch is covered",
          detail: "Nothing waiting this morning. Ease into the day.",
        }
      );
    case "work":
      return {
        eyebrow,
        title: "Work time",
        detail: `Nothing needed from you here. Your next open window starts at ${formatMinutes(input.structure.workEndMinutes)}.`,
      };
    case "transition": {
      const easy = candidates(input, ["habit", "cleaning"])[0];
      return {
        eyebrow,
        title: "Take a breather",
        detail: easy
          ? `Rest first. When you're ready, one easy thing: ${easy.title}.`
          : "Rest first. Nothing is waiting.",
        ...(easy ? { href: easy.href, cta: easy.cta } : {}),
      };
    }
    case "evening":
      return (
        pick(["cleaning", "habit", "weekly", "workout"]) ?? {
          eyebrow,
          title: "Nothing left on your list",
          detail: "Enjoy the evening.",
        }
      );
    case "shutdown": {
      const small = candidates(input, ["habit", "cleaning"])[0];
      if (small) {
        return {
          eyebrow,
          title: `One small thing before bed: ${small.title}`,
          detail: "Or let it wait — tomorrow is fine too.",
          href: small.href,
          cta: small.cta,
        };
      }
      return {
        eyebrow,
        title: "Wind down",
        detail:
          input.doneToday > 0
            ? `${input.doneToday} ${plural(input.doneToday, "thing", "things")} done today. That counts.`
            : "Rest up. Tomorrow starts fresh.",
      };
    }
  }
}

/* ---------- Today timeline ---------- */

export type TimelineRow = {
  key: string;
  kind: "block" | "event";
  title: string;
  /** "8:00 am – 4:00 pm" for blocks, "6:30 pm" for events. */
  when: string;
  startMinutes: number;
  state: "past" | "now" | "later";
  isEvening?: boolean;
};

export type Timeline = { allDay: string[]; rows: TimelineRow[] };

export function buildTimeline(opts: {
  structure: DayStructure;
  nowMinutes: number;
  todayKey: string;
  events: CalendarEvent[];
  tz: string;
}): Timeline {
  const { structure, nowMinutes, todayKey, events, tz } = opts;
  const rows: TimelineRow[] = [];

  for (const block of dayBlocks(structure)) {
    rows.push({
      key: `block-${block.id}`,
      kind: "block",
      title: block.label,
      when: `${formatMinutes(block.startMinutes)} – ${block.endMinutes >= 1440 ? "bedtime" : formatMinutes(block.endMinutes)}`,
      startMinutes: block.startMinutes,
      state: stateOf(block, nowMinutes),
    });
  }

  const allDay: string[] = [];
  events.forEach((event, i) => {
    if (!eventOnDay(event, todayKey, tz)) return;
    if (event.allDay) {
      allDay.push(event.title);
      return;
    }
    const start = minutesIntoDayIn(tz, new Date(event.start));
    const end = minutesIntoDayIn(tz, new Date(event.end));
    const endMinutes = end > start ? end : start + 1;
    rows.push({
      key: `event-${i}`,
      kind: "event",
      title: event.title,
      when: clockLabel(event.start, tz),
      startMinutes: start,
      state: nowMinutes >= endMinutes ? "past" : nowMinutes >= start ? "now" : "later",
      isEvening: event.isEvening,
    });
  });

  // Events sort ahead of a block that starts at the same minute so they read as inside it.
  rows.sort((a, b) => a.startMinutes - b.startMinutes || (a.kind === b.kind ? 0 : a.kind === "event" ? 1 : -1));
  return { allDay, rows };
}

function stateOf(block: DayBlock, nowMinutes: number): TimelineRow["state"] {
  if (nowMinutes >= block.endMinutes) return "past";
  if (nowMinutes >= block.startMinutes) return "now";
  return "later";
}

/* ---------- Coming up ---------- */

export type ComingUpItem = {
  kind: "event" | "bill" | "cleaning";
  title: string;
  time?: string;
  prep?: string;
};

export type ComingUpDay = { dateKey: string; label: string; items: ComingUpItem[]; more: number };

export type UpcomingBill = { name: string; dueDay: number; amount: number };
export type UpcomingCleaning = { name: string; dueKey: string };

const MAX_ITEMS_PER_DAY = 4;

function daysInMonthOf(dateKey: string): number {
  const [y, m] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** A bill due on the 31st falls on the last day of shorter months. */
export function billDueOn(dueDay: number, dateKey: string): boolean {
  const day = Number(dateKey.slice(8, 10));
  return day === Math.min(dueDay, daysInMonthOf(dateKey));
}

export function formatDollars(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function buildComingUp(opts: {
  todayKey: string;
  days?: number;
  structure: DayStructure;
  events: CalendarEvent[];
  bills: UpcomingBill[];
  cleaning: UpcomingCleaning[];
  tz: string;
}): ComingUpDay[] {
  const { todayKey, structure, events, bills, cleaning, tz } = opts;
  const days = opts.days ?? 4;
  const out: ComingUpDay[] = [];

  for (let i = 1; i <= days; i++) {
    const dateKey = addDays(todayKey, i);
    const items: ComingUpItem[] = [];

    for (const event of events) {
      if (!eventOnDay(event, dateKey, tz)) continue;
      if (event.allDay) {
        items.push({ kind: "event", title: event.title });
        continue;
      }
      const start = minutesIntoDayIn(tz, new Date(event.start));
      items.push({
        kind: "event",
        title: event.title,
        time: clockLabel(event.start, tz),
        prep:
          start < structure.workStartMinutes
            ? "Early start — set things out the night before."
            : event.isEvening
              ? "Evening plans — keep that day's list light."
              : undefined,
      });
    }
    for (const bill of bills) {
      if (billDueOn(bill.dueDay, dateKey)) {
        items.push({
          kind: "bill",
          title: `${bill.name} due · ${formatDollars(bill.amount)}`,
          prep: "Worth paying ahead if you can.",
        });
      }
    }
    for (const task of cleaning) {
      if (task.dueKey === dateKey) items.push({ kind: "cleaning", title: task.name });
    }

    if (items.length === 0) continue;
    out.push({
      dateKey,
      label: i === 1 ? "Tomorrow" : weekdayLong(dateKey),
      items: items.slice(0, MAX_ITEMS_PER_DAY),
      more: Math.max(0, items.length - MAX_ITEMS_PER_DAY),
    });
  }
  return out;
}

/* ---------- Flags ---------- */

export type Flag = { key: string; text: string; href: string };

export const MAX_FLAGS = 3;

export function buildFlags(opts: {
  streak: number;
  habitDoneToday: boolean;
  minutes: number;
  structure: DayStructure;
  /** Unpaid bills with a due day, as days from today (0 = today). */
  bills: { name: string; daysUntil: number }[];
}): Flag[] {
  const flags: Flag[] = [];

  const urgent = opts.bills.filter((b) => b.daysUntil >= 0 && b.daysUntil <= 2).sort((a, b) => a.daysUntil - b.daysUntil);
  for (const bill of urgent) {
    const when = bill.daysUntil === 0 ? "today" : bill.daysUntil === 1 ? "tomorrow" : "in 2 days";
    flags.push({ key: `bill-${bill.name}`, text: `${bill.name} is due ${when}.`, href: "/finance" });
  }

  if (opts.streak >= 2 && !opts.habitDoneToday && opts.minutes >= opts.structure.workEndMinutes) {
    flags.push({
      key: "streak",
      text: `Your ${opts.streak}-day streak is waiting on one habit today.`,
      href: "/points",
    });
  }

  return flags.slice(0, MAX_FLAGS);
}

/* ---------- "On deck" count ---------- */

export function onDeckCount(input: { habitsLeft: number; cleaningDue: number; weeklyLeft: number }): number {
  return input.habitsLeft + input.cleaningDue + input.weeklyLeft;
}

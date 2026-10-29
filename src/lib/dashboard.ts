import type { CalendarEvent } from "./calendarParse";
import { currentBlock, dayBlocks, formatMinutes, type BlockId, type DayBlock } from "./dayBlocks";
import { inLunchWindow } from "./planning";
import { BIRTHDAY_COMING_UP_DAYS, MANUAL_CHARGE_FLAG_DAYS, TRIAL_FLAG_DAYS } from "./lifeAdmin";
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

/* ---------- habits by block ---------- */

export type HabitCandidate = { name: string; points: number; block: string | null; repeatable: boolean };

/**
 * The habit to suggest for the current block: one assigned to this block comes
 * first; otherwise an unassigned once-a-day habit (as before blocks existed).
 * A habit assigned to a different block, or an unassigned repeatable one like
 * "drink water", is never pushed on the Now card.
 */
export function habitForBlock(
  candidates: HabitCandidate[],
  blockId: string | null,
): { name: string; points: number } | null {
  const mine = blockId ? candidates.find((h) => h.block === blockId) : undefined;
  const pick = mine ?? candidates.find((h) => h.block === null && !h.repeatable);
  return pick ? { name: pick.name, points: pick.points } : null;
}

/* ---------- Now card ---------- */

export type TaskPick = {
  id: string;
  title: string;
  easier?: boolean;
  /** The first step, spelled out, for the 5-minute Start. */
  firstStep?: string;
  minutes?: number | null;
  /** Seconds since Start was tapped, if it was. */
  startedElapsedSec?: number | null;
  /** The life goal this task serves, shown with the task. */
  goal?: { title: string; why: string } | null;
};

export type ShutdownProgress = { logged: boolean; inboxCount: number; plannedCount: number };

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
  /** The one priority task set the night before for today. */
  priorityTask?: TaskPick | null;
  /** The best open plan task for this evening (planned-for-today first), already in the user's energy version. */
  plannedTask?: TaskPick | null;
  /** An open task of ten minutes or less, for the optional lunch card. */
  lunchTask?: TaskPick | null;
  outTonight?: boolean;
  shutdown?: ShutdownProgress;
};

export type NowCard = {
  eyebrow: string;
  title: string;
  detail?: string;
  href?: string;
  cta?: string;
  /** A plan task this card is about, so the card can offer Start and Done. */
  taskId?: string;
  firstStep?: string;
  minutes?: number | null;
  startedElapsedSec?: number | null;
  goal?: { title: string; why: string } | null;
  /** Offer "Not this one" (afternoon and evening cards). */
  swap?: boolean;
};

type Kind = "workout" | "habit" | "cleaning" | "weekly";
type Candidate = { title: string; detail?: string; href: string; cta: string };

function candidates(input: NowInput, order: Kind[]): Candidate[] {
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

function shutdownCard(eyebrow: string, progress: ShutdownProgress | undefined, doneToday: number): NowCard {
  const p = progress ?? { logged: false, inboxCount: 0, plannedCount: 0 };
  if (!p.logged) {
    return { eyebrow, title: "Log the day", detail: "Step 1 of 3 — a quick line about how it went." };
  }
  if (p.inboxCount > 0) {
    return {
      eyebrow,
      title: "Tidy the Inbox",
      detail: `Step 2 of 3 — ${p.inboxCount} ${plural(p.inboxCount, "thing", "things")} to sort.`,
    };
  }
  if (p.plannedCount === 0) {
    return { eyebrow, title: "Plan tomorrow", detail: "Step 3 of 3 — choose what tomorrow is for." };
  }
  return {
    eyebrow,
    title: "You're set for tomorrow",
    detail:
      doneToday > 0
        ? `${doneToday} ${plural(doneToday, "thing", "things")} done today. Rest well.`
        : "Rest well. Tomorrow starts fresh.",
  };
}

function taskFields(task: TaskPick) {
  return {
    taskId: task.id,
    firstStep: task.firstStep,
    minutes: task.minutes,
    startedElapsedSec: task.startedElapsedSec,
    goal: task.goal,
  };
}

/** The single next action for the current part of the day. */
export function buildNowCard(input: NowInput): NowCard {
  const block = currentBlock(input.structure, input.minutes);
  const eyebrow = block ? `Now · ${block.label}` : "Now";

  if (!block) {
    return { eyebrow, title: "It's early", detail: "Rest is part of the plan. Launch begins at " + formatMinutes(input.structure.launchStartMinutes) + "." };
  }

  const pick = (order: Kind[]): NowCard | null => {
    const first = candidates(input, order)[0];
    return first ? { eyebrow, ...first } : null;
  };

  switch (block.id as BlockId) {
    case "launch":
      if (input.priorityTask) {
        return {
          eyebrow,
          title: input.priorityTask.title,
          detail: "Your one priority, set last night.",
          ...taskFields(input.priorityTask),
        };
      }
      return (
        pick(["workout", "habit", "weekly"]) ?? {
          eyebrow,
          title: "Launch is covered",
          detail: "Nothing waiting this morning. Ease into the day.",
        }
      );
    case "work":
      if (input.lunchTask && inLunchWindow(input.structure, input.minutes)) {
        return {
          eyebrow: "Now · Lunch",
          title: input.lunchTask.title,
          detail: "Optional — ten minutes, just for you.",
          ...taskFields(input.lunchTask),
        };
      }
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
    case "evening": {
      if (input.outTonight) {
        return {
          eyebrow: "Now · Out tonight",
          title: "Enjoy your evening",
          detail: "Nothing needed. Your streak is protected — a quick log when you're back is plenty.",
        };
      }
      if (input.plannedTask) {
        return {
          eyebrow,
          title: input.plannedTask.title,
          detail: input.plannedTask.easier ? "The easier version, for a lower-energy evening." : "Next up for this evening.",
          ...taskFields(input.plannedTask),
          swap: true,
        };
      }
      return (
        pick(["cleaning", "habit", "weekly", "workout"]) ?? {
          eyebrow,
          title: "Nothing left on your list",
          detail: "Enjoy the evening.",
        }
      );
    }
    case "shutdown":
      if (input.outTonight) {
        return {
          eyebrow: "Now · Out tonight",
          title: "Welcome back",
          detail: "A quick log is all tonight needs.",
        };
      }
      return shutdownCard(eyebrow, input.shutdown, input.doneToday);
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
  kind: "event" | "bill" | "cleaning" | "birthday" | "charge";
  title: string;
  time?: string;
  prep?: string;
};

export type ComingUpDay = { dateKey: string; label: string; items: ComingUpItem[]; more: number };

export type UpcomingBill = { name: string; dueDay: number; amount: number; autopay?: boolean };
export type UpcomingBirthday = { name: string; dateKey: string; turning: number | null; giftIdeas: number };
export type UpcomingCharge = { name: string; amount: number; dateKey: string; autopay: boolean; trial: boolean };
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

/** A price as people say it: $15.99, or $12 when it's a whole number. */
export function formatPrice(amount: number): string {
  const whole = Math.abs(amount - Math.round(amount)) < 0.005;
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
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
  /** Birthdays show a week ahead, further out than everything else. */
  birthdays?: UpcomingBirthday[];
  charges?: UpcomingCharge[];
  tz: string;
}): ComingUpDay[] {
  const { todayKey, structure, events, bills, cleaning, tz } = opts;
  const days = opts.days ?? 4;
  const horizon = Math.max(days, BIRTHDAY_COMING_UP_DAYS);
  const out: ComingUpDay[] = [];

  for (let i = 1; i <= horizon; i++) {
    const dateKey = addDays(todayKey, i);
    const items: ComingUpItem[] = [];
    const inRange = i <= days;

    for (const person of opts.birthdays ?? []) {
      if (person.dateKey !== dateKey) continue;
      items.push({
        kind: "birthday",
        title: `${person.name}'s birthday${person.turning ? ` · turning ${person.turning}` : ""}`,
        prep: person.giftIdeas > 0 ? `${person.giftIdeas} gift ${person.giftIdeas === 1 ? "idea" : "ideas"} saved.` : "A card or a message would be nice.",
      });
    }
    if (!inRange) {
      if (items.length === 0) continue;
      out.push({ dateKey, label: weekdayLong(dateKey), items: items.slice(0, MAX_ITEMS_PER_DAY), more: 0 });
      continue;
    }

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
          prep: bill.autopay ? "Pays automatically." : "Worth paying ahead if you can.",
        });
      }
    }
    for (const charge of opts.charges ?? []) {
      if (charge.dateKey !== dateKey) continue;
      items.push({
        kind: "charge",
        title: charge.trial
          ? `${charge.name} free trial ends · then ${formatPrice(charge.amount)}`
          : `${charge.name} · ${formatPrice(charge.amount)}`,
        prep: charge.trial ? "Cancel before then if you don't want it." : charge.autopay ? "Pays automatically." : "Pay this one yourself.",
      });
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
  /**
   * Manual (not autopay) bills and subscriptions still to pay, as days from today
   * (0 = today). Autopay ones are left out by the caller: they need no reminder.
   */
  bills: { name: string; daysUntil: number; href?: string }[];
  /** Free trials about to start charging. */
  trials?: { name: string; daysUntil: number; amount: number }[];
  /** Out tonight protects the streak, so there is nothing to nudge about. */
  outTonight?: boolean;
}): Flag[] {
  const flags: Flag[] = [];

  // A trial that's about to convert is the most time-sensitive thing here.
  const trials = (opts.trials ?? [])
    .filter((t) => t.daysUntil >= 0 && t.daysUntil <= TRIAL_FLAG_DAYS)
    .sort((a, b) => a.daysUntil - b.daysUntil);
  for (const trial of trials) {
    const when = trial.daysUntil === 0 ? "today" : trial.daysUntil === 1 ? "tomorrow" : `in ${trial.daysUntil} days`;
    flags.push({
      key: `trial-${trial.name}`,
      text: `${trial.name}'s free trial ends ${when} — then ${formatPrice(trial.amount)}.`,
      href: "/life",
    });
  }

  const urgent = opts.bills
    .filter((b) => b.daysUntil >= 0 && b.daysUntil <= MANUAL_CHARGE_FLAG_DAYS)
    .sort((a, b) => a.daysUntil - b.daysUntil);
  for (const bill of urgent) {
    const when = bill.daysUntil === 0 ? "today" : bill.daysUntil === 1 ? "tomorrow" : `in ${bill.daysUntil} days`;
    flags.push({ key: `bill-${bill.name}`, text: `${bill.name} is due ${when}.`, href: bill.href ?? "/finance" });
  }

  if (!opts.outTonight && opts.streak >= 2 && !opts.habitDoneToday && opts.minutes >= opts.structure.workEndMinutes) {
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

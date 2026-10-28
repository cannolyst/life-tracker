import type { DayStructure } from "./userSettingsDefaults";

// Pure rules for the time-block planning features. The database layer loads
// the rows; everything that decides what to show lives here so it can be tested.

export const BUCKETS = ["learning", "body", "home", "inbox"] as const;
export type Bucket = (typeof BUCKETS)[number];

export const BUCKET_LABEL: Record<Bucket, string> = {
  learning: "Learning",
  body: "Body",
  home: "Home",
  inbox: "Inbox",
};

export function isBucket(value: string): value is Bucket {
  return (BUCKETS as readonly string[]).includes(value);
}

export type Energy = "high" | "low";

export function isEnergy(value: string): value is Energy {
  return value === "high" || value === "low";
}

export type PlanStatus = "open" | "done" | "someday";

export type PlanTaskLike = {
  id: string;
  title: string;
  lowTitle: string | null;
  bucket: Bucket;
  minutes: number | null;
  status: PlanStatus;
  plannedFor: string | null;
  isPriority: boolean;
  // Phase 4 fields; optional so older callers and tests need not supply them.
  verb?: string | null;
  energy?: Energy | null;
  block?: string | null;
  firstStep?: string | null;
  skippedDate?: string | null;
};

/** A low-energy check-in swaps in a task's easier version, when it has one. */
export function versionFor(task: Pick<PlanTaskLike, "title" | "lowTitle">, energy: Energy | null) {
  if (energy === "low" && task.lowTitle) return { title: task.lowTitle, easier: true };
  return { title: task.title, easier: false };
}

/**
 * Tomorrow's plan holds about as many tasks as were actually finished today —
 * never fewer than one, so a hard day still leaves a next step.
 */
export function capacityCap(finishedToday: number): number {
  return Math.max(1, Math.floor(finishedToday));
}

export function roomLeft(cap: number, plannedCount: number): number {
  return Math.max(0, cap - plannedCount);
}

/* ---------- lunch card ---------- */

export const LUNCH_EARLIEST = 11 * 60 + 30;
export const LUNCH_LATEST = 13 * 60 + 30;
export const LUNCH_MAX_MINUTES = 10;

/** The slice of the work block where the optional lunch card shows up. */
export function lunchWindow(structure: DayStructure): { start: number; end: number } | null {
  const start = Math.max(structure.workStartMinutes, LUNCH_EARLIEST);
  const end = Math.min(structure.workEndMinutes, LUNCH_LATEST);
  return end > start ? { start, end } : null;
}

export function inLunchWindow(structure: DayStructure, minutes: number): boolean {
  const window = lunchWindow(structure);
  return window !== null && minutes >= window.start && minutes < window.end;
}

/** One 10-minute personal task: open, with a small estimate, shortest first. */
export function pickLunchTask<T extends PlanTaskLike>(tasks: T[]): T | null {
  const small = tasks
    .filter((t) => t.status === "open" && t.minutes !== null && t.minutes <= LUNCH_MAX_MINUTES)
    .sort((a, b) => (a.minutes ?? 0) - (b.minutes ?? 0));
  return small[0] ?? null;
}

/* ---------- transition: couch-friendly starter ---------- */

/**
 * The one easy way to begin after resting. Tasks with an easier version come
 * first (that's what it's for), then the smallest estimate, then anything.
 */
export function pickStarter<T extends PlanTaskLike>(tasks: T[]): T | null {
  const open = tasks.filter((t) => t.status === "open");
  const rank = (t: T) => (t.lowTitle ? 0 : 1);
  const sorted = [...open].sort(
    (a, b) => rank(a) - rank(b) || (a.minutes ?? 999) - (b.minutes ?? 999),
  );
  return sorted[0] ?? null;
}

/* ---------- rest timer ---------- */

export const REST_SECONDS = 20 * 60;

export function restRemainingSeconds(startedAtMs: number, nowMs: number): number {
  const elapsed = Math.floor((nowMs - startedAtMs) / 1000);
  return Math.min(REST_SECONDS, Math.max(0, REST_SECONDS - elapsed));
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ---------- Out tonight ---------- */

export type OutTonight = { on: boolean; source: "auto" | "manual" | "none" };

/** A stored choice (the user's own tap, or an earlier auto) wins; otherwise an evening event turns it on. */
export function outTonightState(opts: {
  stored: { outTonight: boolean; source: "auto" | "manual" } | null;
  hasEveningEvent: boolean;
}): OutTonight {
  if (opts.stored) return { on: opts.stored.outTonight, source: opts.stored.source };
  return opts.hasEveningEvent ? { on: true, source: "auto" } : { on: false, source: "none" };
}

/* ---------- grouping for the evening buckets ---------- */

/** Open tasks by bucket, with tasks planned for today first, then oldest first. */
export function groupOpenByBucket<T extends PlanTaskLike>(tasks: T[], todayKey: string): Record<Bucket, T[]> {
  const grouped = { learning: [], body: [], home: [], inbox: [] } as Record<Bucket, T[]>;
  for (const task of tasks) {
    if (task.status === "open") grouped[task.bucket].push(task);
  }
  for (const bucket of BUCKETS) {
    grouped[bucket].sort((a, b) => Number(b.plannedFor === todayKey) - Number(a.plannedFor === todayKey));
  }
  return grouped;
}

/* ---------- Phase 4: actions, one card at a time ---------- */

export const START_SECONDS = 5 * 60;

// Offered when adding a task: starting with a verb is what makes a task easy to begin.
export const VERB_SUGGESTIONS = [
  "Call",
  "Email",
  "Write",
  "Read",
  "Clean",
  "Buy",
  "Plan",
  "Fix",
  "Practice",
  "Sort",
  "Book",
  "Make",
] as const;

export const LIST_CONTEXTS = ["groceries", "movies", "books"] as const;
export type ListContext = (typeof LIST_CONTEXTS)[number];

export const LIST_CONTEXT_LABEL: Record<ListContext, string> = {
  groceries: "Groceries",
  movies: "Movies & shows",
  books: "Books",
};

export function isListContext(value: string): value is ListContext {
  return (LIST_CONTEXTS as readonly string[]).includes(value);
}

export const BLOCK_IDS = ["launch", "work", "transition", "evening", "shutdown"] as const;
export type TaskBlock = (typeof BLOCK_IDS)[number];

export function isTaskBlock(value: string): value is TaskBlock {
  return (BLOCK_IDS as readonly string[]).includes(value);
}

/** "Call" + "the dentist" → "Call the dentist"; a title that already starts with the verb is left alone. */
export function composeTitle(verb: string | null | undefined, what: string): string {
  const object = what.trim();
  const v = (verb ?? "").trim();
  if (!v) return object;
  if (!object) return v;
  const first = object.split(/\s+/)[0].toLowerCase();
  if (first === v.toLowerCase()) return object;
  return `${v.charAt(0).toUpperCase()}${v.slice(1)} ${object.charAt(0).toLowerCase()}${object.slice(1)}`;
}

/**
 * Pulls a trailing time off a quick jotting: "Call the dentist 10m" or
 * "write report 45 min" becomes the title plus 10 / 45 minutes.
 */
export function splitQuickTitle(input: string): { title: string; minutes: number | null } {
  const text = input.trim();
  const match = /^(.*\S)\s+(\d{1,3})\s*(?:m|min|mins|minutes)$/i.exec(text);
  if (!match) return { title: text, minutes: null };
  const minutes = Number(match[2]);
  return minutes >= 1 && minutes <= 600 ? { title: match[1], minutes } : { title: text, minutes: null };
}

export const DEFAULT_FIRST_STEP = "Set a five-minute timer and begin with just the very first small piece.";

export function firstStepFor(task: { firstStep?: string | null }): string {
  return task.firstStep?.trim() || DEFAULT_FIRST_STEP;
}

type Dealable = PlanTaskLike;

// Lower is dealt sooner. Planned-for-today and the priority lead; a task that
// belongs to this block beats one that belongs to another; a low-energy
// check-in favors easy tasks, a high one favors the demanding ones.
function dealRank(task: Dealable, ctx: { todayKey: string; energy: Energy | null; blockId: string }): number {
  let rank = 0;
  if (task.bucket === "inbox") rank += 1;
  if (task.plannedFor === ctx.todayKey) rank -= 4;
  if (task.isPriority) rank -= 1;
  if (task.block === ctx.blockId) rank -= 2;
  else if (task.block) rank += 3;
  if (ctx.energy === "low") {
    if (task.energy === "low") rank -= 2;
    else if (task.lowTitle) rank -= 1;
    else if (task.energy === "high") rank += 2;
  } else if (ctx.energy === "high" && task.energy === "high") {
    rank -= 1;
  }
  return rank;
}

/**
 * The one card to show now. Any open task can be dealt — a one-line jotting in
 * the Inbox is enough — though ones that have been sorted into an area come
 * first. Anything swapped away today ("Not this one") stays away, and after
 * a swap the next card is smaller than the smallest one passed over.
 */
export function dealCard<T extends Dealable>(
  tasks: T[],
  ctx: { todayKey: string; energy: Energy | null; blockId: string },
): T | null {
  const dealable = tasks.filter((t) => t.status === "open");
  const passedOver = dealable.filter((t) => t.skippedDate === ctx.todayKey);
  const remaining = dealable.filter((t) => t.skippedDate !== ctx.todayKey);

  const ceiling = passedOver.reduce<number | null>(
    (smallest, t) => (t.minutes === null ? smallest : smallest === null ? t.minutes : Math.min(smallest, t.minutes)),
    null,
  );
  const byRank = (a: T, b: T) => dealRank(a, ctx) - dealRank(b, ctx);

  if (ceiling !== null) {
    const smaller = remaining.filter((t) => t.minutes !== null && t.minutes < ceiling).sort(byRank);
    if (smaller.length > 0) return smaller[0];
  }
  return [...remaining].sort(byRank)[0] ?? null;
}

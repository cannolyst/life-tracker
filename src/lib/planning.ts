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

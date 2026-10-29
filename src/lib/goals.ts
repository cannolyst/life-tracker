import { dayDiff } from "./taskPoints";

// Life goals: pure rules for how each kind tracks itself and how pacing is
// judged. Wording stays calm — no "failing", no "overdue".

export const MAX_ACTIVE_GOALS = 3;
export const MIN_GOAL_DAYS = 30;
export const MAX_GOAL_DAYS = 365;
/** Goals shorter than this are reviewed in the Sunday reset; longer ones in the monthly review. */
export const SHORT_GOAL_DAYS = 60;
export const EXTEND_CHOICES = [30, 60, 90] as const;

export type GoalKind = "finish" | "rhythm" | "ongoing";

export const KIND_LABEL: Record<GoalKind, string> = {
  finish: "Finish",
  rhythm: "Rhythm",
  ongoing: "Ongoing",
};

export const KIND_BLURB: Record<GoalKind, string> = {
  finish: "Reach a finish line, like “run a 10k”.",
  rhythm: "Do something a set number of times a week.",
  ongoing: "Keep something going, like “stay in good shape”.",
};

function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function goalLengthDays(startKey: string, deadlineKey: string): number {
  return dayDiff(startKey, deadlineKey);
}

/** A goal's deadline must sit between about a month and a year after it starts. */
export function validateDeadline(startKey: string, deadlineKey: string): string | null {
  const days = goalLengthDays(startKey, deadlineKey);
  if (days < MIN_GOAL_DAYS) return "Give it at least about a month.";
  if (days > MAX_GOAL_DAYS) return "Keep it within a year — you can always extend later.";
  return null;
}

export function isShortGoal(startKey: string, deadlineKey: string): boolean {
  return goalLengthDays(startKey, deadlineKey) < SHORT_GOAL_DAYS;
}

export function extendedDeadline(deadlineKey: string, days: number): string {
  return addDays(deadlineKey, days);
}

/* ---------- weeks (Sunday to Saturday, like the rest of the app) ---------- */

export function weekStartKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDays(dateKey, -dow);
}

/** How many times something happened in each week, keyed by the week's Sunday. */
export function weeklyCounts(activityDates: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const date of activityDates) {
    const key = weekStartKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/* ---------- progress ---------- */

export type FinishInput = { milestonesDone: number; milestonesTotal: number; tasksDone: number; tasksTotal: number };

/** Milestones done out of all; with none, goal tasks finished out of all of them. */
export function finishProgress(input: FinishInput): { ratio: number; detail: string } {
  if (input.milestonesTotal > 0) {
    return {
      ratio: input.milestonesDone / input.milestonesTotal,
      detail: `${input.milestonesDone} of ${input.milestonesTotal} milestones`,
    };
  }
  if (input.tasksTotal > 0) {
    return { ratio: input.tasksDone / input.tasksTotal, detail: `${input.tasksDone} of ${input.tasksTotal} steps` };
  }
  return { ratio: 0, detail: "No milestones yet" };
}

export type RhythmStats = {
  completedWeeks: number;
  weeksHit: number;
  thisWeek: number;
  ratio: number;
};

/**
 * Weeks you hit the target out of the full weeks since the goal began. The
 * week it started in (usually partial) and the current one don't count against
 * you; until a full week has passed, progress is simply this week's count.
 */
export function rhythmStats(
  counts: ReadonlyMap<string, number>,
  target: number,
  startKey: string,
  todayKey: string,
): RhythmStats {
  const thisWeekKey = weekStartKey(todayKey);
  let week = addDays(weekStartKey(startKey), 7); // first full week after the start
  if (week < startKey) week = addDays(week, 7);
  let completedWeeks = 0;
  let weeksHit = 0;
  while (week < thisWeekKey) {
    completedWeeks++;
    if ((counts.get(week) ?? 0) >= target) weeksHit++;
    week = addDays(week, 7);
  }
  const thisWeek = counts.get(thisWeekKey) ?? 0;
  const ratio = completedWeeks > 0 ? weeksHit / completedWeeks : Math.min(1, thisWeek / target);
  return { completedWeeks, weeksHit, thisWeek, ratio };
}

/** How many of the last four weeks (this one included) had any activity. */
export function ongoingActiveWeeks(counts: ReadonlyMap<string, number>, todayKey: string): number {
  let key = weekStartKey(todayKey);
  let active = 0;
  for (let i = 0; i < 4; i++) {
    if ((counts.get(key) ?? 0) > 0) active++;
    key = addDays(key, -7);
  }
  return active;
}

/* ---------- pacing ---------- */

export type Pace = "ahead" | "on_pace" | "behind" | "fresh_look";

export const PACE_LABEL: Record<Pace, string> = {
  ahead: "Ahead",
  on_pace: "On pace",
  behind: "A little behind",
  fresh_look: "Worth a fresh look",
};

/** Share of the time between start and deadline that has gone by, 0–1. */
export function elapsedFraction(startKey: string, deadlineKey: string, todayKey: string): number {
  const total = goalLengthDays(startKey, deadlineKey);
  if (total <= 0) return 1;
  return Math.max(0, Math.min(1, dayDiff(startKey, todayKey) / total));
}

export function paceForFinish(progress: number, elapsed: number): Pace {
  const gap = progress - elapsed;
  if (gap >= 0.1) return "ahead";
  if (gap >= -0.15) return "on_pace";
  if (gap >= -0.35) return "behind";
  return "fresh_look";
}

export function paceForRhythm(stats: RhythmStats, target: number, todayKey: string): Pace {
  if (stats.completedWeeks === 0) {
    // Still in the first stretch: judge the week so far, gently.
    const dayOfWeek = new Date(`${todayKey}T00:00:00Z`).getUTCDay();
    return dayOfWeek >= 5 && stats.thisWeek === 0 && target > 0 ? "behind" : "on_pace";
  }
  if (stats.ratio >= 0.9) return "ahead";
  if (stats.ratio >= 0.7) return "on_pace";
  if (stats.ratio >= 0.4) return "behind";
  return "fresh_look";
}

export function paceForOngoing(activeWeeks: number): Pace {
  if (activeWeeks >= 4) return "ahead";
  if (activeWeeks === 3) return "on_pace";
  if (activeWeeks === 2) return "behind";
  return "fresh_look";
}

/* ---------- putting it together ---------- */

export type GoalMetrics = {
  /** 0–1, for the progress bar. */
  progress: number;
  pace: Pace;
  paceLabel: string;
  detail: string;
};

export type MetricsInput = {
  kind: GoalKind;
  startKey: string;
  deadlineKey: string;
  todayKey: string;
  weeklyTarget: number | null;
  finish: FinishInput;
  /** Dates (YYYY-MM-DD) of logged habits, workouts and finished goal tasks. */
  activityDates: readonly string[];
};

export function buildGoalMetrics(input: MetricsInput): GoalMetrics {
  const counts = weeklyCounts(input.activityDates.filter((d) => d >= input.startKey));
  const elapsed = elapsedFraction(input.startKey, input.deadlineKey, input.todayKey);

  if (input.kind === "finish") {
    const { ratio, detail } = finishProgress(input.finish);
    const pace = paceForFinish(ratio, elapsed);
    return { progress: ratio, pace, paceLabel: PACE_LABEL[pace], detail };
  }

  if (input.kind === "rhythm") {
    const target = input.weeklyTarget ?? 1;
    const stats = rhythmStats(counts, target, input.startKey, input.todayKey);
    const pace = paceForRhythm(stats, target, input.todayKey);
    const detail =
      stats.completedWeeks > 0
        ? `${stats.weeksHit} of ${stats.completedWeeks} weeks on target · ${stats.thisWeek}/${target} this week`
        : `${stats.thisWeek}/${target} this week`;
    return { progress: stats.ratio, pace, paceLabel: PACE_LABEL[pace], detail };
  }

  const active = ongoingActiveWeeks(counts, input.todayKey);
  const pace = paceForOngoing(active);
  return { progress: active / 4, pace, paceLabel: PACE_LABEL[pace], detail: `${active} of the last 4 weeks active` };
}

/* ---------- deadline ---------- */

export type DeadlineState = { reached: boolean; daysLeft: number };

export function deadlineState(deadlineKey: string, todayKey: string): DeadlineState {
  const daysLeft = dayDiff(todayKey, deadlineKey);
  return { reached: daysLeft <= 0, daysLeft };
}

export function daysLeftLabel(daysLeft: number): string {
  if (daysLeft <= 0) return "deadline reached";
  if (daysLeft === 1) return "1 day left";
  if (daysLeft < 14) return `${daysLeft} days left`;
  const weeks = Math.round(daysLeft / 7);
  return `about ${weeks} ${weeks === 1 ? "week" : "weeks"} left`;
}

/** "About one milestone a week" — how much it takes to land the finish line by the deadline. */
export function neededPace(remaining: number, todayKey: string, deadlineKey: string): string | null {
  if (remaining <= 0) return null;
  const weeks = Math.max(1, dayDiff(todayKey, deadlineKey) / 7);
  const perWeek = remaining / weeks;
  if (perWeek >= 1) return `About ${Math.ceil(perWeek)} a week to finish on time.`;
  const everyWeeks = Math.round(1 / perWeek);
  return `About one every ${everyWeeks} ${everyWeeks === 1 ? "week" : "weeks"} to finish on time.`;
}

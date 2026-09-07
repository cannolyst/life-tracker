export type SetEntry = {
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
};

// A single set's "score" for comparison purposes: weight x reps for a
// strength set, or the hold time for a duration set (e.g. Plank).
export function setScore(set: SetEntry): number {
  if (set.durationSeconds != null) return set.durationSeconds;
  if (set.weight != null && set.reps != null) return set.weight * set.reps;
  return 0;
}

export type WeekTrend = "up" | "down" | "flat" | "no-data";

// Compares the best set (by score) logged this week against the best set
// logged last week for the same exercise.
export function compareWeekOverWeek(thisWeekSets: SetEntry[], lastWeekSets: SetEntry[]): WeekTrend {
  if (thisWeekSets.length === 0 || lastWeekSets.length === 0) return "no-data";
  const thisBest = Math.max(...thisWeekSets.map(setScore));
  const lastBest = Math.max(...lastWeekSets.map(setScore));
  if (thisBest > lastBest) return "up";
  if (thisBest < lastBest) return "down";
  return "flat";
}

export type OverloadResult = { ready: boolean; currentWeight: number | null };

/**
 * Flags an exercise as ready for a weight increase: the last two logged
 * sessions both used the exact same weight across every set, and every set
 * in both sessions hit at least `targetReps`. Duration-based exercises
 * (no weight) naturally never qualify, since a null weight fails the
 * same-weight check.
 */
export function evaluateProgressiveOverload(
  recentSessions: SetEntry[][],
  targetReps: number,
): OverloadResult {
  if (recentSessions.length < 2) return { ready: false, currentWeight: null };
  const [prev, latest] = recentSessions.slice(-2);
  if (prev.length === 0 || latest.length === 0) return { ready: false, currentWeight: null };

  const combined = [...prev, ...latest];
  const weights = combined.map((s) => s.weight);
  if (weights.some((w) => w == null)) return { ready: false, currentWeight: null };

  const weight = weights[0]!;
  const sameWeight = weights.every((w) => w === weight);
  if (!sameWeight) return { ready: false, currentWeight: null };

  const repsOk = combined.every((s) => s.reps != null && s.reps >= targetReps);
  if (!repsOk) return { ready: false, currentWeight: null };

  return { ready: true, currentWeight: weight };
}

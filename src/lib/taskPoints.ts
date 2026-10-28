// The point rules for plan tasks, as approved. Habits, cleaning and weekly
// tasks keep the values the user set on each; these only cover starting and
// finishing tasks and the welcome-back bonus. Rest, the energy check-in, Out
// tonight and the journal are always worth 0.

export const START_POINTS = 1;
/** Starting only counts for this many different tasks a day, so it can't be farmed. */
export const START_MAX_PER_DAY = 3;
export const REENTRY_POINTS = 5;
/** Days with no points at all before the next start or finish earns the welcome-back. */
export const QUIET_DAYS_FOR_REENTRY = 2;

/** Points for finishing, by the task's size. The easier low-energy version earns the same. */
export function finishPoints(minutes: number | null): number {
  if (minutes === null || minutes <= 10) return 2;
  if (minutes <= 30) return 3;
  if (minutes <= 60) return 5;
  return 8;
}

export function dayDiff(fromKey: string, toKey: string): number {
  const a = Date.parse(`${fromKey}T00:00:00Z`);
  const b = Date.parse(`${toKey}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/**
 * True when the last day with any activity was far enough back that today's
 * first start or finish is a comeback: at least QUIET_DAYS_FOR_REENTRY whole
 * days with nothing in between. Someone with no history at all isn't "returning".
 */
export function isReentry(lastActiveKey: string | null, todayKey: string): boolean {
  if (!lastActiveKey || lastActiveKey >= todayKey) return false;
  return dayDiff(lastActiveKey, todayKey) - 1 >= QUIET_DAYS_FOR_REENTRY;
}

/** The most recent local day strictly before today in a list of day keys, or null. */
export function lastActiveBefore(dayKeys: Iterable<string>, todayKey: string): string | null {
  let best: string | null = null;
  for (const key of dayKeys) {
    if (key < todayKey && (best === null || key > best)) best = key;
  }
  return best;
}

export function describeAward(points: number, welcomeBack: boolean): string {
  const base = `+${points} ${points === 1 ? "point" : "points"}`;
  return welcomeBack ? `Welcome back — ${base} including a +${REENTRY_POINTS} comeback bonus.` : base;
}

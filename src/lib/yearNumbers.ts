import { dayDiff } from "./taskPoints";

export type BlockRate = { block: string; habits: number; rate: number };

type HabitForRate = { id: string; block: string | null; createdKey: string };

/**
 * How often each part of the day's habits actually got done: for every habit
 * assigned to a block, the share of days (since it existed, within the year,
 * up to today) with at least one completion — averaged over the block's habits.
 * Repeatable habits count a day done once, however many times it was logged.
 */
export function blockCompletionRates(
  habits: HabitForRate[],
  completionDays: ReadonlyMap<string, ReadonlySet<string>>,
  year: number,
  todayKey: string,
): BlockRate[] {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const end = todayKey < yearEnd ? todayKey : yearEnd;

  const byBlock = new Map<string, { expected: number; done: number; habits: number }>();
  for (const habit of habits) {
    if (!habit.block) continue;
    const start = habit.createdKey > yearStart ? habit.createdKey : yearStart;
    if (start > end) continue;
    const expected = dayDiff(start, end) + 1;
    const days = completionDays.get(habit.id);
    let done = 0;
    if (days) for (const day of days) if (day >= start && day <= end) done++;
    const entry = byBlock.get(habit.block) ?? { expected: 0, done: 0, habits: 0 };
    entry.expected += expected;
    entry.done += Math.min(done, expected);
    entry.habits += 1;
    byBlock.set(habit.block, entry);
  }

  const order = ["launch", "work", "transition", "evening", "shutdown"];
  return [...byBlock.entries()]
    .map(([block, v]) => ({ block, habits: v.habits, rate: v.expected === 0 ? 0 : v.done / v.expected }))
    .sort((a, b) => order.indexOf(a.block) - order.indexOf(b.block));
}

export const BLOCK_LABELS: Record<string, string> = {
  launch: "Launch",
  work: "Work",
  transition: "Transition",
  evening: "Evening",
  shutdown: "Shutdown",
};

export function percent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

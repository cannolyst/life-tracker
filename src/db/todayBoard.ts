import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { habitCompletions, habitTasks, weeklyTaskCompletions, weeklyTasks } from "./schema";
import { getPlanTasks } from "./planning";
import { getCleaningTasksWithStatus, getPointsSummary } from "./queries";

export type TodayTodo =
  | { kind: "task"; id: string; title: string; minutes: number | null; priority: boolean }
  | { kind: "habit"; id: string; title: string; points: number; repeatable: boolean; count: number };

export type TodayDone = { key: string; title: string; detail?: string };

export type TodayBoard = {
  /** Open items for today: planned tasks first (priority leading), then habits. */
  todo: TodayTodo[];
  /** Everything finished today, newest sources first. */
  done: TodayDone[];
  pointsToday: number;
};

// What today's list and "Done today" show, loaded once per request however many cards ask.
// Habits come with the Points tab and cleaning with the Cleaning tab, so each is
// only included when that tab is on.
export const getTodayBoard = cache(
  async (userId: string, todayKey: string, withHabits: boolean, withCleaning: boolean): Promise<TodayBoard> => {
    const [tasks, habits, habitDone, weeklyDone, cleaning, summary] = await Promise.all([
      getPlanTasks(userId),
      withHabits
        ? db
            .select({ id: habitTasks.id, name: habitTasks.name, points: habitTasks.points, repeatable: habitTasks.repeatable })
            .from(habitTasks)
            .where(and(eq(habitTasks.userId, userId), eq(habitTasks.archived, false)))
            .orderBy(habitTasks.createdAt)
        : Promise.resolve([]),
      withHabits
        ? db
            .select({ taskId: habitCompletions.taskId })
            .from(habitCompletions)
            .where(and(eq(habitCompletions.userId, userId), eq(habitCompletions.date, todayKey)))
        : Promise.resolve([]),
      withHabits
        ? db
            .select({ name: weeklyTasks.name })
            .from(weeklyTaskCompletions)
            .innerJoin(weeklyTasks, eq(weeklyTasks.id, weeklyTaskCompletions.taskId))
            .where(and(eq(weeklyTaskCompletions.userId, userId), eq(weeklyTaskCompletions.date, todayKey)))
        : Promise.resolve([]),
      withCleaning ? getCleaningTasksWithStatus(userId) : Promise.resolve([]),
      withHabits ? getPointsSummary(userId) : Promise.resolve(null),
    ]);

    const counts = new Map<string, number>();
    for (const c of habitDone) counts.set(c.taskId, (counts.get(c.taskId) ?? 0) + 1);

    const planned = tasks
      .filter((t) => t.status === "open" && t.plannedFor === todayKey)
      .sort((a, b) => Number(b.isPriority) - Number(a.isPriority));
    const todo: TodayTodo[] = [
      ...planned.map((t) => ({ kind: "task" as const, id: t.id, title: t.title, minutes: t.minutes, priority: t.isPriority })),
      // A once-a-day habit leaves the list when done; a repeatable one (water) stays so it can be logged again.
      ...habits
        .filter((h) => h.repeatable || !counts.has(h.id))
        .map((h) => ({
          kind: "habit" as const,
          id: h.id,
          title: h.name,
          points: h.points,
          repeatable: h.repeatable,
          count: counts.get(h.id) ?? 0,
        })),
    ];

    const done: TodayDone[] = [
      ...tasks
        .filter((t) => t.status === "done" && t.doneDate === todayKey)
        .map((t) => ({ key: `task-${t.id}`, title: t.title })),
      ...habits
        .filter((h) => counts.has(h.id))
        .map((h) => ({
          key: `habit-${h.id}`,
          title: h.name,
          detail: (counts.get(h.id) ?? 0) > 1 ? `×${counts.get(h.id)}` : undefined,
        })),
      ...weeklyDone.map((w, i) => ({ key: `weekly-${i}-${w.name}`, title: w.name })),
      ...cleaning.filter((c) => c.doneToday).map((c) => ({ key: `clean-${c.id}`, title: c.name })),
    ];

    return { todo, done, pointsToday: summary?.pointsToday ?? 0 };
  },
);

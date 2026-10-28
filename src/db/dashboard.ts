import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "./index";
import { getProtectedDates } from "./planning";
import { briefSeen, habitCompletions, habitTasks } from "./schema";
import {
  getBillsLineItems,
  getChecklistChecks,
  getCleaningTasksWithStatus,
  getWeeklyTasksWithStatus,
  getWorkoutPrograms,
  getWorkoutWeekProgress,
} from "./queries";
import { computeStreak } from "@/lib/streak";
import type { HabitCandidate, UpcomingBill, UpcomingCleaning } from "@/lib/dashboard";
import { dateKeyIn, zonedParts, zonedTimeToUtc } from "@/lib/timezone";

export type DashboardModules = {
  points: boolean;
  cleaning: boolean;
  exercise: boolean;
  finance: boolean;
};

export type DayAgenda = {
  habit: { name: string; points: number } | null;
  habitCandidates: HabitCandidate[];
  habitsLeft: number;
  habitDoneToday: boolean;
  streak: number;
  cleaning: { name: string; overdue: boolean } | null;
  cleaningDue: number;
  cleaningDueNames: string[];
  cleaningUpcoming: UpcomingCleaning[];
  weekly: { name: string } | null;
  weeklyLeft: number;
  workout: { dayName: string } | null;
  doneToday: number;
  billsUnpaidDaysUntil: { name: string; daysUntil: number }[];
  billsUpcoming: UpcomingBill[];
};

const EMPTY: DayAgenda = {
  habit: null,
  habitCandidates: [],
  habitsLeft: 0,
  habitDoneToday: false,
  streak: 0,
  cleaning: null,
  cleaningDue: 0,
  cleaningDueNames: [],
  cleaningUpcoming: [],
  weekly: null,
  weeklyLeft: 0,
  workout: null,
  doneToday: 0,
  billsUnpaidDaysUntil: [],
  billsUpcoming: [],
};

async function loadHabits(userId: string, tz: string, todayKey: string) {
  const [tasks, completions, protectedDates] = await Promise.all([
    db
      .select({
        id: habitTasks.id,
        name: habitTasks.name,
        points: habitTasks.points,
        repeatable: habitTasks.repeatable,
        block: habitTasks.block,
      })
      .from(habitTasks)
      .where(and(eq(habitTasks.userId, userId), eq(habitTasks.archived, false)))
      .orderBy(habitTasks.createdAt),
    db
      .select({ taskId: habitCompletions.taskId, date: habitCompletions.date })
      .from(habitCompletions)
      .where(eq(habitCompletions.userId, userId)),
    getProtectedDates(userId),
  ]);
  const doneTodayIds = new Set(completions.filter((c) => c.date === todayKey).map((c) => c.taskId));
  // Repeatable tasks can be logged any number of times, so they're never "left".
  const left = tasks.filter((t) => !t.repeatable && !doneTodayIds.has(t.id));
  // Anything not yet done today can be suggested in its own block (repeatable ones too).
  const candidates = tasks
    .filter((t) => !doneTodayIds.has(t.id))
    .map((t) => ({ name: t.name, points: t.points, block: t.block, repeatable: t.repeatable }));
  return {
    candidates,
    habit: left[0] ? { name: left[0].name, points: left[0].points } : null,
    habitsLeft: left.length,
    habitDoneToday: doneTodayIds.size > 0,
    doneTodayCount: doneTodayIds.size,
    streak: computeStreak(
      [...completions.map((c) => c.date), ...protectedDates],
      tz,
    ),
  };
}

async function loadCleaning(userId: string) {
  const tasks = await getCleaningTasksWithStatus(userId);
  const due = tasks
    .filter((t) => !t.doneToday && (t.status === "overdue" || t.status === "due-today"))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return {
    cleaning: due[0] ? { name: due[0].name, overdue: due[0].status === "overdue" } : null,
    cleaningDue: due.length,
    cleaningDueNames: due.slice(0, 4).map((t) => t.name),
    cleaningUpcoming: tasks
      .filter((t) => t.status === "upcoming")
      .map((t) => ({ name: t.name, dueKey: t.dueDate.toISOString().slice(0, 10) })),
    cleaningDoneToday: tasks.filter((t) => t.doneToday).length,
  };
}

async function loadWorkout(userId: string) {
  const programs = await getWorkoutPrograms(userId);
  const active = programs.find((p) => p.active);
  if (!active) return null;
  const week = await getWorkoutWeekProgress(userId, active.id);
  const next = week.days.find((d) => d.count === 0);
  return next ? { dayName: next.name } : null;
}

async function loadBills(userId: string, todayKey: string) {
  const bills = (await getBillsLineItems(userId)).filter((b) => b.dueDay !== null);
  if (bills.length === 0) return { unpaid: [], upcoming: [] };
  const monthKey = todayKey.slice(0, 7);
  const checks = await getChecklistChecks(userId, [monthKey]);
  const todayDay = Number(todayKey.slice(8, 10));
  const daysInMonth = new Date(Date.UTC(Number(todayKey.slice(0, 4)), Number(todayKey.slice(5, 7)), 0)).getUTCDate();

  const unpaid = bills
    .filter((b) => !checks.has(`bill_${b.id}`))
    .map((b) => ({ name: b.name, daysUntil: Math.min(b.dueDay!, daysInMonth) - todayDay }))
    .filter((b) => b.daysUntil >= 0);
  const upcoming = bills.map((b) => ({ name: b.name, dueDay: b.dueDay!, amount: Number(b.monthlyAmount) }));
  return { unpaid, upcoming };
}

/**
 * Everything the dashboard's Now card, greeting and flags need about today,
 * loaded in parallel and only for the tabs the user has turned on.
 */
export async function getDayAgenda(userId: string, tz: string, modules: DashboardModules): Promise<DayAgenda> {
  const todayKey = dateKeyIn(tz);
  const [habits, cleaning, weekly, workout, bills] = await Promise.all([
    modules.points ? loadHabits(userId, tz, todayKey) : null,
    modules.cleaning ? loadCleaning(userId) : null,
    modules.points ? getWeeklyTasksWithStatus(userId) : null,
    modules.exercise ? loadWorkout(userId) : null,
    modules.finance ? loadBills(userId, todayKey) : null,
  ]);

  const weeklyLeft = weekly?.filter((t) => !t.doneThisWeek) ?? [];
  return {
    ...EMPTY,
    habit: habits?.habit ?? null,
    habitCandidates: habits?.candidates ?? [],
    habitsLeft: habits?.habitsLeft ?? 0,
    habitDoneToday: habits?.habitDoneToday ?? false,
    streak: habits?.streak ?? 0,
    cleaning: cleaning?.cleaning ?? null,
    cleaningDue: cleaning?.cleaningDue ?? 0,
    cleaningDueNames: cleaning?.cleaningDueNames ?? [],
    cleaningUpcoming: cleaning?.cleaningUpcoming ?? [],
    weekly: weeklyLeft[0] ? { name: weeklyLeft[0].name } : null,
    weeklyLeft: weeklyLeft.length,
    workout: workout ?? null,
    doneToday: (habits?.doneTodayCount ?? 0) + (cleaning?.cleaningDoneToday ?? 0),
    billsUnpaidDaysUntil: bills?.unpaid ?? [],
    billsUpcoming: bills?.upcoming ?? [],
  };
}

/**
 * How many brief stories the user heard or opened today (the alarm Shortcut,
 * the News tab's Play button and opening a story all record them), or 0.
 */
export async function getBriefPlayedToday(userId: string, tz: string): Promise<number> {
  const { year, month, day } = zonedParts(tz, new Date());
  const start = zonedTimeToUtc(tz, year, month, day);
  const end = zonedTimeToUtc(tz, year, month, day + 1);
  const rows = await db
    .select({ id: briefSeen.id })
    .from(briefSeen)
    .where(and(eq(briefSeen.userId, userId), gte(briefSeen.seenAt, start), lt(briefSeen.seenAt, end)));
  return rows.length;
}

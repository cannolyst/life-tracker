import { and, asc, eq, gte, like, lt, lte, isNotNull, sql } from "drizzle-orm";
import { db } from "./index";
import {
  cleaningCompletions,
  dayFlags,
  habitCompletions,
  habitTasks,
  listCategories,
  listItems,
  planTasks,
  taskPointEvents,
  weeklyResets,
  weeklyTaskCompletions,
} from "./schema";
import { RESET_POINTS } from "@/lib/reset";
import { addDays } from "@/lib/dashboard";
import { blockCompletionRates, type BlockRate } from "@/lib/yearNumbers";
import { dateKeyIn } from "@/lib/timezone";

/* ---------- the reset itself ---------- */

export async function getResetState(
  userId: string,
  weekKey: string,
): Promise<{ highlight: string; completed: boolean }> {
  const [row] = await db
    .select()
    .from(weeklyResets)
    .where(and(eq(weeklyResets.userId, userId), eq(weeklyResets.weekKey, weekKey)));
  return { highlight: row?.highlight ?? "", completed: row?.completedAt != null };
}

export async function saveHighlight(userId: string, weekKey: string, highlight: string): Promise<void> {
  await db
    .insert(weeklyResets)
    .values({ userId, weekKey, highlight })
    .onConflictDoUpdate({ target: [weeklyResets.userId, weeklyResets.weekKey], set: { highlight } });
}

/**
 * Finishes the week's reset. The completed_at update only matches while it is
 * still empty, so only the one call that flips it earns the bonus — a second
 * tap, a second tab, or a retry can't pay twice.
 */
export async function completeReset(
  userId: string,
  weekKey: string,
  dateKey: string,
): Promise<{ awarded: number }> {
  await db.insert(weeklyResets).values({ userId, weekKey }).onConflictDoNothing();
  const flipped = await db
    .update(weeklyResets)
    .set({ completedAt: new Date() })
    .where(
      and(eq(weeklyResets.userId, userId), eq(weeklyResets.weekKey, weekKey), sql`${weeklyResets.completedAt} is null`),
    )
    .returning({ weekKey: weeklyResets.weekKey });
  if (flipped.length === 0) return { awarded: 0 };

  const paid = await db
    .insert(taskPointEvents)
    .values({ userId, taskId: null, kind: "reset", points: RESET_POINTS, date: dateKey })
    .onConflictDoNothing()
    .returning({ id: taskPointEvents.id });
  return { awarded: paid.length > 0 ? RESET_POINTS : 0 };
}

/* ---------- look back ---------- */

export type WeekLookBack = {
  rows: { date: string; points: number }[];
  finished: { title: string; minutes: number | null }[];
};

/** Everything earned and finished in the seven days before today. */
export async function getWeekLookBack(userId: string, todayKey: string): Promise<WeekLookBack> {
  const start = addDays(todayKey, -7);

  const [habits, cleaning, weekly, tasks, finished] = await Promise.all([
    db
      .select({ date: habitCompletions.date, points: habitCompletions.pointsAwarded })
      .from(habitCompletions)
      .where(and(eq(habitCompletions.userId, userId), gte(habitCompletions.date, start), lt(habitCompletions.date, todayKey))),
    db
      .select({ date: cleaningCompletions.date, points: cleaningCompletions.pointsAwarded })
      .from(cleaningCompletions)
      .where(and(eq(cleaningCompletions.userId, userId), gte(cleaningCompletions.date, start), lt(cleaningCompletions.date, todayKey))),
    db
      .select({ date: weeklyTaskCompletions.date, points: weeklyTaskCompletions.pointsAwarded })
      .from(weeklyTaskCompletions)
      .where(and(eq(weeklyTaskCompletions.userId, userId), gte(weeklyTaskCompletions.date, start), lt(weeklyTaskCompletions.date, todayKey))),
    db
      .select({ date: taskPointEvents.date, points: taskPointEvents.points })
      .from(taskPointEvents)
      .where(and(eq(taskPointEvents.userId, userId), gte(taskPointEvents.date, start), lt(taskPointEvents.date, todayKey))),
    db
      .select({ title: planTasks.title, minutes: planTasks.minutes })
      .from(planTasks)
      .where(
        and(
          eq(planTasks.userId, userId),
          eq(planTasks.status, "done"),
          gte(planTasks.doneDate, start),
          lt(planTasks.doneDate, todayKey),
        ),
      ),
  ]);
  return { rows: [...habits, ...cleaning, ...weekly, ...tasks], finished };
}

/** Evenings the user marked "out" in a range (their own tap or a recorded automatic one). */
export async function getMarkedOutDates(userId: string, fromKey: string, toKey: string): Promise<Set<string>> {
  const rows = await db
    .select({ date: dayFlags.date })
    .from(dayFlags)
    .where(
      and(eq(dayFlags.userId, userId), eq(dayFlags.outTonight, true), gte(dayFlags.date, fromKey), lte(dayFlags.date, toKey)),
    );
  return new Set(rows.map((r) => r.date));
}

/* ---------- groceries ---------- */

export type GroceryList = { id: string; name: string; items: { id: string; text: string }[] };

export async function getGroceryList(userId: string): Promise<GroceryList | null> {
  const [list] = await db
    .select({ id: listCategories.id, name: listCategories.name })
    .from(listCategories)
    .where(and(eq(listCategories.userId, userId), eq(listCategories.context, "groceries")))
    .orderBy(asc(listCategories.orderIndex))
    .limit(1);
  if (!list) return null;
  const items = await db
    .select({ id: listItems.id, text: listItems.text })
    .from(listItems)
    .where(and(eq(listItems.userId, userId), eq(listItems.categoryId, list.id), eq(listItems.done, false)))
    .orderBy(asc(listItems.createdAt));
  return { ...list, items };
}

/* ---------- Year in review additions ---------- */

export type YearNumbers = {
  starts: number;
  reentries: number;
  finished: number;
  outNights: number;
  resets: number;
  blockRates: BlockRate[];
  highlights: { weekKey: string; text: string }[];
};

export async function getYearNumbers(userId: string, year: number, tz: string): Promise<YearNumbers> {
  const prefix = `${year}-%`;
  const todayKey = dateKeyIn(tz);

  const [events, flags, resets, habits, completions] = await Promise.all([
    db
      .select({ kind: taskPointEvents.kind })
      .from(taskPointEvents)
      .where(and(eq(taskPointEvents.userId, userId), like(taskPointEvents.date, prefix))),
    db
      .select({ date: dayFlags.date })
      .from(dayFlags)
      .where(and(eq(dayFlags.userId, userId), eq(dayFlags.outTonight, true), like(dayFlags.date, prefix))),
    db
      .select({ weekKey: weeklyResets.weekKey, highlight: weeklyResets.highlight, completedAt: weeklyResets.completedAt })
      .from(weeklyResets)
      .where(and(eq(weeklyResets.userId, userId), like(weeklyResets.weekKey, prefix), isNotNull(weeklyResets.completedAt)))
      .orderBy(asc(weeklyResets.weekKey)),
    db
      .select({ id: habitTasks.id, block: habitTasks.block, createdAt: habitTasks.createdAt })
      .from(habitTasks)
      .where(and(eq(habitTasks.userId, userId), eq(habitTasks.archived, false), isNotNull(habitTasks.block))),
    db
      .select({ taskId: habitCompletions.taskId, date: habitCompletions.date })
      .from(habitCompletions)
      // habit_completions.date is a real date column, so it takes a range rather than a text match.
      .where(
        and(
          eq(habitCompletions.userId, userId),
          gte(habitCompletions.date, `${year}-01-01`),
          lte(habitCompletions.date, `${year}-12-31`),
        ),
      ),
  ]);

  const completionDays = new Map<string, Set<string>>();
  for (const c of completions) {
    const set = completionDays.get(c.taskId) ?? new Set<string>();
    set.add(c.date);
    completionDays.set(c.taskId, set);
  }
  const blockHabits = habits.map((h) => ({ id: h.id, block: h.block, createdKey: dateKeyIn(tz, h.createdAt) }));

  return {
    starts: events.filter((e) => e.kind === "start").length,
    reentries: events.filter((e) => e.kind === "reentry").length,
    finished: events.filter((e) => e.kind === "finish").length,
    outNights: new Set(flags.map((f) => f.date)).size,
    resets: resets.length,
    blockRates: blockCompletionRates(blockHabits, completionDays, year, todayKey),
    highlights: resets.filter((r) => r.highlight.trim()).map((r) => ({ weekKey: r.weekKey, text: r.highlight.trim() })),
  };
}

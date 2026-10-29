"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { goalHabits, goalMilestones, habitTasks, lifeGoals, planTasks } from "@/db/schema";
import { getUserSettings } from "@/db/userSettings";
import { requireUserId } from "@/lib/session";
import { dateKeyIn } from "@/lib/timezone";
import { EXTEND_CHOICES, MAX_ACTIVE_GOALS, extendedDeadline, validateDeadline } from "@/lib/goals";

export type GoalResult = { ok: true; note?: string } | { ok: false; error: string };

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const AREAS = ["learning", "body", "home"];

function refresh() {
  revalidatePath("/goals");
  revalidatePath("/");
  revalidatePath("/reset");
  revalidatePath("/plan");
}

async function context() {
  const userId = await requireUserId();
  const { timezone } = await getUserSettings(userId);
  return { userId, todayKey: dateKeyIn(timezone) };
}

async function activeCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(lifeGoals)
    .where(and(eq(lifeGoals.userId, userId), eq(lifeGoals.status, "active")));
  return Number(row?.n ?? 0);
}

export type NewGoal = {
  title: string;
  why: string;
  kind: string;
  finishLine: string;
  weeklyTarget: number | null;
  deadline: string;
  area: string;
  linkWorkouts: boolean;
  habitIds: string[];
  milestones: string[];
  nextAction: string;
};

export async function createGoal(input: NewGoal): Promise<GoalResult> {
  const title = input.title.trim().slice(0, 120);
  if (!title) return { ok: false, error: "Give the goal a name." };
  if (!["finish", "rhythm", "ongoing"].includes(input.kind)) return { ok: false, error: "Pick a type." };
  const why = input.why.trim().slice(0, 200);
  const finishLine = input.finishLine.trim().slice(0, 200);
  if (input.kind === "finish" && !finishLine) return { ok: false, error: "What does the finish line look like?" };
  if (input.kind === "rhythm") {
    const w = input.weeklyTarget;
    if (!w || !Number.isInteger(w) || w < 1 || w > 21) return { ok: false, error: "How many times a week? (1–21)" };
  }
  if (!DATE_KEY.test(input.deadline)) return { ok: false, error: "Pick a deadline." };
  const area = AREAS.includes(input.area) ? input.area : "learning";

  const { userId, todayKey } = await context();
  const deadlineProblem = validateDeadline(todayKey, input.deadline);
  if (deadlineProblem) return { ok: false, error: deadlineProblem };

  // Only your own habits can be linked.
  const habitIds = input.habitIds.length
    ? (
        await db
          .select({ id: habitTasks.id })
          .from(habitTasks)
          .where(and(eq(habitTasks.userId, userId), inArray(habitTasks.id, input.habitIds)))
      ).map((h) => h.id)
    : [];

  // Three goals at a time; the rest wait their turn in Someday Goals.
  const status = (await activeCount(userId)) < MAX_ACTIVE_GOALS ? "active" : "someday";

  const [goal] = await db
    .insert(lifeGoals)
    .values({
      userId,
      title,
      why,
      kind: input.kind,
      finishLine: input.kind === "finish" ? finishLine : null,
      weeklyTarget: input.kind === "rhythm" ? input.weeklyTarget : null,
      startDate: todayKey,
      deadline: input.deadline,
      area,
      linkWorkouts: input.linkWorkouts,
      status,
    })
    .returning({ id: lifeGoals.id });

  const milestones = input.milestones.map((m) => m.trim().slice(0, 150)).filter(Boolean).slice(0, 12);
  if (milestones.length > 0) {
    await db
      .insert(goalMilestones)
      .values(milestones.map((m, i) => ({ goalId: goal.id, userId, title: m, orderIndex: i })));
  }
  if (habitIds.length > 0) {
    await db.insert(goalHabits).values(habitIds.map((habitId) => ({ goalId: goal.id, habitId, userId })));
  }

  // The next action becomes a card straight away (only while the goal is active).
  const next = input.nextAction.trim().slice(0, 200);
  if (next && status === "active") {
    await db.insert(planTasks).values({ userId, title: next, bucket: area, goalId: goal.id });
  }

  refresh();
  return {
    ok: true,
    note: status === "active" ? undefined : "You already have three active goals, so this one is waiting in Someday Goals.",
  };
}

export async function toggleMilestone(id: string): Promise<GoalResult> {
  const { userId } = await context();
  await db
    .update(goalMilestones)
    .set({ doneAt: sql`case when ${goalMilestones.doneAt} is null then now() else null end` })
    .where(and(eq(goalMilestones.id, id), eq(goalMilestones.userId, userId)));
  refresh();
  return { ok: true };
}

export async function addMilestone(goalId: string, title: string): Promise<GoalResult> {
  const text = title.trim().slice(0, 150);
  if (!text) return { ok: false, error: "Name the milestone." };
  const { userId } = await context();
  const [owned] = await db
    .select({ id: lifeGoals.id })
    .from(lifeGoals)
    .where(and(eq(lifeGoals.id, goalId), eq(lifeGoals.userId, userId)));
  if (!owned) return { ok: false, error: "Couldn't find that goal." };
  const [row] = await db
    .select({ n: count() })
    .from(goalMilestones)
    .where(and(eq(goalMilestones.goalId, goalId), eq(goalMilestones.userId, userId)));
  await db.insert(goalMilestones).values({ goalId, userId, title: text, orderIndex: Number(row?.n ?? 0) });
  refresh();
  return { ok: true };
}

/** The next action for a goal: it becomes a task (and so a card) right away. */
export async function addGoalNextAction(goalId: string, title: string): Promise<GoalResult> {
  const text = title.trim().slice(0, 200);
  if (!text) return { ok: false, error: "What's the next step?" };
  const { userId } = await context();
  const [goal] = await db
    .select({ id: lifeGoals.id, area: lifeGoals.area, status: lifeGoals.status })
    .from(lifeGoals)
    .where(and(eq(lifeGoals.id, goalId), eq(lifeGoals.userId, userId)));
  if (!goal) return { ok: false, error: "Couldn't find that goal." };
  if (goal.status !== "active") return { ok: false, error: "Bring the goal out of Someday first." };
  await db.insert(planTasks).values({ userId, title: text, bucket: goal.area, goalId });
  refresh();
  return { ok: true };
}

/** Done: celebrate, and it lands in the Year in review. */
export async function completeGoal(id: string): Promise<GoalResult> {
  const { userId, todayKey } = await context();
  await db
    .update(lifeGoals)
    .set({ status: "done", completedOn: todayKey })
    .where(and(eq(lifeGoals.id, id), eq(lifeGoals.userId, userId)));
  refresh();
  revalidatePath("/year-review");
  return { ok: true };
}

/** Extend: more time, and pacing recalculates against the new deadline. */
export async function extendGoal(id: string, days: number): Promise<GoalResult> {
  if (!(EXTEND_CHOICES as readonly number[]).includes(days)) return { ok: false, error: "Pick 30, 60 or 90 days." };
  const { userId } = await context();
  const [goal] = await db
    .select({ deadline: lifeGoals.deadline, extendedCount: lifeGoals.extendedCount })
    .from(lifeGoals)
    .where(and(eq(lifeGoals.id, id), eq(lifeGoals.userId, userId)));
  if (!goal) return { ok: false, error: "Couldn't find that goal." };
  const { todayKey } = await context();
  // Extend from today when the old deadline has already passed.
  const base = goal.deadline > todayKey ? goal.deadline : todayKey;
  await db
    .update(lifeGoals)
    .set({ deadline: extendedDeadline(base, days), extendedCount: goal.extendedCount + 1 })
    .where(and(eq(lifeGoals.id, id), eq(lifeGoals.userId, userId)));
  refresh();
  return { ok: true };
}

/** Retire: no penalty, no record against you. Its open tasks simply come off the goal. */
export async function retireGoal(id: string): Promise<GoalResult> {
  const { userId } = await context();
  await db
    .update(lifeGoals)
    .set({ status: "retired" })
    .where(and(eq(lifeGoals.id, id), eq(lifeGoals.userId, userId)));
  await db
    .update(planTasks)
    .set({ goalId: null })
    .where(and(eq(planTasks.goalId, id), eq(planTasks.userId, userId), eq(planTasks.status, "open")));
  refresh();
  return { ok: true };
}

export async function moveGoalToSomeday(id: string): Promise<GoalResult> {
  const { userId } = await context();
  await db
    .update(lifeGoals)
    .set({ status: "someday" })
    .where(and(eq(lifeGoals.id, id), eq(lifeGoals.userId, userId), eq(lifeGoals.status, "active")));
  refresh();
  return { ok: true };
}

export async function activateGoal(id: string): Promise<GoalResult> {
  const { userId } = await context();
  if ((await activeCount(userId)) >= MAX_ACTIVE_GOALS) {
    return { ok: false, error: "You already have three active goals. Finish, retire or pause one first." };
  }
  await db
    .update(lifeGoals)
    .set({ status: "active" })
    .where(and(eq(lifeGoals.id, id), eq(lifeGoals.userId, userId), eq(lifeGoals.status, "someday")));
  refresh();
  return { ok: true };
}

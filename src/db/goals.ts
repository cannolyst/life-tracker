import { and, asc, desc, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { db } from "./index";
import {
  goalHabits,
  goalMilestones,
  habitCompletions,
  lifeGoals,
  planTasks,
  workoutSessions,
} from "./schema";
import {
  buildGoalMetrics,
  daysLeftLabel,
  deadlineState,
  isShortGoal,
  neededPace,
  type GoalKind,
  type GoalMetrics,
} from "@/lib/goals";

export type GoalStatus = "active" | "someday" | "done" | "retired";

export type GoalView = {
  id: string;
  title: string;
  why: string;
  kind: GoalKind;
  finishLine: string | null;
  weeklyTarget: number | null;
  startDate: string;
  deadline: string;
  area: string;
  linkWorkouts: boolean;
  status: GoalStatus;
  completedOn: string | null;
  extendedCount: number;
  milestones: { id: string; title: string; done: boolean }[];
  habitIds: string[];
  openTasks: { id: string; title: string }[];
  metrics: GoalMetrics;
  deadlineReached: boolean;
  daysLeftLabel: string;
  /** Under about 60 days: reviewed in the Sunday reset; longer goals in the monthly review. */
  short: boolean;
  neededPace: string | null;
};

/**
 * Every goal with its progress worked out from what has actually been logged:
 * linked habits, logged workouts (when the goal links them) and finished tasks
 * tagged to the goal. Only active goals are judged; the rest carry empty metrics.
 */
export async function getGoals(userId: string, todayKey: string): Promise<GoalView[]> {
  const goals = await db
    .select()
    .from(lifeGoals)
    .where(eq(lifeGoals.userId, userId))
    .orderBy(asc(lifeGoals.createdAt));
  if (goals.length === 0) return [];

  const goalIds = goals.map((g) => g.id);
  const earliest = goals.reduce((min, g) => (g.startDate < min ? g.startDate : min), goals[0].startDate);
  const wantsWorkouts = goals.some((g) => g.linkWorkouts);

  const [milestones, habitLinks, tasks, sessions] = await Promise.all([
    db
      .select()
      .from(goalMilestones)
      .where(and(eq(goalMilestones.userId, userId), inArray(goalMilestones.goalId, goalIds)))
      .orderBy(asc(goalMilestones.orderIndex), asc(goalMilestones.title)),
    db
      .select({ goalId: goalHabits.goalId, habitId: goalHabits.habitId })
      .from(goalHabits)
      .where(and(eq(goalHabits.userId, userId), inArray(goalHabits.goalId, goalIds))),
    db
      .select({
        id: planTasks.id,
        title: planTasks.title,
        goalId: planTasks.goalId,
        status: planTasks.status,
        doneDate: planTasks.doneDate,
      })
      .from(planTasks)
      .where(and(eq(planTasks.userId, userId), isNotNull(planTasks.goalId))),
    wantsWorkouts
      ? db
          .select({ date: workoutSessions.date })
          .from(workoutSessions)
          .where(and(eq(workoutSessions.userId, userId), gte(workoutSessions.date, earliest)))
      : Promise.resolve([] as { date: string }[]),
  ]);

  const linkedHabitIds = [...new Set(habitLinks.map((l) => l.habitId))];
  const completions =
    linkedHabitIds.length > 0
      ? await db
          .select({ taskId: habitCompletions.taskId, date: habitCompletions.date })
          .from(habitCompletions)
          .where(
            and(
              eq(habitCompletions.userId, userId),
              inArray(habitCompletions.taskId, linkedHabitIds),
              gte(habitCompletions.date, earliest),
            ),
          )
      : [];

  return goals.map((g) => {
    const goalMilestonesList = milestones.filter((m) => m.goalId === g.id);
    const habitIds = habitLinks.filter((l) => l.goalId === g.id).map((l) => l.habitId);
    const goalTasks = tasks.filter((t) => t.goalId === g.id && t.status !== "someday");
    const doneTasks = goalTasks.filter((t) => t.status === "done");
    const openTasks = goalTasks.filter((t) => t.status === "open").map((t) => ({ id: t.id, title: t.title }));

    const activityDates = [
      ...completions.filter((c) => habitIds.includes(c.taskId)).map((c) => c.date),
      ...(g.linkWorkouts ? sessions.map((s) => s.date) : []),
      ...doneTasks.map((t) => t.doneDate).filter((d): d is string => d !== null),
    ];

    const milestonesDone = goalMilestonesList.filter((m) => m.doneAt !== null).length;
    const metrics = buildGoalMetrics({
      kind: g.kind as GoalKind,
      startKey: g.startDate,
      deadlineKey: g.deadline,
      todayKey,
      weeklyTarget: g.weeklyTarget,
      finish: {
        milestonesDone,
        milestonesTotal: goalMilestonesList.length,
        tasksDone: doneTasks.length,
        tasksTotal: goalTasks.length,
      },
      activityDates,
    });
    const deadline = deadlineState(g.deadline, todayKey);
    const remaining = goalMilestonesList.length - milestonesDone;

    return {
      id: g.id,
      title: g.title,
      why: g.why,
      kind: g.kind as GoalKind,
      finishLine: g.finishLine,
      weeklyTarget: g.weeklyTarget,
      startDate: g.startDate,
      deadline: g.deadline,
      area: g.area,
      linkWorkouts: g.linkWorkouts,
      status: g.status as GoalStatus,
      completedOn: g.completedOn,
      extendedCount: g.extendedCount,
      milestones: goalMilestonesList.map((m) => ({ id: m.id, title: m.title, done: m.doneAt !== null })),
      habitIds,
      openTasks,
      metrics,
      deadlineReached: deadline.reached,
      daysLeftLabel: daysLeftLabel(deadline.daysLeft),
      short: isShortGoal(g.startDate, g.deadline),
      neededPace: g.kind === "finish" ? neededPace(remaining, todayKey, g.deadline) : null,
    };
  });
}

export async function getActiveGoalCount(userId: string): Promise<number> {
  const rows = await db
    .select({ id: lifeGoals.id })
    .from(lifeGoals)
    .where(and(eq(lifeGoals.userId, userId), eq(lifeGoals.status, "active")));
  return rows.length;
}

/** Goals finished in a calendar year, newest first, for the Year in review. */
export async function getCompletedGoals(
  userId: string,
  year: number,
): Promise<{ id: string; title: string; why: string; completedOn: string }[]> {
  const rows = await db
    .select({ id: lifeGoals.id, title: lifeGoals.title, why: lifeGoals.why, completedOn: lifeGoals.completedOn })
    .from(lifeGoals)
    .where(and(eq(lifeGoals.userId, userId), eq(lifeGoals.status, "done"), isNotNull(lifeGoals.completedOn)))
    .orderBy(desc(lifeGoals.completedOn));
  return rows
    .filter((r): r is typeof r & { completedOn: string } => r.completedOn !== null && r.completedOn.startsWith(`${year}-`))
    .map((r) => ({ id: r.id, title: r.title, why: r.why, completedOn: r.completedOn }));
}

import { eq, and, inArray, gte, lte, sum, desc, sql } from "drizzle-orm";
import { db } from "./index";
import {
  accounts,
  savingsDetails,
  debtDetails,
  transactions,
  debtStatements,
  goals,
  habitCategories,
  habitTasks,
  habitCompletions,
  rewards,
  redemptions,
  cleaningAreas,
  cleaningTasks,
  cleaningCompletions,
  listCategories,
  listItems,
  todos,
  yearReviewCategories,
  yearReviewItems,
  people,
  yearReviewItemPeople,
  places,
  yearReviewItemPlaces,
  workoutPrograms,
  workoutDays,
  workoutExercises,
  workoutSessions,
  workoutSets,
  moduleSettings,
  emotionEntries,
  paycheckPlan,
  billsLineItems,
  paycheckChecklistChecks,
  weeklyTasks,
  weeklyTaskCompletions,
} from "./schema";
import {
  projectSavingsDate,
  projectPayoffDate,
  requiredDailyPayment,
  isOnTrack,
  estimateInterestSaved,
} from "@/lib/projections";
import { computeStreak } from "@/lib/streak";
import { computeCleaningStatus, classifyByTimeframe } from "@/lib/cleaningStatus";
import {
  dateKeyInAppTimezone,
  dateOnlyInAppTimezone,
  startOfWeekUtc,
  weekKeyInAppTimezone,
} from "@/lib/timezone";
import { computeMinimumPaymentStatus, computeExtraPaidOverMinimum } from "@/lib/minimumPayment";
import {
  compareWeekOverWeek,
  evaluateProgressiveOverload,
  type SetEntry,
  type WeekTrend,
} from "@/lib/workout";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

async function getBalance(accountId: string, userId: string, startingBalance: number) {
  const [row] = await db
    .select({ total: sum(transactions.amount) })
    .from(transactions)
    .where(and(eq(transactions.accountId, accountId), eq(transactions.userId, userId)));
  return startingBalance + Number(row?.total ?? 0);
}

function streakFromTransactions(txns: { date: Date | string; category: string }[]) {
  return computeStreak(txns.filter((t) => t.category === "recurring_goal").map((t) => t.date));
}

// Batch-fetches every account's details/goals/statements/transactions in a
// handful of queries (one per table, scoped by the full set of account
// ids) instead of the previous per-account sequential round trips —
// same result, but the number of queries no longer scales with the number
// of accounts.
export async function listAccountsSummary(userId: string) {
  const allAccounts = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.archived, false), eq(accounts.userId, userId)));

  const savings = allAccounts.filter((a) => a.type === "savings");
  const debts = allAccounts.filter((a) => a.type === "debt");
  const accountIds = allAccounts.map((a) => a.id);

  if (accountIds.length === 0) {
    return { savingsSummaries: [], debtSummaries: [] };
  }

  const [allSavingsDetails, allDebtDetails, allGoals, allStatements, allTxns] = await Promise.all([
    db
      .select()
      .from(savingsDetails)
      .where(and(inArray(savingsDetails.accountId, accountIds), eq(savingsDetails.userId, userId))),
    db
      .select()
      .from(debtDetails)
      .where(and(inArray(debtDetails.accountId, accountIds), eq(debtDetails.userId, userId))),
    db
      .select()
      .from(goals)
      .where(and(inArray(goals.accountId, accountIds), eq(goals.userId, userId)))
      .orderBy(goals.createdAt),
    db
      .select()
      .from(debtStatements)
      .where(and(inArray(debtStatements.accountId, accountIds), eq(debtStatements.userId, userId)))
      .orderBy(debtStatements.statementDate),
    db
      .select({
        accountId: transactions.accountId,
        date: transactions.date,
        amount: transactions.amount,
        category: transactions.category,
      })
      .from(transactions)
      .where(and(inArray(transactions.accountId, accountIds), eq(transactions.userId, userId))),
  ]);

  const savingsDetailsByAccount = new Map(allSavingsDetails.map((d) => [d.accountId, d]));
  const debtDetailsByAccount = new Map(allDebtDetails.map((d) => [d.accountId, d]));
  // allGoals is ordered by createdAt, so the first push per account is the
  // earliest goal — matching the original per-account `.orderBy` + take-first.
  const firstGoalByAccount = new Map<string, (typeof allGoals)[number]>();
  for (const g of allGoals) {
    if (!firstGoalByAccount.has(g.accountId)) firstGoalByAccount.set(g.accountId, g);
  }
  const statementsByAccount = new Map<string, typeof allStatements>();
  for (const s of allStatements) {
    const list = statementsByAccount.get(s.accountId) ?? [];
    list.push(s);
    statementsByAccount.set(s.accountId, list);
  }
  const txnsByAccount = new Map<string, typeof allTxns>();
  for (const t of allTxns) {
    const list = txnsByAccount.get(t.accountId) ?? [];
    list.push(t);
    txnsByAccount.set(t.accountId, list);
  }

  const savingsSummaries = savings.map((account) => {
    const details = savingsDetailsByAccount.get(account.id);
    const goal = firstGoalByAccount.get(account.id);
    const txns = txnsByAccount.get(account.id) ?? [];
    const balance = Number(account.startingBalance) + txns.reduce((s, t) => s + Number(t.amount), 0);

    const projectedDate = goal
      ? projectSavingsDate(
          balance,
          Number(goal.targetAmount),
          txns.map((t) => ({ date: new Date(t.date), amount: Number(t.amount) })),
          new Date(account.createdAt),
        )
      : null;

    return {
      account,
      dailyGoal: Number(details?.dailyGoal ?? 0),
      balance,
      goal,
      projectedDate,
      pace: isOnTrack(projectedDate, goal?.targetDate),
      streak: streakFromTransactions(txns),
    };
  });

  const debtSummaries = debts.map((account) => {
    const details = debtDetailsByAccount.get(account.id);
    const goal = firstGoalByAccount.get(account.id);
    const txns = txnsByAccount.get(account.id) ?? [];
    const balance = Number(account.startingBalance) + txns.reduce((s, t) => s + Number(t.amount), 0);
    const statements = statementsByAccount.get(account.id) ?? [];
    const latestStatement = statements[statements.length - 1];

    const minimumPaymentDue = Number(latestStatement?.minimumPaymentDue ?? 0);
    const projectedDate = details
      ? projectPayoffDate(
          balance,
          Number(details.apr),
          Number(details.dailyMicropaymentGoal),
          minimumPaymentDue,
          details.statementDay,
        )
      : null;

    const requiredDaily =
      details && goal?.targetDate
        ? requiredDailyPayment(
            balance,
            Number(details.apr),
            minimumPaymentDue,
            details.statementDay,
            new Date(goal.targetDate),
          )
        : null;

    return {
      account,
      apr: Number(details?.apr ?? 0),
      dailyMicropaymentGoal: Number(details?.dailyMicropaymentGoal ?? 0),
      statementDay: details?.statementDay ?? 1,
      balance,
      latestStatement,
      projectedDate,
      goal,
      requiredDaily,
      pace: isOnTrack(projectedDate, goal?.targetDate),
      streak: streakFromTransactions(txns),
      minimumPaymentStatus: computeMinimumPaymentStatus(txns, latestStatement),
      interestSaved: details
        ? estimateInterestSaved(
            balance,
            Number(details.apr),
            Number(details.dailyMicropaymentGoal),
            minimumPaymentDue,
            details.statementDay,
          )
        : 0,
      extraPaidOverMinimum: computeExtraPaidOverMinimum(txns, statements),
    };
  });

  return { savingsSummaries, debtSummaries };
}

export async function getSavingsAccountDetail(accountId: string, userId: string) {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  if (!account) return null;
  const [details] = await db
    .select()
    .from(savingsDetails)
    .where(and(eq(savingsDetails.accountId, accountId), eq(savingsDetails.userId, userId)));
  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.accountId, accountId), eq(goals.userId, userId)))
    .orderBy(goals.createdAt);
  const txns = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.accountId, accountId), eq(transactions.userId, userId)))
    .orderBy(transactions.date);
  const balance = await getBalance(accountId, userId, Number(account.startingBalance));

  const projectedDate = goal
    ? projectSavingsDate(
        balance,
        Number(goal.targetAmount),
        txns.map((t) => ({ date: new Date(t.date), amount: Number(t.amount) })),
        new Date(account.createdAt),
      )
    : null;

  return {
    account,
    details,
    goal,
    transactions: txns,
    balance,
    projectedDate,
    pace: isOnTrack(projectedDate, goal?.targetDate),
    streak: streakFromTransactions(txns),
  };
}

export async function getDebtAccountDetail(accountId: string, userId: string) {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  if (!account) return null;
  const [details] = await db
    .select()
    .from(debtDetails)
    .where(and(eq(debtDetails.accountId, accountId), eq(debtDetails.userId, userId)));
  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.accountId, accountId), eq(goals.userId, userId)))
    .orderBy(goals.createdAt);
  const statements = await db
    .select()
    .from(debtStatements)
    .where(and(eq(debtStatements.accountId, accountId), eq(debtStatements.userId, userId)))
    .orderBy(debtStatements.statementDate);
  const txns = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.accountId, accountId), eq(transactions.userId, userId)))
    .orderBy(transactions.date);
  const balance = await getBalance(accountId, userId, Number(account.startingBalance));

  const latestStatement = statements[statements.length - 1];
  const minimumPaymentDue = Number(latestStatement?.minimumPaymentDue ?? 0);
  const projectedDate = details
    ? projectPayoffDate(
        balance,
        Number(details.apr),
        Number(details.dailyMicropaymentGoal),
        minimumPaymentDue,
        details.statementDay,
      )
    : null;

  const requiredDaily =
    details && goal?.targetDate
      ? requiredDailyPayment(
          balance,
          Number(details.apr),
          minimumPaymentDue,
          details.statementDay,
          new Date(goal.targetDate),
        )
      : null;

  return {
    account,
    details,
    goal,
    statements,
    transactions: txns,
    balance,
    projectedDate,
    requiredDaily,
    pace: isOnTrack(projectedDate, goal?.targetDate),
    streak: streakFromTransactions(txns),
    minimumPaymentStatus: computeMinimumPaymentStatus(txns, latestStatement),
    interestSaved: details
      ? estimateInterestSaved(
          balance,
          Number(details.apr),
          Number(details.dailyMicropaymentGoal),
          minimumPaymentDue,
          details.statementDay,
        )
      : 0,
    extraPaidOverMinimum: computeExtraPaidOverMinimum(txns, statements),
  };
}

export type FinanceChartGranularity = "week" | "month";
export type FinanceChartPoint = { dateKey: string; label: string; saved: number; paidDebt: number };

function buildFinanceChart(
  rows: { date: string; amount: number; accountType: string }[],
  granularity: FinanceChartGranularity,
): FinanceChartPoint[] {
  const savedSums = new Map<string, number>();
  const paidDebtSums = new Map<string, number>();
  for (const row of rows) {
    const d = new Date(`${row.date}T00:00:00Z`);
    const key = chartBucketKey(granularity, d);
    if (row.accountType === "savings" && row.amount > 0) {
      savedSums.set(key, (savedSums.get(key) ?? 0) + row.amount);
    }
    if (row.accountType === "debt" && row.amount < 0) {
      paidDebtSums.set(key, (paidDebtSums.get(key) ?? 0) + -row.amount);
    }
  }

  const todayOnly = dateOnlyInAppTimezone();
  const count = CHART_BUCKET_COUNT[granularity];
  const points: FinanceChartPoint[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const d =
      granularity === "week"
        ? new Date(mondayOfUtc(todayOnly).getTime() - i * 7 * MS_PER_DAY)
        : new Date(Date.UTC(todayOnly.getUTCFullYear(), todayOnly.getUTCMonth() - i, 1));
    const dateKey = chartBucketKey(granularity, d);
    points.push({
      dateKey,
      label: chartBucketLabel(granularity, d),
      saved: Math.round((savedSums.get(dateKey) ?? 0) * 100) / 100,
      paidDebt: Math.round((paidDebtSums.get(dateKey) ?? 0) * 100) / 100,
    });
  }

  return points;
}

function buildAllFinanceCharts(
  rows: { date: string; amount: number; accountType: string }[],
): Record<FinanceChartGranularity, FinanceChartPoint[]> {
  return {
    week: buildFinanceChart(rows, "week"),
    month: buildFinanceChart(rows, "month"),
  };
}

export async function getGamificationStats(userId: string) {
  const rows = await db
    .select({
      amount: transactions.amount,
      category: transactions.category,
      date: transactions.date,
      accountType: accounts.type,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(eq(transactions.userId, userId));

  const todayKey = dateKeyInAppTimezone();
  const monthPrefix = todayKey.slice(0, 7); // "YYYY-MM"
  const monthStart = new Date(`${monthPrefix}-01T00:00:00Z`);
  const today = dateOnlyInAppTimezone();
  const daysInMonthSoFar = Math.round((today.getTime() - monthStart.getTime()) / MS_PER_DAY) + 1;

  let lifetimeSaved = 0;
  let lifetimePaidDebt = 0;
  let monthSaved = 0;
  let monthPaidDebt = 0;
  const monthGoalDays = new Set<string>();

  for (const row of rows) {
    const amount = Number(row.amount);
    const dateKey = row.date;
    const inThisMonth = dateKey.startsWith(monthPrefix);

    if (row.accountType === "savings" && amount > 0) {
      lifetimeSaved += amount;
      if (inThisMonth) monthSaved += amount;
    }
    if (row.accountType === "debt" && amount < 0) {
      lifetimePaidDebt += -amount;
      if (inThisMonth) monthPaidDebt += -amount;
    }
    if (row.category === "recurring_goal" && inThisMonth) {
      monthGoalDays.add(dateKey);
    }
  }

  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(monthStart);

  const chartData = buildAllFinanceCharts(
    rows.map((r) => ({ date: r.date, amount: Number(r.amount), accountType: r.accountType })),
  );

  return {
    lifetimeSaved,
    lifetimePaidDebt,
    monthLabel,
    monthSaved,
    monthPaidDebt,
    daysHitGoal: monthGoalDays.size,
    daysInMonthSoFar,
    chartData,
  };
}

// --- Points / habit tracker ---

export async function getPointsBalance(userId: string): Promise<number> {
  const [[{ habitEarned }], [{ cleaningEarned }], [{ weeklyEarned }], [{ spent }]] = await Promise.all([
    db
      .select({ habitEarned: sum(habitCompletions.pointsAwarded) })
      .from(habitCompletions)
      .where(eq(habitCompletions.userId, userId)),
    db
      .select({ cleaningEarned: sum(cleaningCompletions.pointsAwarded) })
      .from(cleaningCompletions)
      .where(eq(cleaningCompletions.userId, userId)),
    db
      .select({ weeklyEarned: sum(weeklyTaskCompletions.pointsAwarded) })
      .from(weeklyTaskCompletions)
      .where(eq(weeklyTaskCompletions.userId, userId)),
    db.select({ spent: sum(redemptions.pointsCost) }).from(redemptions).where(eq(redemptions.userId, userId)),
  ]);
  return (
    Number(habitEarned ?? 0) +
    Number(cleaningEarned ?? 0) +
    Number(weeklyEarned ?? 0) -
    Number(spent ?? 0)
  );
}

// dateKey is a "YYYY-MM-DD" string (already UTC-midnight-anchored), so the
// offset is applied via UTC components directly rather than re-parsing
// through a timezone formatter — see the same pattern in streak.ts.
function addDaysToDateKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// The four points-page headline stats (total/yesterday/today/streak),
// shared by the Points page itself and the overview page so they always
// match. Reflects the whole shared economy (habit + cleaning completions).
export async function getPointsSummary(userId: string) {
  const [completions, cleaningCompletionsAll, weeklyCompletionsAll, [{ spent }]] = await Promise.all([
    db
      .select({ date: habitCompletions.date, pointsAwarded: habitCompletions.pointsAwarded })
      .from(habitCompletions)
      .where(eq(habitCompletions.userId, userId)),
    db
      .select({ date: cleaningCompletions.date, pointsAwarded: cleaningCompletions.pointsAwarded })
      .from(cleaningCompletions)
      .where(eq(cleaningCompletions.userId, userId)),
    db
      .select({ date: weeklyTaskCompletions.date, pointsAwarded: weeklyTaskCompletions.pointsAwarded })
      .from(weeklyTaskCompletions)
      .where(eq(weeklyTaskCompletions.userId, userId)),
    db.select({ spent: sum(redemptions.pointsCost) }).from(redemptions).where(eq(redemptions.userId, userId)),
  ]);

  const todayKey = dateKeyInAppTimezone();
  const yesterdayKey = addDaysToDateKey(todayKey, -1);

  const sumForDate = (dateKey: string) =>
    completions.filter((c) => c.date === dateKey).reduce((s, c) => s + c.pointsAwarded, 0) +
    cleaningCompletionsAll
      .filter((c) => c.date === dateKey)
      .reduce((s, c) => s + c.pointsAwarded, 0) +
    weeklyCompletionsAll
      .filter((c) => c.date === dateKey)
      .reduce((s, c) => s + c.pointsAwarded, 0);

  const distinctDays = Array.from(new Set(completions.map((c) => c.date)));

  // Computed from the same rows already fetched above instead of calling
  // getPointsBalance (which would re-query these same three tables again).
  const earned = [...completions, ...cleaningCompletionsAll, ...weeklyCompletionsAll].reduce(
    (s, c) => s + c.pointsAwarded,
    0,
  );
  const balance = earned - Number(spent ?? 0);

  return {
    balance,
    pointsToday: sumForDate(todayKey),
    pointsYesterday: sumForDate(yesterdayKey),
    streak: computeStreak(distinctDays),
  };
}

export type ChartGranularity = "day" | "week" | "month" | "year";
export type ChartPoint = { dateKey: string; label: string; points: number };

const CHART_BUCKET_COUNT: Record<ChartGranularity, number> = {
  day: 14,
  week: 8,
  month: 6,
  year: 5,
};

function mondayOfUtc(d: Date): Date {
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setUTCDate(monday.getUTCDate() + diff);
  return monday;
}

function chartBucketKey(granularity: ChartGranularity, d: Date): string {
  if (granularity === "day") return d.toISOString().slice(0, 10);
  if (granularity === "week") return mondayOfUtc(d).toISOString().slice(0, 10);
  if (granularity === "month") return d.toISOString().slice(0, 7);
  return String(d.getUTCFullYear());
}

function chartBucketLabel(granularity: ChartGranularity, d: Date): string {
  if (granularity === "day") {
    return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  }
  if (granularity === "week" || granularity === "month") {
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: granularity === "week" ? "numeric" : undefined,
      timeZone: "UTC",
    });
  }
  return String(d.getUTCFullYear());
}

// Bar-chart data for every granularity at once (cheap for a personal app's
// data volume), so the client can switch views with no extra round trip.
// Each bucket gets a genuinely unique `dateKey` — using only the display
// `label` (e.g. "Mon") as the chart's data key let two same-weekday bars
// collide in Recharts' category matching, which is what made hovering an
// older bar report a different bar's point total.
function buildPointsChart(
  rows: { date: string; pointsAwarded: number }[],
  granularity: ChartGranularity,
): ChartPoint[] {
  const sums = new Map<string, number>();
  for (const row of rows) {
    const d = new Date(`${row.date}T00:00:00Z`);
    const key = chartBucketKey(granularity, d);
    sums.set(key, (sums.get(key) ?? 0) + row.pointsAwarded);
  }

  const todayOnly = dateOnlyInAppTimezone();
  const count = CHART_BUCKET_COUNT[granularity];
  const points: ChartPoint[] = [];

  for (let i = count - 1; i >= 0; i--) {
    let d: Date;
    if (granularity === "day") {
      d = new Date(todayOnly.getTime() - i * MS_PER_DAY);
    } else if (granularity === "week") {
      d = new Date(mondayOfUtc(todayOnly).getTime() - i * 7 * MS_PER_DAY);
    } else if (granularity === "month") {
      d = new Date(Date.UTC(todayOnly.getUTCFullYear(), todayOnly.getUTCMonth() - i, 1));
    } else {
      d = new Date(Date.UTC(todayOnly.getUTCFullYear() - i, 0, 1));
    }
    const dateKey = chartBucketKey(granularity, d);
    points.push({ dateKey, label: chartBucketLabel(granularity, d), points: sums.get(dateKey) ?? 0 });
  }

  return points;
}

function buildAllPointsCharts(
  rows: { date: string; pointsAwarded: number }[],
): Record<ChartGranularity, ChartPoint[]> {
  return {
    day: buildPointsChart(rows, "day"),
    week: buildPointsChart(rows, "week"),
    month: buildPointsChart(rows, "month"),
    year: buildPointsChart(rows, "year"),
  };
}

async function getWeeklyTasksWithStatus(userId: string) {
  const tasks = await db
    .select()
    .from(weeklyTasks)
    .where(and(eq(weeklyTasks.archived, false), eq(weeklyTasks.userId, userId)))
    .orderBy(weeklyTasks.createdAt);

  const weekKey = weekKeyInAppTimezone();
  const completions =
    tasks.length > 0
      ? await db
          .select({ taskId: weeklyTaskCompletions.taskId })
          .from(weeklyTaskCompletions)
          .where(
            and(
              eq(weeklyTaskCompletions.userId, userId),
              eq(weeklyTaskCompletions.weekKey, weekKey),
              inArray(
                weeklyTaskCompletions.taskId,
                tasks.map((t) => t.id),
              ),
            ),
          )
      : [];
  const doneTaskIds = new Set(completions.map((c) => c.taskId));

  return tasks.map((task) => ({ ...task, doneThisWeek: doneTaskIds.has(task.id) }));
}

export async function getHabitDashboardData(userId: string) {
  const [categories, tasks, completions, activeRewards, recentRedemptions] = await Promise.all([
    db
      .select()
      .from(habitCategories)
      .where(eq(habitCategories.userId, userId))
      .orderBy(habitCategories.createdAt),
    db
      .select()
      .from(habitTasks)
      .where(and(eq(habitTasks.archived, false), eq(habitTasks.userId, userId)))
      .orderBy(habitTasks.createdAt),
    db.select().from(habitCompletions).where(eq(habitCompletions.userId, userId)),
    db
      .select()
      .from(rewards)
      .where(and(eq(rewards.archived, false), eq(rewards.userId, userId)))
      .orderBy(rewards.cost),
    db.select().from(redemptions).where(eq(redemptions.userId, userId)).orderBy(redemptions.date),
  ]);

  const todayKey = dateKeyInAppTimezone();
  const todayCompletionCounts = new Map<string, number>();
  for (const c of completions) {
    if (c.date === todayKey) {
      todayCompletionCounts.set(c.taskId, (todayCompletionCounts.get(c.taskId) ?? 0) + 1);
    }
  }

  const [
    { balance, pointsToday, pointsYesterday, streak },
    cleaningCompletionsAll,
    weeklyCompletionsAll,
    cleaningTasksWithStatus,
    weeklyTasksWithStatus,
  ] = await Promise.all([
    getPointsSummary(userId),
    db
      .select({ date: cleaningCompletions.date, pointsAwarded: cleaningCompletions.pointsAwarded })
      .from(cleaningCompletions)
      .where(eq(cleaningCompletions.userId, userId)),
    db
      .select({ date: weeklyTaskCompletions.date, pointsAwarded: weeklyTaskCompletions.pointsAwarded })
      .from(weeklyTaskCompletions)
      .where(eq(weeklyTaskCompletions.userId, userId)),
    getCleaningTasksWithStatus(userId),
    getWeeklyTasksWithStatus(userId),
  ]);

  const categoriesWithTasks = categories.map((category) => ({
    category,
    tasks: tasks.filter((t) => t.categoryId === category.id),
  }));
  const unassignedTasks = tasks.filter((t) => !t.categoryId);

  const weeklyCategoriesWithTasks = categories.map((category) => ({
    category,
    tasks: weeklyTasksWithStatus.filter((t) => t.categoryId === category.id),
  }));
  const weeklyUnassignedTasks = weeklyTasksWithStatus.filter((t) => !t.categoryId);

  const chartData = buildAllPointsCharts([
    ...completions,
    ...cleaningCompletionsAll,
    ...weeklyCompletionsAll,
  ]);

  return {
    categories,
    categoriesWithTasks,
    unassignedTasks,
    cleaningTasks: cleaningTasksWithStatus,
    weeklyTasks: weeklyTasksWithStatus,
    weeklyCategoriesWithTasks,
    weeklyUnassignedTasks,
    todayCompletionCounts,
    balance,
    pointsToday,
    pointsYesterday,
    streak,
    chartData,
    activeRewards,
    recentRedemptions: recentRedemptions.slice(-10).reverse(),
  };
}

// --- Cleaning tracker ---

async function getCleaningTasksWithStatus(userId: string) {
  const [areas, tasks, allCompletions] = await Promise.all([
    db.select().from(cleaningAreas).where(eq(cleaningAreas.userId, userId)),
    db
      .select()
      .from(cleaningTasks)
      .where(and(eq(cleaningTasks.archived, false), eq(cleaningTasks.userId, userId)))
      .orderBy(cleaningTasks.createdAt),
    db.select().from(cleaningCompletions).where(eq(cleaningCompletions.userId, userId)),
  ]);
  const areaNameById = new Map(areas.map((a) => [a.id, a.name]));

  const todayKey = dateKeyInAppTimezone();

  return tasks.map((task) => {
    const taskCompletions = allCompletions.filter((c) => c.taskId === task.id);
    const lastCompletedDate = taskCompletions.reduce<string | null>(
      (latest, c) => (!latest || c.date > latest ? c.date : latest),
      null,
    );
    const { status, dueDate } = computeCleaningStatus(
      lastCompletedDate,
      task.frequencyDays,
      task.createdAt,
    );
    return {
      ...task,
      areaName: task.areaId ? (areaNameById.get(task.areaId) ?? null) : null,
      lastCompletedDate,
      status,
      dueDate,
      timeframe: classifyByTimeframe(status, dueDate),
      doneToday: taskCompletions.some((c) => c.date === todayKey),
    };
  });
}

export async function getCleaningDashboardData(userId: string) {
  const [areas, tasksWithStatus] = await Promise.all([
    db
      .select()
      .from(cleaningAreas)
      .where(eq(cleaningAreas.userId, userId))
      .orderBy(cleaningAreas.createdAt),
    getCleaningTasksWithStatus(userId),
  ]);

  const areasWithTasks = areas.map((area) => ({
    area,
    tasks: tasksWithStatus.filter((t) => t.areaId === area.id),
  }));
  const unassignedTasks = tasksWithStatus.filter((t) => !t.areaId);

  return { areas, areasWithTasks, unassignedTasks };
}

// --- Lists (books to read, movies to watch, etc.) ---

export async function getListsData(userId: string) {
  const categories = await db
    .select()
    .from(listCategories)
    .where(eq(listCategories.userId, userId))
    .orderBy(listCategories.createdAt);
  const items = await db
    .select()
    .from(listItems)
    .where(eq(listItems.userId, userId))
    .orderBy(listItems.createdAt);

  const categoriesWithItems = categories.map((category) => ({
    category,
    items: items.filter((i) => i.categoryId === category.id),
  }));

  return { categoriesWithItems };
}

// --- To-do ---

export async function getTodos(userId: string) {
  return db.select().from(todos).where(eq(todos.userId, userId)).orderBy(desc(todos.createdAt));
}

// --- Year in review ---

// Entries can be as precise as a full date, or as loose as just a year, so
// they're sorted by the most specific value each one actually has (falling
// back to the 1st of the month, or Jan 1st, for anything looser).
function yearReviewItemSortKey(item: { year: number; month: number | null; date: string | null }) {
  if (item.date) return item.date;
  if (item.month) return `${item.year}-${String(item.month).padStart(2, "0")}-01`;
  return `${item.year}-01-01`;
}

export async function getYearReviewData(userId: string, selectedYear?: number) {
  const categories = await db
    .select()
    .from(yearReviewCategories)
    .where(eq(yearReviewCategories.userId, userId))
    .orderBy(yearReviewCategories.createdAt);
  const allItems = await db
    .select()
    .from(yearReviewItems)
    .where(eq(yearReviewItems.userId, userId))
    .orderBy(desc(yearReviewItems.createdAt));
  const allPeople = await db.select().from(people).where(eq(people.userId, userId)).orderBy(people.name);
  const itemPeopleLinks = await db
    .select()
    .from(yearReviewItemPeople)
    .where(eq(yearReviewItemPeople.userId, userId));
  const allPlaces = await db.select().from(places).where(eq(places.userId, userId)).orderBy(places.name);
  const itemPlaceLinks = await db
    .select()
    .from(yearReviewItemPlaces)
    .where(eq(yearReviewItemPlaces.userId, userId));

  const peopleById = new Map(allPeople.map((p) => [p.id, p]));
  const peopleByItemId = new Map<string, { id: string; name: string }[]>();
  for (const link of itemPeopleLinks) {
    const person = peopleById.get(link.personId);
    if (!person) continue;
    const list = peopleByItemId.get(link.itemId) ?? [];
    list.push(person);
    peopleByItemId.set(link.itemId, list);
  }

  const placesById = new Map(allPlaces.map((p) => [p.id, p]));
  const placesByItemId = new Map<string, { id: string; name: string }[]>();
  for (const link of itemPlaceLinks) {
    const place = placesById.get(link.placeId);
    if (!place) continue;
    const list = placesByItemId.get(link.itemId) ?? [];
    list.push(place);
    placesByItemId.set(link.itemId, list);
  }

  const currentYear = Number(dateKeyInAppTimezone().slice(0, 4));
  const years = Array.from(new Set([currentYear, ...allItems.map((i) => i.year)])).sort(
    (a, b) => b - a,
  );

  const year = selectedYear ?? currentYear;
  const itemsForYear = allItems
    .filter((i) => i.year === year)
    .sort((a, b) => (yearReviewItemSortKey(a) < yearReviewItemSortKey(b) ? 1 : -1))
    .map((i) => ({
      ...i,
      people: peopleByItemId.get(i.id) ?? [],
      places: placesByItemId.get(i.id) ?? [],
    }));

  const categoriesWithItems = categories.map((category) => ({
    category,
    items: itemsForYear.filter((i) => i.categoryId === category.id),
  }));

  return { years, year, categoriesWithItems, allPeople, allPlaces };
}

// --- Workout tracker ---

function toSetEntry(set: { weight: string | null; reps: number | null; durationSeconds: number | null }): SetEntry {
  return {
    weight: set.weight != null ? Number(set.weight) : null,
    reps: set.reps,
    durationSeconds: set.durationSeconds,
  };
}

type WorkoutSetRow = { sessionId: string; weight: string | null; reps: number | null; durationSeconds: number | null };

// Groups an exercise's sets by the session date they were logged on, so
// overload evaluation can compare "session N-1" against "session N" rather
// than individual sets.
function groupSetsBySessionDate<T extends { sessionId: string }>(
  exerciseSets: T[],
  sessionById: Map<string, { date: string }>,
): Map<string, T[]> {
  const bySessionDate = new Map<string, T[]>();
  for (const set of exerciseSets) {
    const session = sessionById.get(set.sessionId);
    if (!session) continue;
    const list = bySessionDate.get(session.date) ?? [];
    list.push(set);
    bySessionDate.set(session.date, list);
  }
  return bySessionDate;
}

function computeOverloadForExercise(
  exerciseSets: WorkoutSetRow[],
  sessionById: Map<string, { date: string }>,
  targetReps: number,
) {
  const bySessionDate = groupSetsBySessionDate(exerciseSets, sessionById);
  const sortedDates = Array.from(bySessionDate.keys()).sort();
  const recentSessionSets = sortedDates.map((d) => bySessionDate.get(d)!.map(toSetEntry));
  return evaluateProgressiveOverload(recentSessionSets, targetReps);
}

export async function getWorkoutPrograms(userId: string) {
  return db
    .select()
    .from(workoutPrograms)
    .where(eq(workoutPrograms.userId, userId))
    .orderBy(workoutPrograms.createdAt);
}

// For the programs-management page: every program alongside its (non-
// archived) days, so rename/reorder/archive controls can be rendered
// per-program without an extra round trip per program.
export async function getWorkoutProgramsWithDays(userId: string) {
  const programs = await getWorkoutPrograms(userId);
  const allDays = await db
    .select()
    .from(workoutDays)
    .where(and(eq(workoutDays.userId, userId), eq(workoutDays.archived, false)))
    .orderBy(workoutDays.orderIndex);

  return programs.map((program) => ({
    program,
    days: allDays.filter((d) => d.programId === program.id),
  }));
}

export async function getWorkoutDays(userId: string, programId: string) {
  return db
    .select()
    .from(workoutDays)
    .where(
      and(
        eq(workoutDays.archived, false),
        eq(workoutDays.userId, userId),
        eq(workoutDays.programId, programId),
      ),
    )
    .orderBy(workoutDays.orderIndex);
}

// Which of the selected program's days have already been logged this
// calendar week, so the page can show progress at a glance (e.g. "Leg day
// done").
export async function getWorkoutWeekProgress(userId: string, programId: string) {
  const days = await db
    .select()
    .from(workoutDays)
    .where(
      and(
        eq(workoutDays.archived, false),
        eq(workoutDays.userId, userId),
        eq(workoutDays.programId, programId),
      ),
    )
    .orderBy(workoutDays.orderIndex);

  const todayOnly = dateOnlyInAppTimezone();
  const weekStart = startOfWeekUtc(todayOnly);
  const weekEnd = new Date(weekStart.getTime() + 6 * MS_PER_DAY);
  const weekStartKey = weekStart.toISOString().slice(0, 10);
  const weekEndKey = weekEnd.toISOString().slice(0, 10);

  const sessions = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        gte(workoutSessions.date, weekStartKey),
        lte(workoutSessions.date, weekEndKey),
        eq(workoutSessions.userId, userId),
      ),
    );

  const countByDayId = new Map<string, number>();
  for (const s of sessions) {
    countByDayId.set(s.dayId, (countByDayId.get(s.dayId) ?? 0) + 1);
  }

  return {
    weekStart,
    weekEnd,
    days: days.map((d) => ({
      id: d.id,
      name: d.name,
      count: countByDayId.get(d.id) ?? 0,
    })),
  };
}

// Two whole-app rollups for the top of the Exercise page: how many active
// exercises are currently flagged ready for a weight increase, and how
// this week's total training volume (weight x reps, strength sets only —
// duration holds like Plank aren't measured in "volume") compares to last
// week's. Scoped to the selected program's days — mixing volume/readiness
// numbers across differently-purposed programs wouldn't mean anything.
export async function getWorkoutDashboardStats(userId: string, programId: string) {
  const programDays = await db
    .select({ id: workoutDays.id })
    .from(workoutDays)
    .where(and(eq(workoutDays.userId, userId), eq(workoutDays.programId, programId)));
  const dayIds = programDays.map((d) => d.id);

  const exercises =
    dayIds.length > 0
      ? await db
          .select()
          .from(workoutExercises)
          .where(
            and(
              eq(workoutExercises.archived, false),
              eq(workoutExercises.userId, userId),
              inArray(workoutExercises.dayId, dayIds),
            ),
          )
      : [];

  const exerciseIds = exercises.map((e) => e.id);
  const allSets =
    exerciseIds.length > 0
      ? await db
          .select()
          .from(workoutSets)
          .where(and(inArray(workoutSets.exerciseId, exerciseIds), eq(workoutSets.userId, userId)))
      : [];

  const sessionIds = Array.from(new Set(allSets.map((s) => s.sessionId)));
  const sessions =
    sessionIds.length > 0
      ? await db
          .select()
          .from(workoutSessions)
          .where(and(inArray(workoutSessions.id, sessionIds), eq(workoutSessions.userId, userId)))
      : [];
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  const setsByExercise = new Map<string, WorkoutSetRow[]>();
  for (const set of allSets) {
    const list = setsByExercise.get(set.exerciseId) ?? [];
    list.push(set);
    setsByExercise.set(set.exerciseId, list);
  }

  const readyExercises: { id: string; name: string; currentWeight: number; suggestedWeight: number }[] =
    [];
  for (const exercise of exercises) {
    const exerciseSets = setsByExercise.get(exercise.id) ?? [];
    const overload = computeOverloadForExercise(exerciseSets, sessionById, exercise.targetReps);
    if (overload.ready && overload.currentWeight != null) {
      readyExercises.push({
        id: exercise.id,
        name: exercise.name,
        currentWeight: overload.currentWeight,
        suggestedWeight: overload.currentWeight + Number(exercise.weightIncrement),
      });
    }
  }

  const todayOnly = dateOnlyInAppTimezone();
  const thisWeekStart = startOfWeekUtc(todayOnly);
  const thisWeekEnd = new Date(thisWeekStart.getTime() + 6 * MS_PER_DAY);
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * MS_PER_DAY);
  const lastWeekEnd = new Date(thisWeekStart.getTime() - MS_PER_DAY);
  const inRange = (dateKey: string, start: Date, end: Date) => {
    const d = new Date(`${dateKey}T00:00:00Z`);
    return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
  };

  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  let thisWeekVolume = 0;
  let lastWeekVolume = 0;
  for (const set of allSets) {
    const exercise = exerciseById.get(set.exerciseId);
    if (!exercise || exercise.tracksDuration) continue;
    if (set.weight == null || set.reps == null) continue;
    const session = sessionById.get(set.sessionId);
    if (!session) continue;
    const volume = Number(set.weight) * set.reps;
    if (inRange(session.date, thisWeekStart, thisWeekEnd)) thisWeekVolume += volume;
    else if (inRange(session.date, lastWeekStart, lastWeekEnd)) lastWeekVolume += volume;
  }

  const volumeTrend: WeekTrend =
    thisWeekVolume === 0 && lastWeekVolume === 0
      ? "no-data"
      : thisWeekVolume > lastWeekVolume
        ? "up"
        : thisWeekVolume < lastWeekVolume
          ? "down"
          : "flat";

  return { readyExercises, thisWeekVolume, lastWeekVolume, volumeTrend };
}

export async function getWorkoutDayData(dayId: string, userId: string) {
  const [day] = await db
    .select()
    .from(workoutDays)
    .where(and(eq(workoutDays.id, dayId), eq(workoutDays.userId, userId)));
  const exercises = await db
    .select()
    .from(workoutExercises)
    .where(
      and(
        eq(workoutExercises.dayId, dayId),
        eq(workoutExercises.archived, false),
        eq(workoutExercises.userId, userId),
      ),
    )
    .orderBy(workoutExercises.orderIndex);

  const sessions = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.dayId, dayId), eq(workoutSessions.userId, userId)))
    .orderBy(desc(workoutSessions.date));
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  const sessionIds = sessions.map((s) => s.id);
  const allSets =
    sessionIds.length > 0
      ? await db
          .select()
          .from(workoutSets)
          .where(and(inArray(workoutSets.sessionId, sessionIds), eq(workoutSets.userId, userId)))
      : [];

  const todayKey = dateKeyInAppTimezone();
  const todaySession = sessions.find((s) => s.date === todayKey) ?? null;

  const todayOnly = dateOnlyInAppTimezone();
  const thisWeekStart = startOfWeekUtc(todayOnly);
  const thisWeekEnd = new Date(thisWeekStart.getTime() + 6 * MS_PER_DAY);
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * MS_PER_DAY);
  const lastWeekEnd = new Date(thisWeekStart.getTime() - MS_PER_DAY);

  const exercisesWithData = exercises.map((exercise) => {
    const exerciseSets = allSets.filter((s) => s.exerciseId === exercise.id);
    const setsBySessionDate = groupSetsBySessionDate(exerciseSets, sessionById);
    const sortedDates = Array.from(setsBySessionDate.keys()).sort();
    const overload = computeOverloadForExercise(exerciseSets, sessionById, exercise.targetReps);

    const inRange = (dateKey: string, start: Date, end: Date) => {
      const d = new Date(`${dateKey}T00:00:00Z`);
      return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
    };
    const thisWeekSets = exerciseSets
      .filter((s) => inRange(sessionById.get(s.sessionId)!.date, thisWeekStart, thisWeekEnd))
      .map(toSetEntry);
    const lastWeekSets = exerciseSets
      .filter((s) => inRange(sessionById.get(s.sessionId)!.date, lastWeekStart, lastWeekEnd))
      .map(toSetEntry);
    const trend = compareWeekOverWeek(thisWeekSets, lastWeekSets);

    const todaySets = (todaySession ? exerciseSets.filter((s) => s.sessionId === todaySession.id) : [])
      .slice()
      .sort((a, b) => a.setNumber - b.setNumber);

    const mostRecentDate = sortedDates[sortedDates.length - 1];
    const lastWeightUsed =
      mostRecentDate !== undefined
        ? (setsBySessionDate
            .get(mostRecentDate)!
            .slice()
            .reverse()
            .find((s) => s.weight != null)?.weight ?? null)
        : null;

    // The most recent session strictly before today, so "last time" always
    // reflects your previous workout even after you've already logged
    // today's first set.
    const priorDates = sortedDates.filter((d) => d !== todayKey);
    const lastSessionDate = priorDates[priorDates.length - 1] ?? null;
    const lastSessionSets =
      lastSessionDate !== null
        ? setsBySessionDate
            .get(lastSessionDate)!
            .slice()
            .sort((a, b) => a.setNumber - b.setNumber)
        : [];

    return {
      ...exercise,
      todaySets,
      trend,
      overload,
      lastWeightUsed: lastWeightUsed != null ? Number(lastWeightUsed) : null,
      lastSessionDate,
      lastSessionSets,
    };
  });

  return { day, exercises: exercisesWithData };
}

export async function getExerciseHistory(exerciseId: string, userId: string) {
  const [exercise] = await db
    .select()
    .from(workoutExercises)
    .where(and(eq(workoutExercises.id, exerciseId), eq(workoutExercises.userId, userId)));
  if (!exercise) return null;

  const sets = await db
    .select()
    .from(workoutSets)
    .where(and(eq(workoutSets.exerciseId, exerciseId), eq(workoutSets.userId, userId)));
  const sessionIds = Array.from(new Set(sets.map((s) => s.sessionId)));
  const sessions =
    sessionIds.length > 0
      ? await db
          .select()
          .from(workoutSessions)
          .where(and(inArray(workoutSessions.id, sessionIds), eq(workoutSessions.userId, userId)))
      : [];
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  const bySessionDate = new Map<string, typeof sets>();
  for (const set of sets) {
    const session = sessionById.get(set.sessionId);
    if (!session) continue;
    const list = bySessionDate.get(session.date) ?? [];
    list.push(set);
    bySessionDate.set(session.date, list);
  }

  const history = Array.from(bySessionDate.entries())
    .map(([date, dateSets]) => ({
      date,
      sets: dateSets.slice().sort((a, b) => a.setNumber - b.setNumber),
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return { exercise, history };
}

// --- Per-user module visibility ---

export async function getModuleSettings(userId: string) {
  const [row] = await db
    .select()
    .from(moduleSettings)
    .where(eq(moduleSettings.userId, userId));
  return (
    row ?? {
      userId,
      showPoints: true,
      showCleaning: true,
      showExercise: true,
      showFinance: true,
      showLists: true,
      showTodo: true,
      showYearReview: true,
      showEmotionCheckin: true,
    }
  );
}

// --- Emotion check-in ---

export async function getTodaysEmotionEntries(userId: string) {
  const todayKey = dateKeyInAppTimezone();
  return db
    .select()
    .from(emotionEntries)
    .where(and(eq(emotionEntries.userId, userId), eq(emotionEntries.date, todayKey)))
    .orderBy(desc(emotionEntries.createdAt));
}

// Read-only lookup for display purposes (e.g. the "+N pts" badge) — doesn't
// create the task if it's missing; saveEmotionEntry's own
// getOrCreateEmotionCheckinTask handles that lazily on first save.
export async function getEmotionCheckinPoints(userId: string): Promise<number> {
  const [task] = await db
    .select({ points: habitTasks.points })
    .from(habitTasks)
    .where(and(eq(habitTasks.userId, userId), eq(habitTasks.name, "Emotion check-in")));
  return task?.points ?? 2;
}

// --- Paycheck & debt payoff plan ---

export async function getPaycheckPlan(userId: string) {
  const [row] = await db.select().from(paycheckPlan).where(eq(paycheckPlan.userId, userId));
  return row ?? null;
}

export async function getBillsLineItems(userId: string) {
  return db
    .select()
    .from(billsLineItems)
    .where(eq(billsLineItems.userId, userId))
    .orderBy(sql`${billsLineItems.dueDay} nulls last`, billsLineItems.orderIndex);
}

// Accepts multiple period keys since the page checks two different
// cadences at once: the twice-a-month pay period (for "Transferred" items)
// and the monthly bill cycle (for "Paid" items).
export async function getChecklistChecks(
  userId: string,
  periodKeys: string[],
): Promise<Set<string>> {
  const rows = await db
    .select({ itemKey: paycheckChecklistChecks.itemKey })
    .from(paycheckChecklistChecks)
    .where(
      and(
        eq(paycheckChecklistChecks.userId, userId),
        inArray(paycheckChecklistChecks.periodKey, periodKeys),
      ),
    );
  return new Set(rows.map((r) => r.itemKey));
}

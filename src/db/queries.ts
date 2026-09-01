import { eq, sum, desc } from "drizzle-orm";
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
} from "./schema";
import {
  projectSavingsDate,
  projectPayoffDate,
  requiredDailyPayment,
  isOnTrack,
  estimateInterestSaved,
} from "@/lib/projections";
import { computeStreak } from "@/lib/streak";
import { computeCleaningStatus } from "@/lib/cleaningStatus";
import { dateKeyInAppTimezone, dateOnlyInAppTimezone } from "@/lib/timezone";
import { computeMinimumPaymentStatus, computeExtraPaidOverMinimum } from "@/lib/minimumPayment";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

async function getBalance(accountId: string, startingBalance: number) {
  const [row] = await db
    .select({ total: sum(transactions.amount) })
    .from(transactions)
    .where(eq(transactions.accountId, accountId));
  return startingBalance + Number(row?.total ?? 0);
}

function streakFromTransactions(txns: { date: Date | string; category: string }[]) {
  return computeStreak(txns.filter((t) => t.category === "recurring_goal").map((t) => t.date));
}

export async function listAccountsSummary() {
  const allAccounts = await db.select().from(accounts).where(eq(accounts.archived, false));

  const savings = allAccounts.filter((a) => a.type === "savings");
  const debts = allAccounts.filter((a) => a.type === "debt");

  const savingsSummaries = await Promise.all(
    savings.map(async (account) => {
      const [details] = await db
        .select()
        .from(savingsDetails)
        .where(eq(savingsDetails.accountId, account.id));
      const [goal] = await db
        .select()
        .from(goals)
        .where(eq(goals.accountId, account.id))
        .orderBy(goals.createdAt);
      const balance = await getBalance(account.id, Number(account.startingBalance));
      const txns = await db
        .select({ date: transactions.date, amount: transactions.amount, category: transactions.category })
        .from(transactions)
        .where(eq(transactions.accountId, account.id));

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
    }),
  );

  const debtSummaries = await Promise.all(
    debts.map(async (account) => {
      const [details] = await db
        .select()
        .from(debtDetails)
        .where(eq(debtDetails.accountId, account.id));
      const [goal] = await db
        .select()
        .from(goals)
        .where(eq(goals.accountId, account.id))
        .orderBy(goals.createdAt);
      const balance = await getBalance(account.id, Number(account.startingBalance));
      const statements = await db
        .select()
        .from(debtStatements)
        .where(eq(debtStatements.accountId, account.id))
        .orderBy(debtStatements.statementDate);
      const latestStatement = statements[statements.length - 1];
      const txns = await db
        .select({
          date: transactions.date,
          amount: transactions.amount,
          category: transactions.category,
        })
        .from(transactions)
        .where(eq(transactions.accountId, account.id));

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
    }),
  );

  return { savingsSummaries, debtSummaries };
}

export async function getSavingsAccountDetail(accountId: string) {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  if (!account) return null;
  const [details] = await db
    .select()
    .from(savingsDetails)
    .where(eq(savingsDetails.accountId, accountId));
  const [goal] = await db
    .select()
    .from(goals)
    .where(eq(goals.accountId, accountId))
    .orderBy(goals.createdAt);
  const txns = await db
    .select()
    .from(transactions)
    .where(eq(transactions.accountId, accountId))
    .orderBy(transactions.date);
  const balance = await getBalance(accountId, Number(account.startingBalance));

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

export async function getDebtAccountDetail(accountId: string) {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  if (!account) return null;
  const [details] = await db
    .select()
    .from(debtDetails)
    .where(eq(debtDetails.accountId, accountId));
  const [goal] = await db
    .select()
    .from(goals)
    .where(eq(goals.accountId, accountId))
    .orderBy(goals.createdAt);
  const statements = await db
    .select()
    .from(debtStatements)
    .where(eq(debtStatements.accountId, accountId))
    .orderBy(debtStatements.statementDate);
  const txns = await db
    .select()
    .from(transactions)
    .where(eq(transactions.accountId, accountId))
    .orderBy(transactions.date);
  const balance = await getBalance(accountId, Number(account.startingBalance));

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

export async function getGamificationStats() {
  const rows = await db
    .select({
      amount: transactions.amount,
      category: transactions.category,
      date: transactions.date,
      accountType: accounts.type,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id));

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

export async function getPointsBalance(): Promise<number> {
  const [[{ habitEarned }], [{ cleaningEarned }], [{ spent }]] = await Promise.all([
    db.select({ habitEarned: sum(habitCompletions.pointsAwarded) }).from(habitCompletions),
    db.select({ cleaningEarned: sum(cleaningCompletions.pointsAwarded) }).from(cleaningCompletions),
    db.select({ spent: sum(redemptions.pointsCost) }).from(redemptions),
  ]);
  return Number(habitEarned ?? 0) + Number(cleaningEarned ?? 0) - Number(spent ?? 0);
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
export async function getPointsSummary() {
  const completions = await db
    .select({ date: habitCompletions.date, pointsAwarded: habitCompletions.pointsAwarded })
    .from(habitCompletions);
  const cleaningCompletionsAll = await db
    .select({ date: cleaningCompletions.date, pointsAwarded: cleaningCompletions.pointsAwarded })
    .from(cleaningCompletions);

  const todayKey = dateKeyInAppTimezone();
  const yesterdayKey = addDaysToDateKey(todayKey, -1);

  const sumForDate = (dateKey: string) =>
    completions.filter((c) => c.date === dateKey).reduce((s, c) => s + c.pointsAwarded, 0) +
    cleaningCompletionsAll
      .filter((c) => c.date === dateKey)
      .reduce((s, c) => s + c.pointsAwarded, 0);

  const distinctDays = Array.from(new Set(completions.map((c) => c.date)));

  const balance = await getPointsBalance();

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

export async function getHabitDashboardData() {
  const categories = await db
    .select()
    .from(habitCategories)
    .orderBy(habitCategories.createdAt);
  const tasks = await db
    .select()
    .from(habitTasks)
    .where(eq(habitTasks.archived, false))
    .orderBy(habitTasks.createdAt);
  const completions = await db.select().from(habitCompletions);
  const activeRewards = await db
    .select()
    .from(rewards)
    .where(eq(rewards.archived, false))
    .orderBy(rewards.cost);
  const recentRedemptions = await db
    .select()
    .from(redemptions)
    .orderBy(redemptions.date);

  const todayKey = dateKeyInAppTimezone();
  const todayCompletionCounts = new Map<string, number>();
  for (const c of completions) {
    if (c.date === todayKey) {
      todayCompletionCounts.set(c.taskId, (todayCompletionCounts.get(c.taskId) ?? 0) + 1);
    }
  }

  const { balance, pointsToday, pointsYesterday, streak } = await getPointsSummary();

  const categoriesWithTasks = categories.map((category) => ({
    category,
    tasks: tasks.filter((t) => t.categoryId === category.id),
  }));
  const unassignedTasks = tasks.filter((t) => !t.categoryId);

  const cleaningCompletionsAll = await db
    .select({ date: cleaningCompletions.date, pointsAwarded: cleaningCompletions.pointsAwarded })
    .from(cleaningCompletions);
  const chartData = buildAllPointsCharts([...completions, ...cleaningCompletionsAll]);

  const cleaningTasksWithStatus = await getCleaningTasksWithStatus();

  return {
    categories,
    categoriesWithTasks,
    unassignedTasks,
    cleaningTasks: cleaningTasksWithStatus,
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

async function getCleaningTasksWithStatus() {
  const areas = await db.select().from(cleaningAreas);
  const areaNameById = new Map(areas.map((a) => [a.id, a.name]));
  const tasks = await db
    .select()
    .from(cleaningTasks)
    .where(eq(cleaningTasks.archived, false))
    .orderBy(cleaningTasks.createdAt);
  const allCompletions = await db.select().from(cleaningCompletions);

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
      doneToday: taskCompletions.some((c) => c.date === todayKey),
    };
  });
}

export async function getCleaningDashboardData() {
  const areas = await db.select().from(cleaningAreas).orderBy(cleaningAreas.createdAt);
  const tasksWithStatus = await getCleaningTasksWithStatus();

  const areasWithTasks = areas.map((area) => ({
    area,
    tasks: tasksWithStatus.filter((t) => t.areaId === area.id),
  }));
  const unassignedTasks = tasksWithStatus.filter((t) => !t.areaId);

  return { areas, areasWithTasks, unassignedTasks };
}

// --- Lists (books to read, movies to watch, etc.) ---

export async function getListsData() {
  const categories = await db.select().from(listCategories).orderBy(listCategories.createdAt);
  const items = await db.select().from(listItems).orderBy(listItems.createdAt);

  const categoriesWithItems = categories.map((category) => ({
    category,
    items: items.filter((i) => i.categoryId === category.id),
  }));

  return { categoriesWithItems };
}

// --- To-do ---

export async function getTodos() {
  return db.select().from(todos).orderBy(desc(todos.createdAt));
}

// --- Year in review ---

function yearOfDateKey(dateKey: string): number {
  return Number(dateKey.slice(0, 4));
}

export async function getYearReviewData(selectedYear?: number) {
  const categories = await db
    .select()
    .from(yearReviewCategories)
    .orderBy(yearReviewCategories.createdAt);
  const allItems = await db.select().from(yearReviewItems).orderBy(desc(yearReviewItems.date));
  const allPeople = await db.select().from(people).orderBy(people.name);
  const itemPeopleLinks = await db.select().from(yearReviewItemPeople);

  const peopleById = new Map(allPeople.map((p) => [p.id, p]));
  const peopleByItemId = new Map<string, { id: string; name: string }[]>();
  for (const link of itemPeopleLinks) {
    const person = peopleById.get(link.personId);
    if (!person) continue;
    const list = peopleByItemId.get(link.itemId) ?? [];
    list.push(person);
    peopleByItemId.set(link.itemId, list);
  }

  const currentYear = yearOfDateKey(dateKeyInAppTimezone());
  const yearsWithData = allItems.map((i) => yearOfDateKey(i.date));
  const years = Array.from(new Set([currentYear, ...yearsWithData])).sort((a, b) => b - a);

  const year = selectedYear ?? currentYear;
  const itemsForYear = allItems
    .filter((i) => yearOfDateKey(i.date) === year)
    .map((i) => ({ ...i, people: peopleByItemId.get(i.id) ?? [] }));

  const categoriesWithItems = categories.map((category) => ({
    category,
    items: itemsForYear.filter((i) => i.categoryId === category.id),
  }));

  return { years, year, categoriesWithItems, allPeople };
}

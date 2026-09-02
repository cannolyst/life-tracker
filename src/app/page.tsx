import Link from "next/link";
import {
  getPointsSummary,
  getCleaningDashboardData,
  listAccountsSummary,
  getTodos,
} from "@/db/queries";
import { Nav } from "@/components/Nav";
import { Card, formatCurrency, formatDate } from "@/components/ui";
import { MinimumPaymentBadge } from "@/components/MinimumPaymentBadge";
import { StreakBadge } from "@/components/StreakBadge";
import { classifyByTimeframe, type CleaningStatus, type CleaningTimeframeBucket } from "@/lib/cleaningStatus";

export const dynamic = "force-dynamic";

type CleaningTask = {
  id: string;
  name: string;
  dueDate: Date;
  status: CleaningStatus;
  areaName: string | null;
};

export default async function OverviewPage() {
  const [pointsSummary, cleaning, { debtSummaries }, allTodos] = await Promise.all([
    getPointsSummary(),
    getCleaningDashboardData(),
    listAccountsSummary(),
    getTodos(),
  ]);
  const { balance, pointsToday, pointsYesterday, streak } = pointsSummary;
  const activeTodos = allTodos.filter((t) => !t.done);

  const allCleaningTasks: CleaningTask[] = [
    ...cleaning.areasWithTasks.flatMap(({ area, tasks }) =>
      tasks.map((t) => ({ ...t, areaName: area.name })),
    ),
    ...cleaning.unassignedTasks.map((t) => ({ ...t, areaName: null })),
  ];

  const byDueDate = (a: CleaningTask, b: CleaningTask) => a.dueDate.getTime() - b.dueDate.getTime();
  const buckets: Record<CleaningTimeframeBucket, CleaningTask[]> = {
    overdue: [],
    week: [],
    "next-week": [],
    month: [],
    later: [],
  };
  for (const task of allCleaningTasks) {
    buckets[classifyByTimeframe(task.status, task.dueDate)].push(task);
  }
  for (const tasks of Object.values(buckets)) tasks.sort(byDueDate);

  const dueOverdue = buckets.overdue;
  const dueThisWeek = buckets.week;
  const dueNextWeek = buckets["next-week"];
  // Later-than-this-month tasks aren't urgent enough to earn their own
  // column in this compact teaser — they're still visible in full on
  // /cleaning — so they're folded in alongside the rest of the month here.
  const dueThisMonth = [...buckets.month, ...buckets.later].sort(byDueDate);

  const paymentsDue = debtSummaries.filter(
    (d) => d.latestStatement && Number(d.latestStatement.minimumPaymentDue) > 0,
  );

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-8">
        <h1 className="text-xl font-semibold">Overview</h1>

        <Link href="/points" className="block">
          <Card className="transition hover:border-neutral-600">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-neutral-500">Total points</p>
                <p className="text-2xl font-semibold">{balance}</p>
              </div>
              <div>
                <p className="text-neutral-500">Yesterday</p>
                <p className="text-2xl font-semibold">{pointsYesterday}</p>
              </div>
              <div>
                <p className="text-neutral-500">Today</p>
                <p className="text-2xl font-semibold">{pointsToday}</p>
              </div>
              <div>
                <p className="text-neutral-500">Streak</p>
                <p className="text-2xl font-semibold">{streak > 0 ? `Day ${streak}` : "—"}</p>
                {streak > 0 && (
                  <div className="mt-0.5">
                    <StreakBadge streak={streak} />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </Link>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">To-do</h2>
            <Link href="/todo" className="text-sm text-neutral-500 hover:text-neutral-100">
              View all
            </Link>
          </div>
          {activeTodos.length === 0 ? (
            <Card>
              <p className="text-sm text-neutral-500">Nothing to do — nice.</p>
            </Card>
          ) : (
            <Card>
              <ul className="divide-y divide-neutral-800">
                {activeTodos.map((todo) => (
                  <li key={todo.id} className="py-2 text-sm">
                    {todo.text}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Cleaning</h2>
            <Link href="/cleaning" className="text-sm text-neutral-500 hover:text-neutral-100">
              View all
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CleaningColumn title="Overdue" tasks={dueOverdue} emptyLabel="Nothing overdue" />
            <CleaningColumn title="This week" tasks={dueThisWeek} emptyLabel="Nothing due this week" />
            <CleaningColumn title="Next week" tasks={dueNextWeek} emptyLabel="Nothing due next week" />
            <CleaningColumn title="This month" tasks={dueThisMonth} emptyLabel="Nothing else due this month" />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Payments due</h2>
            <Link href="/finance" className="text-sm text-neutral-500 hover:text-neutral-100">
              View all
            </Link>
          </div>
          {paymentsDue.length === 0 ? (
            <Card>
              <p className="text-sm text-neutral-500">No minimum payments due right now.</p>
            </Card>
          ) : (
            <Card>
              <ul className="divide-y divide-neutral-800">
                {paymentsDue.map((d) => (
                  <li key={d.account.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <Link href={`/debt/${d.account.id}`} className="hover:underline">
                      {d.account.name}
                    </Link>
                    <div className="flex items-center gap-3">
                      <span className="text-neutral-500">
                        {formatCurrency(Number(d.latestStatement!.minimumPaymentDue))} due
                      </span>
                      <MinimumPaymentBadge status={d.minimumPaymentStatus} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}

function CleaningColumn({
  title,
  tasks,
  emptyLabel,
}: {
  title: string;
  tasks: CleaningTask[];
  emptyLabel: string;
}) {
  return (
    <Card>
      <h3 className="mb-2 text-sm font-medium text-neutral-500">{title}</h3>
      {tasks.length === 0 ? (
        <p className="text-sm text-neutral-500">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li key={task.id} className="text-sm">
              <p>{task.name}</p>
              <p className="text-xs text-neutral-500">
                {task.areaName ? `${task.areaName} · ` : ""}
                {formatDate(task.dueDate)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

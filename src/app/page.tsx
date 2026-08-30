import Link from "next/link";
import {
  getPointsEarnedToday,
  getCleaningDashboardData,
  listAccountsSummary,
} from "@/db/queries";
import { Nav } from "@/components/Nav";
import { Card, formatCurrency, formatDate } from "@/components/ui";
import { MinimumPaymentBadge } from "@/components/MinimumPaymentBadge";
import { dateOnlyInAppTimezone } from "@/lib/timezone";

export const dynamic = "force-dynamic";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

type CleaningTask = { id: string; name: string; dueDate: Date; status: string; areaName: string | null };

export default async function OverviewPage() {
  const [pointsToday, cleaning, { debtSummaries }] = await Promise.all([
    getPointsEarnedToday(),
    getCleaningDashboardData(),
    listAccountsSummary(),
  ]);

  const allCleaningTasks: CleaningTask[] = [
    ...cleaning.areasWithTasks.flatMap(({ area, tasks }) =>
      tasks.map((t) => ({ ...t, areaName: area.name })),
    ),
    ...cleaning.unassignedTasks.map((t) => ({ ...t, areaName: null })),
  ];

  const todayOnly = dateOnlyInAppTimezone();
  const daysUntil = (dueDate: Date) =>
    Math.round((dueDate.getTime() - todayOnly.getTime()) / MS_PER_DAY);

  const dueToday = allCleaningTasks
    .filter((t) => t.status === "overdue" || t.status === "due-today")
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const dueThisWeek = allCleaningTasks
    .filter((t) => t.status === "upcoming" && daysUntil(t.dueDate) <= 7)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const dueThisMonth = allCleaningTasks
    .filter((t) => t.status === "upcoming" && daysUntil(t.dueDate) > 7 && daysUntil(t.dueDate) <= 30)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const paymentsDue = debtSummaries.filter(
    (d) => d.latestStatement && Number(d.latestStatement.minimumPaymentDue) > 0,
  );

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-8">
        <h1 className="text-xl font-semibold">Overview</h1>

        <Link href="/points">
          <Card className="transition hover:border-neutral-600">
            <p className="text-sm text-neutral-500">Points earned today</p>
            <p className="text-3xl font-bold">{pointsToday}</p>
          </Card>
        </Link>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Cleaning</h2>
            <Link href="/cleaning" className="text-sm text-neutral-500 hover:text-neutral-100">
              View all
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <CleaningColumn title="Today" tasks={dueToday} emptyLabel="Nothing due today" />
            <CleaningColumn title="This week" tasks={dueThisWeek} emptyLabel="Nothing due this week" />
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
                {task.status === "overdue" ? "Overdue" : formatDate(task.dueDate)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

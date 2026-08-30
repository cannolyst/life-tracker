import Link from "next/link";
import {
  getPointsBalance,
  getGamificationStats,
  getCleaningDashboardData,
} from "@/db/queries";
import { Nav } from "@/components/Nav";
import { Card, formatCurrency, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [balance, stats, cleaning] = await Promise.all([
    getPointsBalance(),
    getGamificationStats(),
    getCleaningDashboardData(),
  ]);

  const allCleaningTasks = [
    ...cleaning.areasWithTasks.flatMap((a) => a.tasks),
    ...cleaning.unassignedTasks,
  ];
  const overdueCount = allCleaningTasks.filter((t) => t.status === "overdue").length;
  const nextDue = [...allCleaningTasks].sort(
    (a, b) => a.dueDate.getTime() - b.dueDate.getTime(),
  )[0];

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold">Overview</h1>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/points">
            <Card className="transition hover:border-neutral-600">
              <p className="text-sm text-neutral-500">Points balance</p>
              <p className="text-2xl font-semibold">{balance}</p>
            </Card>
          </Link>
          <Link href="/cleaning">
            <Card className="transition hover:border-neutral-600">
              <p className="text-sm text-neutral-500">Cleaning</p>
              {overdueCount > 0 ? (
                <p className="text-2xl font-semibold text-red-400">{overdueCount} overdue</p>
              ) : (
                <p className="text-2xl font-semibold text-emerald-400">All caught up</p>
              )}
              {nextDue && (
                <p className="text-sm text-neutral-500">
                  Next: {nextDue.name} ({formatDate(nextDue.dueDate)})
                </p>
              )}
            </Card>
          </Link>
          <Link href="/finance">
            <Card className="transition hover:border-neutral-600">
              <p className="text-sm text-neutral-500">Saved this month</p>
              <p className="text-2xl font-semibold text-emerald-400">
                {formatCurrency(stats.monthSaved)}
              </p>
              <p className="text-sm text-neutral-500">
                {formatCurrency(stats.monthPaidDebt)} paid toward debt
              </p>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}

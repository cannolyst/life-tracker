import Link from "next/link";
import { listAccountsSummary, getGamificationStats } from "@/db/queries";

export const dynamic = "force-dynamic";
import { Nav } from "@/components/Nav";
import { Card, ProgressBar, buttonClass, formatCurrency, formatDate } from "@/components/ui";
import { StreakBadge } from "@/components/StreakBadge";
import { PaceBadge } from "@/components/PaceBadge";
import { MinimumPaymentBadge } from "@/components/MinimumPaymentBadge";

export default async function DashboardPage() {
  const [{ savingsSummaries, debtSummaries }, stats] = await Promise.all([
    listAccountsSummary(),
    getGamificationStats(),
  ]);

  const totalInterestSaved = debtSummaries.reduce(
    (sum, d) => sum + (d.interestSaved ?? 0),
    0,
  );
  const totalExtraPaidOverMinimum = debtSummaries.reduce(
    (sum, d) => sum + d.extraPaidOverMinimum,
    0,
  );

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-10 px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Finance</h1>
          <Link href="/accounts/new" className={buttonClass}>
            New account
          </Link>
        </div>

        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">{stats.monthLabel}</h2>
            <span className="text-sm text-neutral-400">
              {stats.daysHitGoal}/{stats.daysInMonthSoFar} days hit your daily goal
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-neutral-500">Saved this month</p>
              <p className="font-medium text-emerald-400">{formatCurrency(stats.monthSaved)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Paid toward debt this month</p>
              <p className="font-medium text-emerald-400">
                {formatCurrency(stats.monthPaidDebt)}
              </p>
            </div>
            <div>
              <p className="text-neutral-500">Lifetime saved</p>
              <p className="font-medium">{formatCurrency(stats.lifetimeSaved)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Lifetime paid toward debt</p>
              <p className="font-medium">{formatCurrency(stats.lifetimePaidDebt)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Interest saved (est.)</p>
              <p className="font-medium text-emerald-400">{formatCurrency(totalInterestSaved)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Paid over minimum</p>
              <p className="font-medium text-emerald-400">
                {formatCurrency(totalExtraPaidOverMinimum)}
              </p>
            </div>
          </div>
        </Card>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Savings goals</h2>
          {savingsSummaries.length === 0 ? (
            <EmptyState label="No savings goals yet" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {savingsSummaries.map((s) => (
                <Link key={s.account.id} href={`/savings/${s.account.id}`}>
                  <Card className="transition hover:border-neutral-600">
                    <div className="mb-2 flex items-baseline justify-between">
                      <h3 className="font-medium">{s.account.name}</h3>
                      <span className="text-sm text-neutral-400">
                        {formatCurrency(s.dailyGoal)}/day
                      </span>
                    </div>
                    <div className="mb-3 flex items-baseline justify-between">
                      <p className="text-2xl font-semibold">{formatCurrency(s.balance)}</p>
                      <StreakBadge streak={s.streak} />
                    </div>
                    {s.goal ? (
                      <>
                        <ProgressBar fraction={s.balance / Number(s.goal.targetAmount)} />
                        <div className="mt-2 flex items-center justify-between text-sm text-neutral-400">
                          <span>Goal: {formatCurrency(Number(s.goal.targetAmount))}</span>
                          <span>Projected: {formatDate(s.projectedDate)}</span>
                        </div>
                        {s.pace !== null && (
                          <div className="mt-2">
                            <PaceBadge onTrack={s.pace} />
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-neutral-500">No goal set</p>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Credit card debt</h2>
          {debtSummaries.length === 0 ? (
            <EmptyState label="No credit cards tracked yet" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {debtSummaries.map((d) => (
                <Link key={d.account.id} href={`/debt/${d.account.id}`}>
                  <Card className="transition hover:border-neutral-600">
                    <div className="mb-2 flex items-baseline justify-between">
                      <h3 className="font-medium">{d.account.name}</h3>
                      <span className="text-sm text-neutral-400">
                        {(d.apr * 100).toFixed(2)}% APR
                      </span>
                    </div>
                    <div className="mb-3 flex items-baseline justify-between">
                      <p className="text-2xl font-semibold">{formatCurrency(d.balance)}</p>
                      <StreakBadge streak={d.streak} />
                    </div>
                    <div className="flex justify-between text-sm text-neutral-400">
                      <span>
                        Min due:{" "}
                        {d.latestStatement
                          ? formatCurrency(Number(d.latestStatement.minimumPaymentDue))
                          : "—"}
                      </span>
                      <span>Payoff: {formatDate(d.projectedDate)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <MinimumPaymentBadge status={d.minimumPaymentStatus} />
                    </div>
                    {d.pace !== null && (
                      <div className="mt-2">
                        <PaceBadge onTrack={d.pace} />
                      </div>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-800 p-8 text-center text-neutral-500">
      {label}
    </div>
  );
}

import { notFound } from "next/navigation";
import { getDebtAccountDetail } from "@/db/queries";
import { Nav } from "@/components/Nav";
import { Card, formatCurrency, formatDate, buildBalancePoints } from "@/components/ui";
import { BalanceChart } from "@/components/BalanceChart";
import { AddTransactionForm, StatementForm, SettingsForm, GoalForm } from "./DebtForms";
import { deleteDebtTransaction } from "./actions";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { DeleteTransactionButton } from "@/components/DeleteTransactionButton";
import { StreakBadge } from "@/components/StreakBadge";
import { PaceBadge } from "@/components/PaceBadge";
import { MinimumPaymentBadge } from "@/components/MinimumPaymentBadge";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  one_time: "one-time payment",
  recurring_goal: "daily micropayment",
  minimum_payment: "minimum payment",
  interest: "interest charged",
};

export default async function DebtDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const detail = await getDebtAccountDetail(accountId);
  if (!detail) notFound();

  const {
    account,
    details,
    goal,
    statements,
    transactions,
    balance,
    projectedDate,
    requiredDaily,
    pace,
    streak,
    minimumPaymentStatus,
    interestSaved,
    extraPaidOverMinimum,
  } = detail;

  const points = buildBalancePoints(
    Number(account.startingBalance),
    account.createdAt,
    transactions,
  );

  const latestStatement = statements[statements.length - 1];

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">{account.name}</h1>
            <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
            <div className="mt-1">
              <StreakBadge streak={streak} />
            </div>
          </div>
          <DeleteAccountButton accountId={account.id} accountName={account.name} />
        </div>

        <Card>
          <BalanceChart points={points} />
        </Card>

        <Card>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-neutral-500">APR</p>
              <p className="font-medium">{((Number(details?.apr) || 0) * 100).toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-neutral-500">Daily micropayment</p>
              <p className="font-medium">
                {formatCurrency(Number(details?.dailyMicropaymentGoal ?? 0))}
              </p>
            </div>
            <div>
              <p className="text-neutral-500">Statement day</p>
              <p className="font-medium">{details?.statementDay ?? "—"}</p>
            </div>
            <div>
              <p className="text-neutral-500">Min. due (latest)</p>
              <p className="font-medium">
                {latestStatement
                  ? formatCurrency(Number(latestStatement.minimumPaymentDue))
                  : "—"}
              </p>
              <div className="mt-1">
                <MinimumPaymentBadge status={minimumPaymentStatus} />
              </div>
            </div>
            <div>
              <p className="text-neutral-500">Projected payoff</p>
              <p className="font-medium">{formatDate(projectedDate)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Interest saved (est.)</p>
              <p className="font-medium text-emerald-400">
                {interestSaved === null ? "—" : formatCurrency(interestSaved)}
              </p>
            </div>
            <div>
              <p className="text-neutral-500">Paid over minimum</p>
              <p className="font-medium text-emerald-400">
                {formatCurrency(extraPaidOverMinimum)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-medium">Payoff goal</h2>
          {goal?.targetDate ? (
            <p className="mb-3 text-sm text-neutral-400">
              Goal date: <span className="text-neutral-200">{formatDate(goal.targetDate)}</span>
              {" — "}
              {requiredDaily === null ? (
                <span className="text-red-400">
                  not achievable by this date; try a later one
                </span>
              ) : requiredDaily === 0 ? (
                <span className="text-emerald-400">
                  on track — your projected payoff already beats this date 🎉
                </span>
              ) : (
                <span>
                  pay{" "}
                  <span className="font-medium text-neutral-200">
                    {formatCurrency(requiredDaily)}/day
                  </span>{" "}
                  (~{formatCurrency((requiredDaily * 365) / 12)}/month) to hit it
                </span>
              )}
            </p>
          ) : (
            <p className="mb-3 text-sm text-neutral-500">No payoff goal date set.</p>
          )}
          {pace !== null && (
            <div className="mb-3">
              <PaceBadge onTrack={pace} />
            </div>
          )}
          <GoalForm accountId={account.id} targetDate={goal?.targetDate} />
        </Card>

        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-medium">Add transaction</h2>
            <AddTransactionForm accountId={account.id} />
          </Card>
          <Card>
            <h2 className="mb-3 font-medium">Log monthly statement</h2>
            <StatementForm accountId={account.id} />
          </Card>
        </div>

        <Card>
          <h2 className="mb-3 font-medium">Card settings</h2>
          <SettingsForm
            accountId={account.id}
            aprPercent={(Number(details?.apr) || 0) * 100}
            dailyMicropaymentGoal={Number(details?.dailyMicropaymentGoal ?? 0)}
            statementDay={details?.statementDay ?? 1}
          />
        </Card>

        <Card>
          <h2 className="mb-3 font-medium">Statement history</h2>
          {statements.length === 0 ? (
            <p className="text-sm text-neutral-500">No statements logged yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-800">
              {[...statements].reverse().map((s) => (
                <li key={s.id} className="flex justify-between py-2 text-sm">
                  <span className="text-neutral-300">{formatDate(s.statementDate)}</span>
                  <span className="text-neutral-400">
                    Min due {formatCurrency(Number(s.minimumPaymentDue))} · Interest{" "}
                    {formatCurrency(Number(s.interestCharged))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-medium">Transactions</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-neutral-500">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-800">
              {[...transactions].reverse().map((t) => (
                <li key={t.id} className="flex justify-between py-2 text-sm">
                  <div>
                    <span className="text-neutral-300">{formatDate(t.date)}</span>{" "}
                    <span className="text-neutral-500">
                      ({CATEGORY_LABELS[t.category] ?? t.category})
                    </span>
                    {t.note && <span className="text-neutral-500"> — {t.note}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={Number(t.amount) <= 0 ? "text-emerald-400" : "text-red-400"}>
                      {Number(t.amount) >= 0 ? "+" : ""}
                      {formatCurrency(Number(t.amount))}
                    </span>
                    <DeleteTransactionButton
                      action={deleteDebtTransaction.bind(null, account.id, t.id)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
}

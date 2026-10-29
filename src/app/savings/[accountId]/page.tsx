import { notFound } from "next/navigation";
import { AddRow } from "@/components/AddRow";
import { dateKeyIn } from "@/lib/timezone";
import { getUserSettings } from "@/db/userSettings";
import { Board, W } from "@/components/Board";
import { getSavingsAccountDetail } from "@/db/queries";
import { requireUserId } from "@/lib/session";
import { Nav } from "@/components/Nav";
import { Card, ProgressBar, formatCurrency, formatDate, buildBalancePoints } from "@/components/ui";
import { BalanceChart } from "@/components/BalanceChart";
import { AddTransactionForm, GoalForm } from "./SavingsForms";
import { deleteSavingsTransaction } from "./actions";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { DeleteTransactionButton } from "@/components/DeleteTransactionButton";
import { StreakBadge } from "@/components/StreakBadge";
import { PaceBadge } from "@/components/PaceBadge";

export const dynamic = "force-dynamic";

export default async function SavingsDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const userId = await requireUserId();
  const settings = await getUserSettings(userId);
  const tz = settings.timezone;
  const detail = await getSavingsAccountDetail(accountId, userId);
  if (!detail) notFound();

  const { account, details, goal, transactions, balance, projectedDate, pace, streak } = detail;

  const points = buildBalancePoints(
    Number(account.startingBalance),
    account.createdAt,
    transactions,
    tz,
  );

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="board-page mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
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
        <Board pageId="savings" columnCount={3} saved={settings.layouts.savings}>
        <W id="chart" label="Balance chart" col={0}>
        <Card>
          <BalanceChart points={points} />
        </Card>
        </W>

        <W id="goal" label="Goal" col={0}>
        {goal && (
          <Card>
            <div className="mb-2 flex justify-between text-sm text-neutral-400">
              <span>Goal: {formatCurrency(Number(goal.targetAmount))}</span>
              <span>Projected: {formatDate(projectedDate)}</span>
              {goal.targetDate && <span>Target: {formatDate(goal.targetDate)}</span>}
            </div>
            <ProgressBar fraction={balance / Number(goal.targetAmount)} />
            {pace !== null && (
              <div className="mt-2">
                <PaceBadge onTrack={pace} />
              </div>
            )}
          </Card>
        )}
        </W>

        <W id="add-transaction" label="Add transaction" col={1}>
          <AddRow title="Add transaction">
<AddTransactionForm accountId={account.id} today={dateKeyIn(tz)} />
</AddRow>
        </W>

        <W id="settings" label="Goal settings" col={2}>
          <Card>
            <h2 className="mb-3 font-medium">Goal settings</h2>
            <GoalForm
              accountId={account.id}
              dailyGoal={Number(details?.dailyGoal ?? 0)}
              targetAmount={goal ? Number(goal.targetAmount) : undefined}
              targetDate={goal?.targetDate}
            />
          </Card>
        </W>

        <W id="transactions" label="Transactions" col={1}>
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
                      ({t.category === "one_time" ? "one-time" : "daily goal"})
                    </span>
                    {t.note && <span className="text-neutral-500"> — {t.note}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={Number(t.amount) >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {Number(t.amount) >= 0 ? "+" : ""}
                      {formatCurrency(Number(t.amount))}
                    </span>
                    <DeleteTransactionButton
                      action={deleteSavingsTransaction.bind(null, account.id, t.id)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        </W>

        </Board>
      </main>
    </div>
  );
}

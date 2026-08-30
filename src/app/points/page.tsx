import { getHabitDashboardData } from "@/db/queries";
import { Nav } from "@/components/Nav";
import { Card, buttonClass, formatCurrency, formatDate } from "@/components/ui";
import { StreakBadge } from "@/components/StreakBadge";
import { PointsChart } from "@/components/PointsChart";
import { AddCategoryForm, AddTaskForm, AddRewardForm } from "./PointsForms";
import {
  toggleTaskCompletion,
  logRepeatableCompletion,
  undoRepeatableCompletion,
  archiveTask,
  archiveReward,
  redeemReward,
} from "./actions";

export const dynamic = "force-dynamic";

type Task = { id: string; name: string; points: number; repeatable: boolean };

export default async function PointsPage() {
  const {
    categoriesWithTasks,
    unassignedTasks,
    todayCompletionCounts,
    balance,
    streak,
    chartData,
    activeRewards,
    recentRedemptions,
    categories,
  } = await getHabitDashboardData();

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-8">
        <div>
          <p className="text-sm text-neutral-500">Points balance</p>
          <p className="text-3xl font-bold">{balance}</p>
          <div className="mt-1">
            <StreakBadge streak={streak} />
          </div>
        </div>

        <Card>
          <PointsChart data={chartData} />
        </Card>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Today&apos;s tasks</h2>
          {categoriesWithTasks.map(
            ({ category, tasks }) =>
              tasks.length > 0 && (
                <Card key={category.id}>
                  <h3 className="mb-2 font-medium">{category.name}</h3>
                  <TaskList tasks={tasks} counts={todayCompletionCounts} />
                </Card>
              ),
          )}
          {unassignedTasks.length > 0 && (
            <Card>
              <h3 className="mb-2 font-medium">Other</h3>
              <TaskList tasks={unassignedTasks} counts={todayCompletionCounts} />
            </Card>
          )}
          {categoriesWithTasks.every(({ tasks }) => tasks.length === 0) &&
            unassignedTasks.length === 0 && (
              <p className="text-sm text-neutral-500">No tasks yet — add one below.</p>
            )}
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-medium">Add category</h2>
            <AddCategoryForm />
          </Card>
          <Card>
            <h2 className="mb-3 font-medium">Add task</h2>
            <AddTaskForm categories={categories} />
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Rewards</h2>
          {activeRewards.length === 0 ? (
            <p className="text-sm text-neutral-500">No rewards yet — add one below.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {activeRewards.map((reward) => (
                <Card key={reward.id}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <h3 className="font-medium">{reward.name}</h3>
                    <span className="text-sm text-neutral-400">{reward.cost} pts</span>
                  </div>
                  {reward.priceUsd && (
                    <p className="mb-2 text-sm text-neutral-500">
                      ~{formatCurrency(Number(reward.priceUsd))}
                    </p>
                  )}
                  {reward.link && (
                    <a
                      href={reward.link}
                      target="_blank"
                      rel="noreferrer"
                      className="mb-2 block text-sm text-neutral-400 underline"
                    >
                      Link
                    </a>
                  )}
                  <div className="flex gap-2">
                    <form action={redeemReward.bind(null, reward.id)}>
                      <button
                        type="submit"
                        disabled={balance < reward.cost}
                        className={buttonClass}
                      >
                        Redeem
                      </button>
                    </form>
                    <form action={archiveReward.bind(null, reward.id)}>
                      <button
                        type="submit"
                        className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-400 hover:text-neutral-100"
                      >
                        Archive
                      </button>
                    </form>
                  </div>
                </Card>
              ))}
            </div>
          )}
          <Card>
            <h3 className="mb-3 font-medium">Add reward</h3>
            <AddRewardForm />
          </Card>
        </section>

        {recentRedemptions.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Recent redemptions</h2>
            <Card>
              <ul className="divide-y divide-neutral-800">
                {recentRedemptions.map((r) => (
                  <li key={r.id} className="flex justify-between py-2 text-sm">
                    <span className="text-neutral-300">{r.rewardName}</span>
                    <span className="text-neutral-500">
                      {formatDate(r.date)} · {r.pointsCost} pts
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}

function TaskList({
  tasks,
  counts,
}: {
  tasks: Task[];
  counts: Map<string, number>;
}) {
  return (
    <ul className="space-y-2">
      {tasks.map((task) => {
        const count = counts.get(task.id) ?? 0;
        return (
          <li key={task.id} className="flex items-center justify-between gap-3">
            {task.repeatable ? (
              <div className="flex flex-1 items-center justify-between rounded-md border border-neutral-800 px-3 py-2 text-sm text-neutral-300">
                <span>{task.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-neutral-500">
                    {count > 0 ? `${count}× today · ` : ""}
                    {task.points} pts
                  </span>
                  <form action={undoRepeatableCompletion.bind(null, task.id)}>
                    <button
                      type="submit"
                      disabled={count === 0}
                      className="rounded border border-neutral-700 px-2 text-neutral-400 disabled:opacity-40"
                    >
                      −
                    </button>
                  </form>
                  <form action={logRepeatableCompletion.bind(null, task.id)}>
                    <button
                      type="submit"
                      className="rounded border border-neutral-700 px-2 text-neutral-400 hover:text-neutral-100"
                    >
                      +
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <form action={toggleTaskCompletion.bind(null, task.id)} className="flex-1">
                <button
                  type="submit"
                  className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
                    count > 0
                      ? "border-emerald-800 bg-emerald-950 text-emerald-300"
                      : "border-neutral-800 text-neutral-300 hover:border-neutral-600"
                  }`}
                >
                  <span>
                    {count > 0 ? "✓ " : ""}
                    {task.name}
                  </span>
                  <span className="text-neutral-500">{task.points} pts</span>
                </button>
              </form>
            )}
            <form action={archiveTask.bind(null, task.id)}>
              <button
                type="submit"
                aria-label="Archive task"
                className="text-neutral-600 hover:text-red-400"
              >
                ✕
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}

import { getHabitDashboardData } from "@/db/queries";
import { Nav } from "@/components/Nav";
import { Card, buttonClass, formatCurrency, formatDate } from "@/components/ui";
import { StreakBadge } from "@/components/StreakBadge";
import { PointsChart } from "@/components/PointsChart";
import { AddCategoryForm, AddTaskForm, AddRewardForm } from "./PointsForms";
import { TaskRow } from "./TaskRow";
import { jewelFor, NEUTRAL_JEWEL } from "@/lib/jewels";
import { archiveReward, redeemReward } from "./actions";

export const dynamic = "force-dynamic";

type Task = { id: string; name: string; points: number; repeatable: boolean; categoryId: string | null };

export default async function PointsPage() {
  const {
    categoriesWithTasks,
    unassignedTasks,
    todayCompletionCounts,
    balance,
    pointsToday,
    pointsYesterday,
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
        <Card>
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

        <Card>
          <PointsChart data={chartData} />
        </Card>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Today&apos;s tasks</h2>
          {categoriesWithTasks.map(
            ({ category, tasks }, i) =>
              tasks.length > 0 && (
                <Card key={category.id}>
                  <h3 className="mb-2 flex items-center gap-2 font-medium">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: jewelFor(i).color }}
                    />
                    {category.name}
                  </h3>
                  <TaskList
                    tasks={tasks}
                    counts={todayCompletionCounts}
                    jewel={jewelFor(i)}
                    categories={categories}
                  />
                </Card>
              ),
          )}
          {unassignedTasks.length > 0 && (
            <Card>
              <h3 className="mb-2 flex items-center gap-2 font-medium">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: NEUTRAL_JEWEL.color }}
                />
                Other
              </h3>
              <TaskList
                tasks={unassignedTasks}
                counts={todayCompletionCounts}
                jewel={NEUTRAL_JEWEL}
                categories={categories}
              />
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
              {activeRewards.map((reward, i) => {
                const jewel = jewelFor(i);
                const affordable = balance >= reward.cost;
                return (
                  <Card key={reward.id}>
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <h3 className="font-medium">{reward.name}</h3>
                      <span className="whitespace-nowrap text-sm" style={{ color: jewel.color }}>
                        {reward.cost} pts
                      </span>
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
                          disabled={!affordable}
                          className={`${buttonClass} disabled:bg-neutral-800 disabled:text-neutral-500`}
                          style={affordable ? { backgroundColor: jewel.color, color: "#fff" } : undefined}
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
                );
              })}
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
  jewel,
  categories,
}: {
  tasks: Task[];
  counts: Map<string, number>;
  jewel: { color: string; soft: string };
  categories: { id: string; name: string }[];
}) {
  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          count={counts.get(task.id) ?? 0}
          jewel={jewel}
          categories={categories}
        />
      ))}
    </ul>
  );
}

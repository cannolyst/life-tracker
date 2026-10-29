import type { ReactNode } from "react";
import { getHabitDashboardData } from "@/db/queries";
import { AddRow } from "@/components/AddRow";
import { getUserSettings } from "@/db/userSettings";
import { isFeatureOn } from "@/lib/features";
import { requireUserId } from "@/lib/session";
import { Nav } from "@/components/Nav";
import { Board, W } from "@/components/Board";
import { Card, formatCurrency, formatDate } from "@/components/ui";
import { StreakBadge } from "@/components/StreakBadge";
import { PointsChart } from "@/components/PointsChart";
import { AddCategoryForm, AddTaskForm, AddRewardForm } from "./PointsForms";
import { TaskRow } from "./TaskRow";
import { WeeklyTaskRow } from "./WeeklyTaskRow";
import { jewelFor, NEUTRAL_JEWEL } from "@/lib/jewels";
import { Sparkle } from "@/components/Sparkle";
import { archiveReward, redeemReward } from "./actions";
import { TaskList as CleaningTaskList } from "@/app/cleaning/TaskList";

export const dynamic = "force-dynamic";

type Task = {
  id: string;
  name: string;
  points: number;
  repeatable: boolean;
  categoryId: string | null;
  block: string | null;
};

// Every card on this page opens the same way: a title on the left, a quiet note on the right.
function CardHeader({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-medium text-neutral-200">{title}</h2>
      {note && <span className="text-xs text-neutral-500">{note}</span>}
    </div>
  );
}

// A category inside a card: a small label, then its rows.
function Group({ name, color, children }: { name: string; color: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mt-3 flex items-center gap-2 text-xs font-medium text-neutral-500 first:mt-0">
        <Sparkle className="h-3 w-3" color={color} />
        {name}
      </h3>
      {children}
    </div>
  );
}

export default async function PointsPage() {
  const userId = await requireUserId();
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
    cleaningTasks,
    weeklyCategoriesWithTasks,
    weeklyUnassignedTasks,
  } = await getHabitDashboardData(userId);
  // The part-of-the-day setting on each habit belongs to the home dashboard.
  const settings = await getUserSettings(userId);
  const showBlocks = isFeatureOn(settings.features, "dashboard");

  const noDaily =
    categoriesWithTasks.every(({ tasks }) => tasks.length === 0) &&
    unassignedTasks.length === 0 &&
    cleaningTasks.length === 0;
  const noWeekly = weeklyCategoriesWithTasks.every(({ tasks }) => tasks.length === 0) && weeklyUnassignedTasks.length === 0;

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="board-page mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold">Points</h1>

        <Card>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
            <div>
              <p className="whitespace-nowrap text-xs text-neutral-500">Total points</p>
              <p className="text-2xl font-semibold">{balance}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Yesterday</p>
              <p className="text-2xl font-semibold">{pointsYesterday}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Today</p>
              <p className="text-2xl font-semibold">{pointsToday}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Streak</p>
              <p className="flex items-center gap-2 text-2xl font-semibold">
                {streak > 0 ? `Day ${streak}` : "—"}
                {streak > 0 && <StreakBadge streak={streak} />}
              </p>
            </div>
          </div>
        </Card>

        <Board pageId="points" columnCount={3} saved={settings.layouts.points}>
          <W id="today" label="Today’s tasks" col={0}>
            <Card>
              <CardHeader title="Today’s tasks" note={pointsToday > 0 ? `+${pointsToday} today` : undefined} />
              {categoriesWithTasks.map(
                ({ category, tasks }, i) =>
                  tasks.length > 0 && (
                    <Group key={category.id} name={category.name} color={jewelFor(i).color}>
                      <TaskList
                        tasks={tasks}
                        counts={todayCompletionCounts}
                        jewel={jewelFor(i)}
                        categories={categories}
                        showBlocks={showBlocks}
                      />
                    </Group>
                  ),
              )}
              {unassignedTasks.length > 0 && (
                <Group name="Other" color={NEUTRAL_JEWEL.color}>
                  <TaskList
                    tasks={unassignedTasks}
                    counts={todayCompletionCounts}
                    jewel={NEUTRAL_JEWEL}
                    categories={categories}
                    showBlocks={showBlocks}
                  />
                </Group>
              )}
              {cleaningTasks.length > 0 && (
                <Group name="Cleaning" color={jewelFor(categoriesWithTasks.length).color}>
                  <CleaningTaskList tasks={cleaningTasks} jewel={jewelFor(categoriesWithTasks.length)} showArea />
                </Group>
              )}
              {noDaily && <p className="py-2 text-sm text-neutral-500">No tasks yet. Add one below.</p>}
              <div className="mt-3">
                <AddRow bare title="Add task">
                  <AddTaskForm categories={categories} />
                </AddRow>
                <AddRow bare title="Add category">
                  <AddCategoryForm />
                </AddRow>
              </div>
            </Card>
          </W>

          <W id="weekly" label="Weekly tasks" col={1}>
            <Card>
              <CardHeader title="Weekly tasks" note="resets weekly" />
              {weeklyCategoriesWithTasks.map(
                ({ category, tasks }, i) =>
                  tasks.length > 0 && (
                    <Group key={category.id} name={category.name} color={jewelFor(i).color}>
                      <ul>
                        {tasks.map((task) => (
                          <WeeklyTaskRow key={task.id} task={task} jewel={jewelFor(i)} />
                        ))}
                      </ul>
                    </Group>
                  ),
              )}
              {weeklyUnassignedTasks.length > 0 && (
                <Group name="Other" color={NEUTRAL_JEWEL.color}>
                  <ul>
                    {weeklyUnassignedTasks.map((task) => (
                      <WeeklyTaskRow key={task.id} task={task} jewel={NEUTRAL_JEWEL} />
                    ))}
                  </ul>
                </Group>
              )}
              {noWeekly && (
                <p className="py-2 text-sm text-neutral-500">No weekly tasks yet. Add a task and switch it to Weekly.</p>
              )}
            </Card>
          </W>

          <W id="rewards" label="Rewards" col={1}>
            <Card>
              <CardHeader title="Rewards" note={`${balance} points to spend`} />
              {activeRewards.length === 0 ? (
                <p className="py-2 text-sm text-neutral-500">No rewards yet. Add one below.</p>
              ) : (
                <ul>
                  {activeRewards.map((reward, i) => {
                    const jewel = jewelFor(i);
                    const affordable = balance >= reward.cost;
                    return (
                      <li key={reward.id} className="flex items-center gap-2 border-t border-neutral-800 py-2 first:border-t-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-neutral-200">{reward.name}</p>
                          <p className="text-xs text-neutral-500">
                            <span style={{ color: jewel.color }}>{reward.cost} pts</span>
                            {reward.priceUsd && ` · ~${formatCurrency(Number(reward.priceUsd))}`}
                            {reward.link && (
                              <>
                                {" · "}
                                <a href={reward.link} target="_blank" rel="noreferrer" className="underline">
                                  Link
                                </a>
                              </>
                            )}
                          </p>
                        </div>
                        <form action={redeemReward.bind(null, reward.id)}>
                          <button
                            type="submit"
                            disabled={!affordable}
                            className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 disabled:opacity-40"
                            style={affordable ? { borderColor: jewel.color, color: jewel.color } : undefined}
                          >
                            Redeem
                          </button>
                        </form>
                        <form action={archiveReward.bind(null, reward.id)}>
                          <button type="submit" aria-label={`Archive ${reward.name}`} className="text-neutral-600 hover:text-red-400">
                            ✕
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-2">
                <AddRow bare title="Add reward">
                  <AddRewardForm />
                </AddRow>
              </div>
            </Card>
          </W>

          <W id="chart" label="Chart" col={2}>
            <Card>
              <CardHeader title="Points over time" />
              <PointsChart data={chartData} />
            </Card>
          </W>

          {recentRedemptions.length > 0 && (
            <W id="redemptions" label="Recent redemptions" col={2}>
              <Card>
                <CardHeader title="Recent redemptions" />
                <ul>
                  {recentRedemptions.map((r) => (
                    <li key={r.id} className="flex justify-between gap-3 border-t border-neutral-800 py-2 text-sm first:border-t-0">
                      <span className="text-neutral-300">{r.rewardName}</span>
                      <span className="shrink-0 text-neutral-500">
                        {formatDate(r.date)} · {r.pointsCost} pts
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </W>
          )}
        </Board>
      </main>
    </div>
  );
}

function TaskList({
  tasks,
  counts,
  jewel,
  categories,
  showBlocks,
}: {
  tasks: Task[];
  counts: Map<string, number>;
  jewel: { color: string; soft: string };
  categories: { id: string; name: string }[];
  showBlocks: boolean;
}) {
  return (
    <ul>
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          count={counts.get(task.id) ?? 0}
          jewel={jewel}
          categories={categories}
          showBlocks={showBlocks}
        />
      ))}
    </ul>
  );
}

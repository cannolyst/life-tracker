import { getCleaningDashboardData } from "@/db/queries";
import { AddRow } from "@/components/AddRow";
import { requireUserId } from "@/lib/session";
import { getUserSettings } from "@/db/userSettings";
import { getTimeframeBoundaries, type CleaningTimeframeBucket } from "@/lib/cleaningStatus";
import { Nav } from "@/components/Nav";
import { Board, W } from "@/components/Board";
import { formatDateRange, formatMonthName } from "@/components/ui";
import { AddAreaForm, AddTaskForm } from "./CleaningForms";
import { CleaningTasksView, type TaskGroup } from "./CleaningTasksView";
import { jewelFor, NEUTRAL_JEWEL } from "@/lib/jewels";
import type { Task } from "./TaskList";

export const dynamic = "force-dynamic";

export default async function CleaningPage() {
  const userId = await requireUserId();
  const settings = await getUserSettings(userId);
  const tz = settings.timezone;
  const { areasWithTasks, unassignedTasks, areas } = await getCleaningDashboardData(userId);

  const categoryGroups: TaskGroup[] = [
    ...areasWithTasks
      .filter(({ tasks }) => tasks.length > 0)
      .map(({ area, tasks }, i) => ({
        key: area.id,
        name: area.name,
        jewel: jewelFor(i),
        tasks,
      })),
    ...(unassignedTasks.length > 0
      ? [{ key: "unassigned", name: "Other", jewel: NEUTRAL_JEWEL, tasks: unassignedTasks }]
      : []),
  ];

  const allTasks: Task[] = [
    ...areasWithTasks.flatMap(({ area, tasks }) => tasks.map((t) => ({ ...t, areaName: area.name }))),
    ...unassignedTasks.map((t) => ({ ...t, areaName: null })),
  ];

  const byDueDate = (a: Task, b: Task) => a.dueDate.getTime() - b.dueDate.getTime();

  const buckets: Record<CleaningTimeframeBucket, Task[]> = {
    overdue: [],
    week: [],
    "next-week": [],
    month: [],
    later: [],
  };
  for (const task of allTasks) {
    buckets[task.timeframe].push(task);
  }
  for (const tasks of Object.values(buckets)) tasks.sort(byDueDate);

  const boundaries = getTimeframeBoundaries(tz);
  const timeframeGroups: TaskGroup[] = [
    { key: "overdue", name: "Overdue", tasks: buckets.overdue },
    {
      key: "week",
      name: `This week (${formatDateRange(boundaries.thisWeekStart, boundaries.thisWeekEnd)})`,
      tasks: buckets.week,
    },
    {
      key: "next-week",
      name: `Next week (${formatDateRange(boundaries.nextWeekStart, boundaries.nextWeekEnd)})`,
      tasks: buckets["next-week"],
    },
    {
      key: "month",
      name: `This month (${formatMonthName(boundaries.monthStart)})`,
      tasks: buckets.month,
    },
    { key: "later", name: "Later", tasks: buckets.later },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="board-page mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-8">
        <h1 className="text-xl font-semibold">Cleaning</h1>

        <Board pageId="cleaning" columnCount={3} saved={settings.layouts.cleaning}>
          <W id="tasks" label="Tasks" col={0}>
            <CleaningTasksView categoryGroups={categoryGroups} timeframeGroups={timeframeGroups} />
          </W>
          <W id="add-area" label="Add area" col={1}>
            <AddRow title="Add area">
<AddAreaForm />
</AddRow>
          </W>
          <W id="add-task" label="Add task" col={1}>
            <AddRow title="Add task">
<AddTaskForm areas={areas} />
</AddRow>
          </W>
        </Board>
      </main>
    </div>
  );
}

import { getCleaningDashboardData } from "@/db/queries";
import { classifyByTimeframe, getTimeframeBoundaries, type CleaningTimeframeBucket } from "@/lib/cleaningStatus";
import { Nav } from "@/components/Nav";
import { Card, formatDateRange, formatMonthName } from "@/components/ui";
import { AddAreaForm, AddTaskForm } from "./CleaningForms";
import { CleaningTasksView, type TaskGroup } from "./CleaningTasksView";
import { jewelFor, NEUTRAL_JEWEL } from "@/lib/jewels";
import type { Task } from "./TaskList";

export const dynamic = "force-dynamic";

export default async function CleaningPage() {
  const { areasWithTasks, unassignedTasks, areas } = await getCleaningDashboardData();

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
    buckets[classifyByTimeframe(task.status, task.dueDate)].push(task);
  }
  for (const tasks of Object.values(buckets)) tasks.sort(byDueDate);

  const boundaries = getTimeframeBoundaries();
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
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-8">
        <h1 className="text-xl font-semibold">Cleaning</h1>

        <CleaningTasksView categoryGroups={categoryGroups} timeframeGroups={timeframeGroups} />

        <section className="grid gap-6 sm:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-medium">Add area</h2>
            <AddAreaForm />
          </Card>
          <Card>
            <h2 className="mb-3 font-medium">Add task</h2>
            <AddTaskForm areas={areas} />
          </Card>
        </section>
      </main>
    </div>
  );
}

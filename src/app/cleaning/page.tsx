import { getCleaningDashboardData } from "@/db/queries";
import { dateOnlyInAppTimezone } from "@/lib/timezone";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui";
import { AddAreaForm, AddTaskForm } from "./CleaningForms";
import { CleaningTasksView, type TaskGroup } from "./CleaningTasksView";
import { jewelFor, NEUTRAL_JEWEL } from "@/lib/jewels";
import type { Task } from "./TaskList";

export const dynamic = "force-dynamic";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

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

  const todayOnly = dateOnlyInAppTimezone();
  const daysUntil = (dueDate: Date) => Math.round((dueDate.getTime() - todayOnly.getTime()) / MS_PER_DAY);
  const byDueDate = (a: Task, b: Task) => a.dueDate.getTime() - b.dueDate.getTime();

  const dueToday = allTasks
    .filter((t) => t.status === "overdue" || t.status === "due-today")
    .sort(byDueDate);
  const dueThisWeek = allTasks
    .filter((t) => t.status === "upcoming" && daysUntil(t.dueDate) <= 7)
    .sort(byDueDate);
  const dueThisMonth = allTasks
    .filter((t) => t.status === "upcoming" && daysUntil(t.dueDate) > 7 && daysUntil(t.dueDate) <= 30)
    .sort(byDueDate);
  const dueLater = allTasks
    .filter((t) => t.status === "upcoming" && daysUntil(t.dueDate) > 30)
    .sort(byDueDate);

  const timeframeGroups: TaskGroup[] = [
    { key: "today", name: "Today", tasks: dueToday },
    { key: "week", name: "This week", tasks: dueThisWeek },
    { key: "month", name: "This month", tasks: dueThisMonth },
    { key: "later", name: "Later", tasks: dueLater },
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

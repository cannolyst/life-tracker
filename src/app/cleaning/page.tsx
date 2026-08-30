import { getCleaningDashboardData } from "@/db/queries";
import { Nav } from "@/components/Nav";
import { Card, formatDate } from "@/components/ui";
import { AddAreaForm, AddTaskForm } from "./CleaningForms";
import { markDone, archiveTask } from "./actions";
import type { CleaningStatus } from "@/lib/cleaningStatus";

export const dynamic = "force-dynamic";

type Task = {
  id: string;
  name: string;
  points: number;
  status: CleaningStatus;
  dueDate: Date;
  doneToday: boolean;
};

export default async function CleaningPage() {
  const { areasWithTasks, unassignedTasks, areas } = await getCleaningDashboardData();

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-8">
        <h1 className="text-xl font-semibold">Cleaning</h1>

        <section className="space-y-4">
          {areasWithTasks.map(
            ({ area, tasks }) =>
              tasks.length > 0 && (
                <Card key={area.id}>
                  <h3 className="mb-2 font-medium">{area.name}</h3>
                  <TaskList tasks={tasks} />
                </Card>
              ),
          )}
          {unassignedTasks.length > 0 && (
            <Card>
              <h3 className="mb-2 font-medium">Other</h3>
              <TaskList tasks={unassignedTasks} />
            </Card>
          )}
          {areasWithTasks.every(({ tasks }) => tasks.length === 0) &&
            unassignedTasks.length === 0 && (
              <p className="text-sm text-neutral-500">No cleaning tasks yet — add one below.</p>
            )}
        </section>

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

const STATUS_STYLE: Record<CleaningStatus, string> = {
  overdue: "border-red-900 bg-red-950 text-red-300",
  "due-today": "border-amber-800 bg-amber-950 text-amber-300",
  upcoming: "border-neutral-800 text-neutral-300",
};

const STATUS_LABEL: Record<CleaningStatus, string> = {
  overdue: "Overdue",
  "due-today": "Due today",
  upcoming: "Due",
};

function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-center justify-between gap-3">
          <form action={markDone.bind(null, task.id)} className="flex-1">
            <button
              type="submit"
              className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
                task.doneToday
                  ? "border-emerald-800 bg-emerald-950 text-emerald-300"
                  : STATUS_STYLE[task.status]
              }`}
            >
              <span>
                {task.doneToday ? "✓ " : ""}
                {task.name}
              </span>
              <span className="text-xs text-neutral-500">
                {task.doneToday ? "Done today" : `${STATUS_LABEL[task.status]} ${formatDate(task.dueDate)}`}
                {" · "}
                {task.points} pts
              </span>
            </button>
          </form>
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
      ))}
    </ul>
  );
}

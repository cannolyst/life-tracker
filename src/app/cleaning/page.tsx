import { getCleaningDashboardData } from "@/db/queries";
import { Nav } from "@/components/Nav";
import { Card, formatDate } from "@/components/ui";
import { AddAreaForm, AddTaskForm } from "./CleaningForms";
import { markDone, archiveTask } from "./actions";
import { JEWELS, jewelFor, NEUTRAL_JEWEL, jewelChipStyle } from "@/lib/jewels";
import type { CleaningStatus } from "@/lib/cleaningStatus";

const RUBY = JEWELS[3];
const GOLD = JEWELS[4];

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
            ({ area, tasks }, i) =>
              tasks.length > 0 && (
                <Card key={area.id}>
                  <h3 className="mb-2 flex items-center gap-2 font-medium">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: jewelFor(i).color }}
                    />
                    {area.name}
                  </h3>
                  <TaskList tasks={tasks} jewel={jewelFor(i)} />
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
              <TaskList tasks={unassignedTasks} jewel={NEUTRAL_JEWEL} />
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

const STATUS_JEWEL: Partial<Record<CleaningStatus, { color: string; soft: string }>> = {
  overdue: RUBY,
  "due-today": GOLD,
};

const STATUS_LABEL: Record<CleaningStatus, string> = {
  overdue: "Overdue",
  "due-today": "Due today",
  upcoming: "Due",
};

function TaskList({ tasks, jewel }: { tasks: Task[]; jewel: { color: string; soft: string } }) {
  return (
    <ul className="space-y-2">
      {tasks.map((task) => {
        const statusJewel = STATUS_JEWEL[task.status];
        return (
          <li key={task.id} className="flex items-center justify-between gap-3">
            <form action={markDone.bind(null, task.id)} className="flex-1">
              <button
                type="submit"
                className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm border-neutral-800 text-neutral-300"
                style={
                  task.doneToday
                    ? jewelChipStyle(jewel)
                    : statusJewel
                      ? jewelChipStyle(statusJewel)
                      : undefined
                }
              >
                <span>
                  {task.doneToday ? "✓ " : ""}
                  {task.name}
                </span>
                <span className={task.doneToday || statusJewel ? "text-xs" : "text-xs text-neutral-500"}>
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
        );
      })}
    </ul>
  );
}

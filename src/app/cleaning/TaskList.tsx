import { formatDate } from "@/components/ui";
import { jewelChipStyle } from "@/lib/jewels";
import { JEWELS } from "@/lib/jewels";
import { markDone, archiveTask } from "./actions";
import type { CleaningStatus } from "@/lib/cleaningStatus";

export type Task = {
  id: string;
  name: string;
  points: number;
  status: CleaningStatus;
  dueDate: Date;
  doneToday: boolean;
  areaName?: string | null;
};

const RUBY = JEWELS[3];
const GOLD = JEWELS[4];

const STATUS_JEWEL: Partial<Record<CleaningStatus, { color: string; soft: string }>> = {
  overdue: RUBY,
  "due-today": GOLD,
};

const STATUS_LABEL: Record<CleaningStatus, string> = {
  overdue: "Overdue",
  "due-today": "Due today",
  upcoming: "Due",
};

export function TaskList({
  tasks,
  jewel,
  showArea,
}: {
  tasks: Task[];
  jewel: { color: string; soft: string };
  showArea?: boolean;
}) {
  return (
    <ul className="space-y-2">
      {tasks.map((task) => {
        const statusJewel = STATUS_JEWEL[task.status];
        return (
          <li key={task.id} className="flex items-center justify-between gap-3">
            <form action={markDone.bind(null, task.id)} className="flex-1">
              <button
                type="submit"
                className="flex w-full flex-col items-start gap-1 rounded-md border px-3 py-2 text-left text-sm border-neutral-800 text-neutral-300 sm:flex-row sm:items-center sm:justify-between"
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
                  {showArea && task.areaName ? ` · ${task.areaName}` : ""}
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

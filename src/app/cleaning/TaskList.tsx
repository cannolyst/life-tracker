import { formatDate } from "@/components/ui";
import { JEWELS } from "@/lib/jewels";
import { markDone, archiveTask } from "./actions";
import type { CleaningStatus, CleaningTimeframeBucket } from "@/lib/cleaningStatus";

export type Task = {
  id: string;
  name: string;
  points: number;
  status: CleaningStatus;
  dueDate: Date;
  doneToday: boolean;
  areaName?: string | null;
  timeframe: CleaningTimeframeBucket;
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

const TIMEFRAME_LABEL: Partial<Record<CleaningTimeframeBucket, string>> = {
  week: "This week",
  "next-week": "Next week",
  month: "This month",
  later: "Later",
};

export function TaskList({
  tasks,
  jewel,
  showArea,
  showTimeframe,
}: {
  tasks: Task[];
  jewel: { color: string; soft: string };
  showArea?: boolean;
  showTimeframe?: boolean;
}) {
  return (
    <ul>
      {tasks.map((task) => {
        const statusJewel = STATUS_JEWEL[task.status];
        const timeframeSuffix =
          showTimeframe && task.status === "upcoming" ? ` · ${TIMEFRAME_LABEL[task.timeframe]}` : "";
        return (
          <li key={task.id} className="flex items-center gap-1 border-t border-neutral-800 first:border-t-0">
            <form action={markDone.bind(null, task.id)} className="min-w-0 flex-1">
              <button type="submit" className="flex min-h-11 w-full items-center gap-3 text-left text-sm">
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${task.doneToday ? "text-white" : "border-neutral-600 text-transparent"}`}
                  style={task.doneToday ? { backgroundColor: jewel.color, borderColor: jewel.color } : undefined}
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block ${task.doneToday ? "text-neutral-500 line-through" : "text-neutral-200"}`}>
                    {task.name}
                    {showArea && task.areaName ? ` · ${task.areaName}` : ""}
                  </span>
                  <span
                    className="block text-xs text-neutral-500"
                    style={!task.doneToday && statusJewel ? { color: statusJewel.color } : undefined}
                  >
                    {task.doneToday
                      ? "Done today"
                      : `${STATUS_LABEL[task.status]} ${formatDate(task.dueDate)}${timeframeSuffix}`}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-neutral-500">{task.points} pts</span>
              </button>
            </form>
            <form action={archiveTask.bind(null, task.id)}>
              <button type="submit" aria-label="Archive task" className="text-neutral-600 hover:text-red-400">
                ✕
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}

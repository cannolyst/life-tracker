"use client";

import { toggleWeeklyTaskCompletion, archiveWeeklyTask } from "./actions";
import { jewelChipStyle } from "@/lib/jewels";

type WeeklyTask = {
  id: string;
  name: string;
  points: number;
  doneThisWeek: boolean;
};

export function WeeklyTaskRow({
  task,
  jewel,
}: {
  task: WeeklyTask;
  jewel: { color: string; soft: string };
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <form action={toggleWeeklyTaskCompletion.bind(null, task.id)} className="flex-1">
        <button
          type="submit"
          className="flex w-full flex-col items-start gap-1 rounded-md border border-neutral-800 px-3 py-2 text-left text-sm text-neutral-300 hover:border-neutral-600 sm:flex-row sm:items-center sm:justify-between"
          style={task.doneThisWeek ? jewelChipStyle(jewel) : undefined}
        >
          <span>
            {task.doneThisWeek ? "✓ " : ""}
            {task.name}
          </span>
          <span className={task.doneThisWeek ? "" : "text-neutral-500"}>{task.points} pts</span>
        </button>
      </form>
      <form action={archiveWeeklyTask.bind(null, task.id)}>
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
}

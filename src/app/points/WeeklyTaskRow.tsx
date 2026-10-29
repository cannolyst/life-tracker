"use client";

import { toggleWeeklyTaskCompletion, archiveWeeklyTask } from "./actions";

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
    <li className="flex items-center gap-1 border-t border-neutral-800 first:border-t-0">
      <form action={toggleWeeklyTaskCompletion.bind(null, task.id)} className="min-w-0 flex-1">
        <button type="submit" className="flex min-h-11 w-full items-center gap-3 text-left text-sm">
          <span
            aria-hidden
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${task.doneThisWeek ? "text-white" : "border-neutral-600 text-transparent"}`}
            style={task.doneThisWeek ? { backgroundColor: jewel.color, borderColor: jewel.color } : undefined}
          >
            ✓
          </span>
          <span className={`min-w-0 flex-1 ${task.doneThisWeek ? "text-neutral-500 line-through" : "text-neutral-200"}`}>{task.name}</span>
          <span className="shrink-0 text-xs text-neutral-500">{task.points} pts</span>
        </button>
      </form>
      <form action={archiveWeeklyTask.bind(null, task.id)}>
        <button type="submit" aria-label="Archive task" className="text-neutral-600 hover:text-red-400">
          ✕
        </button>
      </form>
    </li>
  );
}

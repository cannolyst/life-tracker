import Link from "next/link";
import type { GoalView } from "@/db/goals";
import { KIND_LABEL } from "@/lib/goals";
import { GoalNextStep } from "../dashboard/GoalNextStep";

// A calm check-in on goals during the reset: how each one is going and whether
// it has a next step waiting. Changing a goal (done, extend, retire) happens on
// the Goals page; this just points there when a deadline has come.
export function GoalReview({ goals }: { goals: GoalView[] }) {
  return (
    <ul className="space-y-4">
      {goals.map((goal) => {
        const percent = Math.round(goal.metrics.progress * 100);
        return (
          <li key={goal.id} className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-neutral-200">
                {goal.title}
                <span className="block text-xs font-normal text-neutral-500">
                  {KIND_LABEL[goal.kind]} · {goal.daysLeftLabel}
                </span>
              </p>
              <span className="shrink-0 text-xs text-neutral-400">
                {goal.deadlineReached ? "Deadline reached" : goal.metrics.paceLabel}
              </span>
            </div>
            {goal.why && <p className="text-sm text-neutral-400">“{goal.why}”</p>}
            <div
              role="progressbar"
              aria-label={`${goal.title} progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800"
            >
              <div className="h-full rounded-full bg-neutral-500" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-xs text-neutral-500">
              {goal.metrics.detail}
              {goal.neededPace ? ` · ${goal.neededPace}` : ""}
            </p>
            {goal.deadlineReached ? (
              <Link href="/goals" className="tap text-sm underline">
                Decide: done, extend or retire
              </Link>
            ) : goal.openTasks.length === 0 ? (
              <GoalNextStep goalId={goal.id} />
            ) : (
              <p className="text-xs text-neutral-500">Next up: {goal.openTasks[0].title}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

import Link from "next/link";
import type { GoalView } from "@/db/goals";
import { GoalNextStep } from "./GoalNextStep";

// A slim, quiet strip: one line and one thin bar per active goal. It never
// takes the accent color — that belongs to the Now card.
export function GoalStrip({ goals }: { goals: GoalView[] }) {
  if (goals.length === 0) return null;

  return (
    <section aria-label="Goals" className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-3">
      <ul className="space-y-3">
        {goals.map((goal) => {
          const percent = Math.round(goal.metrics.progress * 100);
          return (
            <li key={goal.id} className="space-y-1.5">
              <Link href="/goals" className="flex min-h-11 items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-neutral-200">{goal.title}</span>
                <span className="shrink-0 text-xs text-neutral-500">
                  {goal.deadlineReached ? "Deadline reached" : goal.metrics.paceLabel}
                </span>
              </Link>
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
              {goal.kind === "finish" && !goal.deadlineReached && goal.openTasks.length === 0 && (
                <GoalNextStep goalId={goal.id} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { habitTasks } from "@/db/schema";
import { requireUserId } from "@/lib/session";
import { getUserSettings } from "@/db/userSettings";
import { getGoals } from "@/db/goals";
import { isPartOn } from "@/lib/features";
import { MAX_ACTIVE_GOALS } from "@/lib/goals";
import { dateKeyIn } from "@/lib/timezone";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui";
import { Board, W } from "@/components/Board";
import { Sparkle } from "@/components/Sparkle";
import { JEWELS } from "@/lib/jewels";
import { GoalCard, NewGoalForm, SomedayGoal } from "./GoalsClient";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const userId = await requireUserId();
  const settings = await getUserSettings(userId);
  const todayKey = dateKeyIn(settings.timezone);

  if (!isPartOn(settings.features, "goals")) {
    return (
      <div className="flex min-h-full flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
          <h1 className="text-xl font-semibold">Goals</h1>
          <Card>
            <p className="text-sm text-neutral-400">
              Goals are switched off.{" "}
              <Link href="/settings" className="underline">
                Turn it on in Settings
              </Link>
              .
            </p>
          </Card>
        </main>
      </div>
    );
  }

  const [goals, habits] = await Promise.all([
    getGoals(userId, todayKey),
    db
      .select({ id: habitTasks.id, name: habitTasks.name })
      .from(habitTasks)
      .where(and(eq(habitTasks.userId, userId), eq(habitTasks.archived, false)))
      .orderBy(asc(habitTasks.createdAt)),
  ]);

  const active = goals.filter((g) => g.status === "active");
  const someday = goals.filter((g) => g.status === "someday");
  const done = goals.filter((g) => g.status === "done").sort((a, b) => (b.completedOn ?? "").localeCompare(a.completedOn ?? ""));
  // A goal finished in the last week gets a moment of celebration.
  const recent = done.filter((g) => g.completedOn && g.completedOn >= weekAgo(todayKey));

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="board-page mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 pb-24 pt-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Goals</h1>
          <p className="text-sm text-neutral-500">
            Up to {MAX_ACTIVE_GOALS} at a time, each with a reason, a deadline, and a next step that becomes a card.
            Progress tracks itself from what you log.
          </p>
        </div>

        <Board pageId="goals" columnCount={2} saved={settings.layouts.goals}>
        {recent.map((g) => (
          <W key={g.id} id={`done-${g.id}`} label="Goal complete">
          <section
            key={g.id}
            aria-label="Goal complete"
            className="flex items-start gap-3 rounded-lg border border-neutral-700 bg-neutral-900 px-5 py-4"
          >
            <Sparkle className="mt-0.5 h-5 w-5 shrink-0" color={JEWELS[4].color} />
            <div>
              <p className="text-base font-medium text-neutral-100">You did it: {g.title}</p>
              {g.why && <p className="text-sm text-neutral-400">“{g.why}”</p>}
              <p className="mt-1 text-xs text-neutral-500">It&apos;s saved in your Year in review.</p>
            </div>
          </section>
          </W>
        ))}

        {active.length === 0 ? (
          <W id="no-goals" label="Goals">
            <p className="text-sm text-neutral-500">No active goals yet. Add one below.</p>
          </W>
        ) : (
          active.map((g) => (
            <W key={g.id} id={`goal-${g.id}`} label={g.title}>
              <ul>
                <GoalCard goal={g} />
              </ul>
            </W>
          ))
        )}

        <W id="new-goal" label="New goal">
          <NewGoalForm todayKey={todayKey} habits={habits} activeCount={active.length} />
        </W>

        {someday.length > 0 && (
          <W id="someday" label="Someday goals">
          <Card>
            <h2 className="mb-1 font-medium">Someday goals</h2>
            <p className="mb-1 text-sm text-neutral-500">Waiting for a free slot.</p>
            <ul className="divide-y divide-neutral-800">
              {someday.map((g) => (
                <SomedayGoal key={g.id} goal={g} canActivate={active.length < MAX_ACTIVE_GOALS} />
              ))}
            </ul>
          </Card>
          </W>
        )}

        {done.length > 0 && (
          <W id="finished" label="Finished">
          <Card>
            <h2 className="mb-2 font-medium">Finished</h2>
            <ul className="space-y-1 text-sm">
              {done.map((g) => (
                <li key={g.id} className="text-neutral-300">
                  {g.title}
                  <span className="ml-2 text-xs text-neutral-500">{g.completedOn}</span>
                </li>
              ))}
            </ul>
          </Card>
          </W>
        )}
        </Board>
      </main>
    </div>
  );
}

function weekAgo(todayKey: string): string {
  const [y, m, d] = todayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 7)).toISOString().slice(0, 10);
}

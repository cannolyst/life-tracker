import Link from "next/link";
import { requireUserId } from "@/lib/session";
import { getUserSettings } from "@/db/userSettings";
import { getFinishedCount, getPlanTasks } from "@/db/planning";
import { isFeatureOn } from "@/lib/features";
import { addDays } from "@/lib/dashboard";
import { dateKeyIn } from "@/lib/timezone";
import { BUCKETS, BUCKET_LABEL, capacityCap, groupOpenByBucket } from "@/lib/planning";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui";
import { AddTaskForm, PlanRow, type PlanRowTask } from "./PlanClient";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const userId = await requireUserId();
  const settings = await getUserSettings(userId);
  const todayKey = dateKeyIn(settings.timezone);
  const tomorrowKey = addDays(todayKey, 1);

  const [tasks, finished] = await Promise.all([getPlanTasks(userId), getFinishedCount(userId, todayKey)]);

  const toRow = (t: (typeof tasks)[number]): PlanRowTask => ({
    id: t.id,
    title: t.title,
    lowTitle: t.lowTitle,
    bucket: t.bucket,
    minutes: t.minutes,
    status: t.status,
    planned: t.plannedFor === todayKey ? "today" : t.plannedFor === tomorrowKey ? "tomorrow" : null,
    isPriority: t.isPriority,
  });

  const open = tasks.filter((t) => t.status === "open");
  const tomorrow = open.filter((t) => t.plannedFor === tomorrowKey);
  const grouped = groupOpenByBucket(open, todayKey);
  const someday = tasks.filter((t) => t.status === "someday");
  const doneToday = tasks.filter((t) => t.status === "done" && t.doneDate === todayKey);
  const cap = capacityCap(finished);

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold">Plan</h1>

        {!isFeatureOn(settings.features, "dashboard") && (
          <Card>
            <p className="text-sm text-neutral-400">
              Planning is part of the home dashboard, which is switched off.{" "}
              <Link href="/settings" className="underline">
                Turn it on in Settings
              </Link>
              .
            </p>
          </Card>
        )}

        <Card>
          <h2 className="mb-3 font-medium">Add a task</h2>
          <AddTaskForm />
        </Card>

        <Card>
          <h2 className="mb-1 font-medium">Tomorrow</h2>
          <p className="mb-2 text-sm text-neutral-500">
            Room for about {cap} {cap === 1 ? "thing" : "things"}, matching what you finished today
            ({finished}). Anything more goes to Someday.
          </p>
          {tomorrow.length === 0 ? (
            <p className="text-sm text-neutral-500">Nothing planned yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-800">
              {tomorrow.map((t) => (
                <PlanRow key={t.id} task={toRow(t)} />
              ))}
            </ul>
          )}
        </Card>

        {BUCKETS.map((bucket) => (
          <Card key={bucket}>
            <h2 className="mb-1 font-medium">{BUCKET_LABEL[bucket]}</h2>
            {grouped[bucket].length === 0 ? (
              <p className="text-sm text-neutral-500">Nothing here.</p>
            ) : (
              <ul className="divide-y divide-neutral-800">
                {grouped[bucket].map((t) => (
                  <PlanRow key={t.id} task={toRow(t)} />
                ))}
              </ul>
            )}
          </Card>
        ))}

        <Card>
          <h2 className="mb-1 font-medium">Someday</h2>
          {someday.length === 0 ? (
            <p className="text-sm text-neutral-500">Nothing saved for later.</p>
          ) : (
            <ul className="divide-y divide-neutral-800">
              {someday.map((t) => (
                <PlanRow key={t.id} task={toRow(t)} />
              ))}
            </ul>
          )}
        </Card>

        {doneToday.length > 0 && (
          <Card>
            <h2 className="mb-1 font-medium">Done today</h2>
            <ul className="divide-y divide-neutral-800">
              {doneToday.map((t) => (
                <PlanRow key={t.id} task={toRow(t)} />
              ))}
            </ul>
          </Card>
        )}
      </main>
    </div>
  );
}

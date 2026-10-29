import Link from "next/link";
import { requireUserId } from "@/lib/session";
import { getUserSettings } from "@/db/userSettings";
import { getCollectionChoices, getFinishedCount, getPlanTasks } from "@/db/planning";
import { isFeatureOn, isPartOn } from "@/lib/features";
import { addDays } from "@/lib/dashboard";
import { dateKeyIn } from "@/lib/timezone";
import { BUCKETS, BUCKET_LABEL, capacityCap, groupOpenByBucket } from "@/lib/planning";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui";
import { Board, W } from "@/components/Board";
import { AddTaskForm, PlanRow, type PlanRowTask } from "./PlanClient";
import { InboxItem } from "./InboxItem";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const userId = await requireUserId();
  const settings = await getUserSettings(userId);
  const todayKey = dateKeyIn(settings.timezone);
  const tomorrowKey = addDays(todayKey, 1);

  const [tasks, finished, collections] = await Promise.all([
    getPlanTasks(userId),
    getFinishedCount(userId, todayKey),
    getCollectionChoices(userId),
  ]);

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
      <main className="board-page mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Plan</h1>
          {isPartOn(settings.features, "reset") && (
            <Link href="/reset" className="tap rounded-md border border-neutral-700 px-3 text-sm text-neutral-300">
              Sunday reset
            </Link>
          )}
        </div>

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

        <Board pageId="plan" columnCount={3} saved={settings.layouts.plan}>
        <W id="add" label="Add a task" col={0}>
        <Card>
          <h2 className="mb-3 font-medium">Add a task</h2>
          <AddTaskForm />
        </Card>
        </W>

        <W id="tomorrow" label="Tomorrow" col={0}>
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
        </W>

        {BUCKETS.map((bucket) => (
          <W key={bucket} id={`area-${bucket}`} label={BUCKET_LABEL[bucket]} col={bucket === "inbox" ? 0 : 1}>
          <Card>
            <h2 className="mb-1 font-medium">{BUCKET_LABEL[bucket]}</h2>
            {grouped[bucket].length === 0 ? (
              <p className="text-sm text-neutral-500">Nothing here.</p>
            ) : (
              <ul className="divide-y divide-neutral-800">
                {grouped[bucket].map((t) =>
                  bucket === "inbox" && t.plannedFor === null ? (
                    <InboxItem key={t.id} taskId={t.id} title={t.title} collections={collections} />
                  ) : (
                    <PlanRow key={t.id} task={toRow(t)} />
                  ),
                )}
              </ul>
            )}
          </Card>
          </W>
        ))}

        <W id="someday" label="Someday" col={2}>
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
        </W>

        {doneToday.length > 0 && (
          <W id="done" label="Done today" col={2}>
          <Card>
            <h2 className="mb-1 font-medium">Done today</h2>
            <ul className="divide-y divide-neutral-800">
              {doneToday.map((t) => (
                <PlanRow key={t.id} task={toRow(t)} />
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

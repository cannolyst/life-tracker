import Link from "next/link";
import { requireUserId } from "@/lib/session";
import { getUserSettings } from "@/db/userSettings";
import { entryIsOpen, getEntry, listEntries, type JournalEntry } from "@/db/journal";
import { isFeatureOn } from "@/lib/features";
import { completeUntil } from "@/lib/journal";
import { dateKeyIn } from "@/lib/timezone";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui";
import { EntryView, PhotoGrid, formatDay } from "./EntryView";
import { JournalPanel } from "./JournalPanel";

export const dynamic = "force-dynamic";

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
}

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const userId = await requireUserId();
  const settings = await getUserSettings(userId);
  const tz = settings.timezone;
  const todayKey = dateKeyIn(tz);

  if (!isFeatureOn(settings.features, "dashboard")) {
    return (
      <div className="flex min-h-full flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
          <h1 className="text-xl font-semibold">Journal</h1>
          <Card>
            <p className="text-sm text-neutral-400">
              The journal is part of the home dashboard, which is switched off.{" "}
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

  const { date } = await searchParams;
  const picked = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;

  if (picked) {
    const now = new Date();
    const open = entryIsOpen(picked, todayKey, tz, now);
    const entry = open ? null : await getEntry(userId, picked);
    return (
      <div className="flex min-h-full flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 pb-24 pt-8">
          <div className="space-y-1">
            <Link href="/journal" className="tap text-sm text-neutral-500 underline">
              All entries
            </Link>
            <h1 className="text-xl font-semibold">{formatDay(picked)}</h1>
            {open && picked !== todayKey && (
              <p className="text-sm text-neutral-500">
                Open until noon today ({completeUntil(picked, tz).toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" })}).
              </p>
            )}
          </div>
          <Card>
            {open ? (
              <JournalPanel userId={userId} date={picked} />
            ) : entry ? (
              <EntryView entry={entry} />
            ) : (
              <p className="text-sm text-neutral-500">No entry for this day.</p>
            )}
          </Card>
        </main>
      </div>
    );
  }

  const entries = await listEntries(userId);
  const todayEntry = entries.find((e) => e.date === todayKey);
  const finished = entries.filter((e) => e.completed);
  const byMonth = new Map<string, JournalEntry[]>();
  for (const e of finished) {
    const month = e.date.slice(0, 7);
    byMonth.set(month, [...(byMonth.get(month) ?? []), e]);
  }

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 pb-24 pt-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Journal</h1>
          <p className="text-sm text-neutral-500">
            One photo and a line or two each night, the last step of Shutdown. It earns no points and
            only you can see it.
          </p>
        </div>

        <Link
          href={`/journal?date=${todayKey}`}
          className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-3"
        >
          <span className="text-sm font-medium text-neutral-200">
            {todayEntry?.completed ? "Today’s entry" : todayEntry ? "Finish today’s entry" : "Write today’s entry"}
          </span>
          <span aria-hidden className="text-neutral-600">
            ›
          </span>
        </Link>

        {finished.length === 0 ? (
          <p className="text-sm text-neutral-500">No finished entries yet. Your first one will show up here.</p>
        ) : (
          [...byMonth.entries()].map(([month, list]) => (
            <section key={month} className="space-y-2">
              <h2 className="px-1 text-xs font-medium text-neutral-500">{monthLabel(month)}</h2>
              <PhotoGrid entries={[...list].reverse()} />
            </section>
          ))
        )}
      </main>
    </div>
  );
}

import Link from "next/link";
import type { OnThisDay } from "@/db/journal";
import { formatDay } from "./EntryView";

// Quiet look-backs on the dashboard: a year ago today, a month ago.
export function OnThisDayCard({ memories }: { memories: OnThisDay[] }) {
  return (
    <section aria-label="On this day" className="space-y-1">
      <h2 className="px-1 text-xs font-medium text-neutral-500">On this day</h2>
      <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800 bg-neutral-900">
        {memories.map(({ label, entry }) => (
          <li key={entry.id}>
            <Link href={`/journal?date=${entry.date}`} className="flex min-h-11 items-center gap-3 px-5 py-3">
              {entry.hasPhoto && (
                // eslint-disable-next-line @next/next/no-img-element -- private, authenticated route; not optimizable
                <img src={`/api/journal/photo/${entry.id}`} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-md object-cover" />
              )}
              <span className="min-w-0">
                <span className="block text-xs text-neutral-500">
                  {label} · {formatDay(entry.date)}
                </span>
                <span className="block truncate text-sm text-neutral-300">
                  {entry.reflection || entry.facts.finished[0] || entry.facts.events[0] || "A quiet day"}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

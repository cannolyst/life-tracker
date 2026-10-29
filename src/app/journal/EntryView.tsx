import Link from "next/link";
import type { JournalEntry } from "@/db/journal";
import { factLines, moodLabel, photoDateNote } from "@/lib/journal";

export function formatDay(dateKey: string, withYear = true): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

// A finished entry, read-only.
export function EntryView({ entry }: { entry: JournalEntry }) {
  const lines = factLines(entry.facts);
  const mood = moodLabel(entry.mood);
  const dateNote = photoDateNote(entry.photoTakenOn, entry.date);
  return (
    <article className="space-y-3">
      {entry.hasPhoto && (
        // eslint-disable-next-line @next/next/no-img-element -- private, authenticated route; not optimizable
        <img src={`/api/journal/photo/${entry.id}`} alt={`Photo from ${formatDay(entry.date)}`} className="max-h-80 w-full rounded-md object-cover" />
      )}
      {!entry.hasPhoto && entry.fallback === "weather" && entry.facts.weather && (
        <p className="rounded-md bg-neutral-800/60 px-3 py-6 text-center text-sm text-neutral-300">
          {entry.facts.weather.summary} · {Math.round(entry.facts.weather.high)}° / {Math.round(entry.facts.weather.low)}°
        </p>
      )}
      {!entry.hasPhoto && entry.fallback === "map" && entry.facts.place && (
        <iframe
          title={`Map of ${entry.facts.place.name}`}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${[
            entry.facts.place.lon - 0.05,
            entry.facts.place.lat - 0.05,
            entry.facts.place.lon + 0.05,
            entry.facts.place.lat + 0.05,
          ].join("%2C")}&layer=mapnik&marker=${entry.facts.place.lat}%2C${entry.facts.place.lon}`}
          className="h-52 w-full rounded-md border-0"
          loading="lazy"
        />
      )}
      {dateNote && <p className="text-sm text-neutral-400">{dateNote}</p>}
      {lines.length > 0 && (
        <ul className="space-y-1 text-sm text-neutral-400">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      {entry.reflection && (
        <div className="space-y-1">
          {entry.prompt && <p className="text-xs text-neutral-500">{entry.prompt}</p>}
          <p className="whitespace-pre-wrap text-sm text-neutral-200">{entry.reflection}</p>
        </div>
      )}
      {mood && <p className="text-xs text-neutral-500">Felt {mood.toLowerCase()}</p>}
    </article>
  );
}

// A grid of the month's days: the photo when there is one, otherwise a quiet tile.
export function PhotoGrid({ entries }: { entries: JournalEntry[] }) {
  return (
    <ul className="grid grid-cols-3 gap-1.5">
      {entries.map((entry) => (
        <li key={entry.id}>
          <Link
            href={`/journal?date=${entry.date}`}
            aria-label={`Journal entry for ${formatDay(entry.date)}`}
            className="relative block aspect-square overflow-hidden rounded-md bg-neutral-800"
          >
            {entry.hasPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element -- private, authenticated route; not optimizable
              <img src={`/api/journal/photo/${entry.id}`} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center px-1 text-center text-xs text-neutral-500">
                {entry.fallback === "weather" && entry.facts.weather
                  ? `${entry.facts.weather.summary}`
                  : entry.fallback === "map" && entry.facts.place
                    ? entry.facts.place.name
                    : "No photo"}
              </span>
            )}
            <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1.5 text-[11px] text-neutral-100">
              {Number(entry.date.slice(8))}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

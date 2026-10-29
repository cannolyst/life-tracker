import { and, asc, desc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import { db } from "./index";
import {
  briefSeen,
  cleaningCompletions,
  habitCompletions,
  journalEntries,
  planTasks,
  taskPointEvents,
  weeklyTaskCompletions,
  workoutDays,
  workoutSessions,
} from "./schema";
import { getUserSettings } from "./userSettings";
import { getCalendarEvents } from "@/lib/calendarService";
import { eventOnDay } from "@/lib/dashboard";
import { fetchAllStories } from "@/lib/news";
import { geocode, dayWeather } from "@/lib/weather";
import { zonedTimeToUtc } from "@/lib/timezone";
import {
  EMPTY_FACTS,
  canEditEntry,
  isMood,
  normalizeFacts,
  onThisDayKeys,
  type JournalFacts,
  type Mood,
} from "@/lib/journal";

export type JournalEntry = {
  id: string;
  date: string;
  facts: JournalFacts;
  hasPhoto: boolean;
  photoTakenOn: string | null;
  fallback: "weather" | "map" | null;
  prompt: string;
  reflection: string;
  mood: Mood | null;
  completed: boolean;
};

type Row = typeof journalEntries.$inferSelect;

function toEntry(row: Row): JournalEntry {
  return {
    id: row.id,
    date: row.date,
    facts: normalizeFacts(row.facts),
    hasPhoto: row.photoPath !== null,
    photoTakenOn: row.photoTakenOn,
    fallback: row.fallback === "weather" || row.fallback === "map" ? row.fallback : null,
    prompt: row.prompt,
    reflection: row.reflection,
    mood: isMood(row.mood) ? row.mood : null,
    completed: row.completedAt !== null,
  };
}

function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function dayRange(tz: string, dateKey: string): { start: Date; end: Date } {
  const [y, m, d] = dateKey.split("-").map(Number);
  return { start: zonedTimeToUtc(tz, y, m, d), end: zonedTimeToUtc(tz, y, m, d + 1) };
}

async function pointsOn(userId: string, dateKey: string): Promise<number> {
  const total = async (query: Promise<{ total: string | null }[]>) => Number((await query)[0]?.total ?? 0);
  const [habit, cleaning, weekly, task] = await Promise.all([
    total(
      db
        .select({ total: sql<string | null>`sum(${habitCompletions.pointsAwarded})` })
        .from(habitCompletions)
        .where(and(eq(habitCompletions.userId, userId), eq(habitCompletions.date, dateKey))),
    ),
    total(
      db
        .select({ total: sql<string | null>`sum(${cleaningCompletions.pointsAwarded})` })
        .from(cleaningCompletions)
        .where(and(eq(cleaningCompletions.userId, userId), eq(cleaningCompletions.date, dateKey))),
    ),
    total(
      db
        .select({ total: sql<string | null>`sum(${weeklyTaskCompletions.pointsAwarded})` })
        .from(weeklyTaskCompletions)
        .where(and(eq(weeklyTaskCompletions.userId, userId), eq(weeklyTaskCompletions.date, dateKey))),
    ),
    total(
      db
        .select({ total: sql<string | null>`sum(${taskPointEvents.points})` })
        .from(taskPointEvents)
        .where(and(eq(taskPointEvents.userId, userId), eq(taskPointEvents.date, dateKey))),
    ),
  ]);
  return habit + cleaning + weekly + task;
}

// Everything the journal can say about a day without being told, drafted once
// when the entry is first saved. Any source that is unavailable is skipped.
export async function buildFacts(userId: string, dateKey: string): Promise<JournalFacts> {
  const settings = await getUserSettings(userId);
  const tz = settings.timezone;
  const { start, end } = dayRange(tz, dateKey);

  const calendar = settings.features.calendar
    ? await getCalendarEvents(userId, { days: 2, daysBack: 2 }).catch(() => null)
    : null;
  const events =
    calendar && calendar.status === "ok"
      ? calendar.events
          .filter((e) => eventOnDay(e, dateKey, tz))
          .sort((a, b) => a.start.localeCompare(b.start))
          .map((e) => e.title)
      : [];

  const [finishedRows, workoutRows, points, seenRows, place] = await Promise.all([
    db
      .select({ title: planTasks.title })
      .from(planTasks)
      .where(and(eq(planTasks.userId, userId), eq(planTasks.status, "done"), eq(planTasks.doneDate, dateKey)))
      .orderBy(asc(planTasks.doneAt)),
    db
      .select({ name: workoutDays.name })
      .from(workoutSessions)
      .innerJoin(workoutDays, and(eq(workoutDays.id, workoutSessions.dayId), eq(workoutDays.userId, workoutSessions.userId)))
      .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.date, dateKey)))
      .limit(1),
    pointsOn(userId, dateKey),
    db
      .select({ title: briefSeen.title })
      .from(briefSeen)
      .where(and(eq(briefSeen.userId, userId), gte(briefSeen.seenAt, start), lt(briefSeen.seenAt, end)))
      .orderBy(asc(briefSeen.seenAt))
      .limit(1),
    geocode(settings.briefCity),
  ]);

  let headline = seenRows[0]?.title ?? null;
  if (!headline) {
    const stories = await fetchAllStories({ city: settings.briefCity }).catch(() => []);
    headline = stories.find((s) => s.section === "national")?.title ?? stories[0]?.title ?? null;
  }

  const weather = place ? await dayWeather(place, tz, dateKey) : null;
  return {
    ...EMPTY_FACTS,
    events: events.slice(0, 8),
    finished: finishedRows.map((r) => r.title).slice(0, 8),
    workout: workoutRows[0]?.name ?? null,
    points,
    weather,
    headline: headline ? headline.slice(0, 200) : null,
    place,
  };
}

export async function getEntry(userId: string, dateKey: string): Promise<JournalEntry | null> {
  const [row] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.date, dateKey)));
  return row ? toEntry(row) : null;
}

export async function getEntryById(userId: string, id: string): Promise<{ date: string; photoPath: string | null } | null> {
  const [row] = await db
    .select({ date: journalEntries.date, photoPath: journalEntries.photoPath })
    .from(journalEntries)
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.id, id)));
  return row ?? null;
}

export async function listEntries(userId: string, limit = 60): Promise<JournalEntry[]> {
  const rows = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.userId, userId))
    .orderBy(desc(journalEntries.date))
    .limit(limit);
  return rows.map(toEntry);
}

// Only today, or yesterday until noon today, can be written.
export function entryIsOpen(dateKey: string, todayKey: string, tz: string, now: Date): boolean {
  if (dateKey === todayKey) return true;
  return dateKey === addDays(todayKey, -1) && canEditEntry(dateKey, tz, now);
}

// Creates the day's entry (drafting its facts) if it doesn't exist yet.
async function ensureEntry(userId: string, dateKey: string): Promise<Row> {
  const [existing] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.date, dateKey)));
  if (existing) return existing;
  const facts = await buildFacts(userId, dateKey);
  const [created] = await db
    .insert(journalEntries)
    .values({ userId, date: dateKey, facts })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [again] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.date, dateKey)));
  return again;
}

export type SaveInput = {
  reflection: string;
  mood: string | null;
  prompt: string;
  fallback: string | null;
  finish: boolean;
};

export async function saveEntry(userId: string, dateKey: string, input: SaveInput): Promise<JournalEntry> {
  const existing = await ensureEntry(userId, dateKey);
  const [row] = await db
    .update(journalEntries)
    .set({
      reflection: input.reflection.slice(0, 1500),
      mood: isMood(input.mood) ? input.mood : null,
      prompt: input.prompt.slice(0, 200),
      fallback: input.fallback === "weather" || input.fallback === "map" ? input.fallback : null,
      completedAt: input.finish ? (existing.completedAt ?? new Date()) : existing.completedAt,
    })
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.id, existing.id)))
    .returning();
  return toEntry(row);
}

// Records an uploaded photo and returns the previous photo's pathname, if any,
// so the caller can remove it from storage.
export async function attachPhoto(
  userId: string,
  dateKey: string,
  photoPath: string,
  takenOn: string | null,
): Promise<{ id: string; previousPath: string | null }> {
  const entry = await ensureEntry(userId, dateKey);
  await db
    .update(journalEntries)
    .set({ photoPath, photoTakenOn: takenOn, fallback: null })
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.id, entry.id)));
  return { id: entry.id, previousPath: entry.photoPath };
}

export async function removePhoto(userId: string, dateKey: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.date, dateKey)));
  if (!row?.photoPath) return null;
  await db
    .update(journalEntries)
    .set({ photoPath: null, photoTakenOn: null })
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.id, row.id)));
  return row.photoPath;
}

export type OnThisDay = { label: string; entry: JournalEntry };

// Finished entries from this date in earlier years, and a month ago.
export async function getOnThisDay(userId: string, todayKey: string): Promise<OnThisDay[]> {
  const keys = onThisDayKeys(todayKey);
  const rows = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.userId, userId), inArray(journalEntries.date, keys.map((k) => k.key))));
  return keys.flatMap(({ key, label }) => {
    const row = rows.find((r) => r.date === key);
    return row && row.completedAt ? [{ label, entry: toEntry(row) }] : [];
  });
}

// Finished entries for one calendar month (YYYY-MM), oldest first.
export async function getMonthEntries(userId: string, month: string): Promise<JournalEntry[]> {
  const rows = await db
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.userId, userId),
        gte(journalEntries.date, `${month}-01`),
        lte(journalEntries.date, `${month}-31`),
      ),
    )
    .orderBy(asc(journalEntries.date));
  return rows.filter((r) => r.completedAt !== null).map(toEntry);
}

export type JournalYear = {
  entries: number;
  photos: number;
  moods: { mood: Mood; count: number }[];
  highlights: JournalEntry[];
};

// A calm summary of the year: counts, mood mix, and a few memorable days
// (those with both a photo and some words, longest reflections first).
export async function getJournalYear(userId: string, year: string): Promise<JournalYear> {
  const rows = await db
    .select()
    .from(journalEntries)
    .where(
      and(eq(journalEntries.userId, userId), gte(journalEntries.date, `${year}-01-01`), lte(journalEntries.date, `${year}-12-31`)),
    )
    .orderBy(asc(journalEntries.date));
  const entries = rows.filter((r) => r.completedAt !== null).map(toEntry);
  const counts = new Map<Mood, number>();
  for (const e of entries) if (e.mood) counts.set(e.mood, (counts.get(e.mood) ?? 0) + 1);
  const picked = entries
    .filter((e) => e.hasPhoto && e.reflection.trim().length > 0)
    .sort((a, b) => b.reflection.length - a.reflection.length)
    .slice(0, 6)
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    entries: entries.length,
    photos: entries.filter((e) => e.hasPhoto).length,
    moods: [...counts.entries()].map(([mood, count]) => ({ mood, count })).sort((a, b) => b.count - a.count),
    highlights: picked,
  };
}

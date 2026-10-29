import { zonedTimeToUtc } from "./timezone";

export const MOODS = [
  { id: "bright", label: "Bright" },
  { id: "calm", label: "Calm" },
  { id: "grateful", label: "Grateful" },
  { id: "tired", label: "Tired" },
  { id: "heavy", label: "Heavy" },
] as const;
export type Mood = (typeof MOODS)[number]["id"];

export function isMood(value: string | null | undefined): value is Mood {
  return MOODS.some((m) => m.id === value);
}

export function moodLabel(mood: string | null): string | null {
  return MOODS.find((m) => m.id === mood)?.label ?? null;
}

export const SPARK_PROMPT = "Where did today’s spark take you?";

// One prompt a night, rotating through the list by day.
export const PROMPTS = [
  "What’s one small thing that went right today?",
  "What made you smile, even briefly?",
  "Who did you think about today?",
  "What did you learn today?",
  "What do you want to remember about today?",
  "What was the best bite, sip, or sound of the day?",
  "What are you glad is behind you?",
  "What felt easier than you expected?",
  "What’s something you did for future you?",
  "Where did you feel most like yourself today?",
  "What are you looking forward to tomorrow?",
  "What did your body ask for today?",
  "Whose kindness did you notice?",
  "What would you tell yourself this morning, knowing what you know now?",
  "What was the quietest moment of the day?",
  "What are you proud of, however small?",
  "What did you let go of today?",
  "What surprised you?",
  "What did you make, fix, or finish?",
  "What place did you like being in today?",
  "What gave you energy? What took it?",
  "What’s a tiny win nobody saw?",
  "What do you want more of this week?",
  "What was funny today?",
  "What did you notice outside?",
  "What are you grateful for tonight?",
  "What made today different from yesterday?",
  "What did you do that was just for you?",
  "What’s on your mind that you can set down now?",
  "What would make tomorrow feel good?",
];

export function promptFor(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dayNumber = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  return PROMPTS[((dayNumber % PROMPTS.length) + PROMPTS.length) % PROMPTS.length];
}

export type JournalFacts = {
  events: string[];
  finished: string[];
  workout: string | null;
  points: number;
  weather: { summary: string; high: number; low: number } | null;
  headline: string | null;
  place: { name: string; lat: number; lon: number } | null;
};

export const EMPTY_FACTS: JournalFacts = {
  events: [],
  finished: [],
  workout: null,
  points: 0,
  weather: null,
  headline: null,
  place: null,
};

// Tolerates old or partial JSON from the database.
export function normalizeFacts(raw: unknown): JournalFacts {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<JournalFacts>;
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : []);
  return {
    events: strings(r.events),
    finished: strings(r.finished),
    workout: typeof r.workout === "string" ? r.workout : null,
    points: typeof r.points === "number" ? r.points : 0,
    weather:
      r.weather && typeof r.weather.summary === "string"
        ? { summary: r.weather.summary, high: Number(r.weather.high), low: Number(r.weather.low) }
        : null,
    headline: typeof r.headline === "string" ? r.headline : null,
    place:
      r.place && typeof r.place.name === "string"
        ? { name: r.place.name, lat: Number(r.place.lat), lon: Number(r.place.lon) }
        : null,
  };
}

function listed(items: string[], max: number): string {
  if (items.length <= max) return items.join(", ");
  return `${items.slice(0, max).join(", ")} and ${items.length - max} more`;
}

// The auto-drafted facts as short calm lines; empty facts are left out.
export function factLines(facts: JournalFacts): string[] {
  const lines: string[] = [];
  if (facts.events.length > 0) lines.push(`On the calendar: ${listed(facts.events, 3)}`);
  if (facts.finished.length > 0) lines.push(`Finished: ${listed(facts.finished, 3)}`);
  if (facts.workout) lines.push(`Workout: ${facts.workout}`);
  if (facts.points > 0) lines.push(`${facts.points} ${facts.points === 1 ? "point" : "points"} earned`);
  if (facts.weather) {
    lines.push(`${facts.weather.summary}, ${Math.round(facts.weather.high)}° / ${Math.round(facts.weather.low)}°`);
  }
  if (facts.headline) lines.push(`In the news: ${facts.headline}`);
  return lines;
}

function nextDay(dateKey: string): [number, number, number] {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + 1));
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
}

// An entry can be added to or finished until noon the next day, local time.
export function completeUntil(dateKey: string, tz: string): Date {
  const [y, m, d] = nextDay(dateKey);
  return zonedTimeToUtc(tz, y, m, d, 12, 0);
}

export function canEditEntry(dateKey: string, tz: string, now: Date): boolean {
  return now.getTime() < completeUntil(dateKey, tz).getTime();
}

// A gentle note when the photo wasn't taken on the entry's day; null when it
// was, or when the photo's date is unknown.
export function photoDateNote(photoDay: string | null, entryDay: string): string | null {
  if (!photoDay || photoDay === entryDay) return null;
  const [y, m, d] = photoDay.split("-").map(Number);
  const label = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `This photo looks like it’s from ${label}. Keep it if it fits today.`;
}

// WMO weather codes (Open-Meteo) as a few calm words.
export function weatherSummary(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Mostly sunny";
  if (code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzly";
  if (code >= 61 && code <= 67) return "Rainy";
  if (code >= 71 && code <= 77) return "Snowy";
  if (code >= 80 && code <= 82) return "Showery";
  if (code === 85 || code === 86) return "Snow showers";
  if (code >= 95) return "Stormy";
  return "Mixed skies";
}

// Same month and day in earlier years, plus the same date a month back.
export function onThisDayKeys(todayKey: string): { key: string; label: string }[] {
  const [y, m, d] = todayKey.split("-").map(Number);
  const out: { key: string; label: string }[] = [];
  const monthBack = new Date(Date.UTC(y, m - 2, d));
  if (monthBack.getUTCDate() === d) out.push({ key: monthBack.toISOString().slice(0, 10), label: "A month ago" });
  for (let back = 1; back <= 10; back++) {
    const probe = new Date(Date.UTC(y - back, m - 1, d));
    if (probe.getUTCMonth() !== m - 1) continue; // Feb 29 in a non-leap year
    out.push({ key: probe.toISOString().slice(0, 10), label: back === 1 ? "A year ago" : `${back} years ago` });
  }
  return out;
}

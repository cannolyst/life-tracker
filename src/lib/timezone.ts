// Every "what day is it?" calculation in the app takes the user's IANA time
// zone explicitly (there is no implicit default), so a user in another zone
// gets correct days, weeks, and streaks. Intl resolves the named zone
// directly, so these behave identically on the server (UTC) and in the
// browser (whatever the device's zone is).

export const DEFAULT_TIMEZONE = "America/Chicago";

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string, kind: "date" | "day" | "parts"): Intl.DateTimeFormat {
  const key = `${kind}|${tz}`;
  let f = formatters.get(key);
  if (!f) {
    f =
      kind === "date"
        ? new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
        : kind === "day"
          ? new Intl.DateTimeFormat("en-US", { timeZone: tz, day: "numeric" })
          : new Intl.DateTimeFormat("en-US", {
              timeZone: tz,
              hourCycle: "h23",
              year: "numeric",
              month: "numeric",
              day: "numeric",
              hour: "numeric",
              minute: "numeric",
              second: "numeric",
            });
    formatters.set(key, f);
  }
  return f;
}

// "YYYY-MM-DD" calendar date in `tz` for the given instant.
export function dateKeyIn(tz: string, date: Date = new Date()): string {
  return formatter(tz, "date").format(date);
}

// A Date representing UTC midnight of the `tz` calendar day for the given
// instant — matches how date-only values (e.g. a transaction's date column)
// are parsed, so the two can be compared directly.
export function dateOnlyIn(tz: string, date: Date = new Date()): Date {
  return new Date(`${dateKeyIn(tz, date)}T00:00:00Z`);
}

export function dayOfMonthIn(tz: string, date: Date): number {
  return Number(formatter(tz, "day").format(date));
}

// The Sunday (UTC midnight) of the calendar week containing a UTC-midnight-
// anchored date-only value (see dateOnlyIn). Weeks run Sun-Sat.
export function startOfWeekUtc(d: Date): Date {
  const sunday = new Date(d);
  sunday.setUTCDate(sunday.getUTCDate() - d.getUTCDay());
  return sunday;
}

// The "YYYY-MM-DD" key of the Sunday starting the current calendar week in
// `tz`. Used to key a weekly-recurring checklist so a new week naturally
// starts unchecked with no reset job — same trick as dateKeyIn for daily
// tasks.
export function weekKeyIn(tz: string, date: Date = new Date()): string {
  return startOfWeekUtc(dateOnlyIn(tz, date)).toISOString().slice(0, 10);
}

export type ZonedParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  second: number;
};

// The wall-clock fields of an instant as seen in `tz`.
export function zonedParts(tz: string, date: Date): ZonedParts {
  const out: Record<string, number> = {};
  for (const part of formatter(tz, "parts").formatToParts(date)) {
    if (part.type !== "literal") out[part.type] = Number(part.value);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour === 24 ? 0 : out.hour,
    minute: out.minute,
    second: out.second,
  };
}

// Minutes after local midnight in `tz` (0-1439).
export function minutesIntoDayIn(tz: string, date: Date): number {
  const { hour, minute } = zonedParts(tz, date);
  return hour * 60 + minute;
}

// The instant whose wall-clock time in `tz` is the given fields — used for
// "floating" calendar times that carry no zone of their own. Settles on the
// right offset in two passes, which also handles daylight-saving changes.
export function zonedTimeToUtc(
  tz: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const wanted = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = wanted;
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(tz, new Date(guess));
    const seen = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    guess += wanted - seen;
  }
  return new Date(guess);
}

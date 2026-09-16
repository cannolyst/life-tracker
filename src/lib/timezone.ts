export const APP_TIMEZONE = "America/Chicago";

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Returns the "YYYY-MM-DD" calendar date in APP_TIMEZONE for the given
// instant. Works identically on the server (UTC) and in the browser
// (whatever the device's timezone is), since Intl resolves the named
// timezone directly rather than relying on the runtime's local timezone.
export function dateKeyInAppTimezone(date: Date = new Date()): string {
  return dateKeyFormatter.format(date);
}

// A Date representing UTC midnight of the APP_TIMEZONE calendar day for the
// given instant — matches how date-only values (e.g. a transaction's date
// column) are parsed, so the two can be compared directly.
export function dateOnlyInAppTimezone(date: Date = new Date()): Date {
  return new Date(`${dateKeyInAppTimezone(date)}T00:00:00Z`);
}

const dayOfMonthFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIMEZONE,
  day: "numeric",
});

export function dayOfMonthInAppTimezone(date: Date): number {
  return Number(dayOfMonthFormatter.format(date));
}

// The Sunday (UTC midnight) of the calendar week containing a UTC-midnight-
// anchored date-only value (see dateOnlyInAppTimezone). Weeks run Sun-Sat.
export function startOfWeekUtc(d: Date): Date {
  const sunday = new Date(d);
  sunday.setUTCDate(sunday.getUTCDate() - d.getUTCDay());
  return sunday;
}

// The "YYYY-MM-DD" key of the Sunday starting the current calendar week in
// APP_TIMEZONE. Used to key a weekly-recurring checklist so a new week
// naturally starts unchecked with no reset job — same trick as
// dateKeyInAppTimezone for daily tasks.
export function weekKeyInAppTimezone(date: Date = new Date()): string {
  return startOfWeekUtc(dateOnlyInAppTimezone(date)).toISOString().slice(0, 10);
}

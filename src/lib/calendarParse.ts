import ICAL from "ical.js";
import { minutesIntoDayIn, zonedParts, zonedTimeToUtc } from "./timezone";

export type CalendarEvent = {
  title: string;
  /** ISO instants. For all-day events, local midnight of the first day / the day after the last. */
  start: string;
  end: string;
  allDay: boolean;
  /** Timed events that start at or after the user's Evening block. */
  isEvening: boolean;
};

const MAX_OCCURRENCES_PER_EVENT = 1000;
const MAX_EVENTS = 500;

// ical.js times are either UTC / a registered TZID (toUnixTime is exact) or
// "floating" (no zone) — floating times mean "wall clock wherever you are",
// so they're read in the user's own zone.
function toInstant(time: ICAL.Time, tz: string): Date {
  if (time.zone.tzid === "floating") {
    return zonedTimeToUtc(tz, time.year, time.month, time.day, time.hour, time.minute, time.second);
  }
  return new Date(time.toUnixTime() * 1000);
}

function allDayBoundary(time: ICAL.Time, tz: string): Date {
  return zonedTimeToUtc(tz, time.year, time.month, time.day);
}

/**
 * Parses an .ics feed and returns the events overlapping [rangeStart, rangeEnd),
 * with recurring events expanded (and per-occurrence edits/cancellations applied),
 * sorted by start time. Never throws on a malformed feed — returns what it could read.
 */
export function parseCalendarEvents(
  ics: string,
  tz: string,
  eveningStartMinutes: number,
  rangeStart: Date,
  rangeEnd: Date,
): CalendarEvent[] {
  let root: ICAL.Component;
  try {
    root = new ICAL.Component(ICAL.parse(ics));
  } catch {
    return [];
  }

  // Zone definitions are global in ical.js, so reset around every parse.
  ICAL.TimezoneService.reset();
  try {
    for (const vtimezone of root.getAllSubcomponents("vtimezone")) {
      try {
        ICAL.TimezoneService.register(vtimezone);
      } catch {
        // A broken zone block just means those events fall back to floating.
      }
    }

    const masters = new Map<string, ICAL.Event>();
    const exceptions: ICAL.Event[] = [];
    const standalone: ICAL.Event[] = [];
    for (const vevent of root.getAllSubcomponents("vevent")) {
      let event: ICAL.Event;
      try {
        event = new ICAL.Event(vevent);
      } catch {
        continue;
      }
      if (event.isRecurrenceException()) exceptions.push(event);
      else if (event.isRecurring()) masters.set(event.uid, event);
      else standalone.push(event);
    }
    for (const exception of exceptions) {
      const master = masters.get(exception.uid);
      if (master) master.relateException(exception);
      // An exception whose master we can't see (cut off from the feed) is shown as-is.
      else standalone.push(exception);
    }

    const results: CalendarEvent[] = [];
    const add = (title: string, startTime: ICAL.Time, endTime: ICAL.Time | null) => {
      const allDay = startTime.isDate;
      let start: Date;
      let end: Date;
      if (allDay) {
        start = allDayBoundary(startTime, tz);
        end = endTime ? allDayBoundary(endTime, tz) : zonedTimeToUtc(tz, startTime.year, startTime.month, startTime.day + 1);
        if (end <= start) end = zonedTimeToUtc(tz, startTime.year, startTime.month, startTime.day + 1);
      } else {
        start = toInstant(startTime, tz);
        end = endTime ? toInstant(endTime, tz) : start;
        if (end < start) end = start;
      }
      const overlaps = end > start ? end > rangeStart && start < rangeEnd : start >= rangeStart && start < rangeEnd;
      if (!overlaps) return;
      results.push({
        title: title.trim() || "Untitled",
        start: start.toISOString(),
        end: end.toISOString(),
        allDay,
        isEvening: !allDay && minutesIntoDayIn(tz, start) >= eveningStartMinutes,
      });
    };

    for (const event of standalone) {
      if (event.startDate) add(event.summary ?? "", event.startDate, event.endDate ?? null);
    }

    for (const master of masters.values()) {
      if (!master.startDate) continue;
      let iterator: ReturnType<ICAL.Event["iterator"]>;
      try {
        iterator = master.iterator();
      } catch {
        continue;
      }
      for (const next of collectOccurrences(master, iterator, tz, rangeEnd)) {
        let details: ReturnType<ICAL.Event["getOccurrenceDetails"]>;
        try {
          details = master.getOccurrenceDetails(next);
        } catch {
          continue;
        }
        // Cancelled occurrences (an exception with STATUS:CANCELLED) are skipped.
        if (details.item.component.getFirstPropertyValue("status") === "CANCELLED") continue;
        add(details.item.summary ?? master.summary ?? "", details.startDate, details.endDate ?? null);
      }
    }

    results.sort((a, b) => a.start.localeCompare(b.start));
    return results.slice(0, MAX_EVENTS);
  } finally {
    ICAL.TimezoneService.reset();
  }
}

// ical.js only honors BYSETPOS ("the last", "the 2nd" …) when the rule also
// has BYDAY. A rule like FREQ=MONTHLY;BYMONTHDAY=28,29,30;BYSETPOS=-1 ("the
// last of those days") comes back with every candidate day instead. For those
// rules the position filter is applied here, per month (or year).
function manualSetPositions(
  master: ICAL.Event,
): { positions: number[]; keyOf: (t: ICAL.Time) => string } | null {
  const rule = master.component.getFirstPropertyValue("rrule") as ICAL.Recur | null;
  if (!rule || typeof rule !== "object" || !("parts" in rule)) return null;
  const positions = rule.parts.BYSETPOS as number[] | undefined;
  const byDay = rule.parts.BYDAY as string[] | undefined;
  if (!positions?.length || byDay?.length) return null;
  if (rule.freq === "MONTHLY") return { positions, keyOf: (t) => `${t.year}-${t.month}` };
  if (rule.freq === "YEARLY") return { positions, keyOf: (t) => String(t.year) };
  return null;
}

function pickPositions<T>(bucket: T[], positions: number[]): T[] {
  const indexes = new Set<number>();
  for (const p of positions) {
    const i = p > 0 ? p - 1 : bucket.length + p;
    if (i >= 0 && i < bucket.length) indexes.add(i);
  }
  return [...indexes].sort((a, b) => a - b).map((i) => bucket[i]);
}

/** Occurrence start times of a recurring event up to the end of the window, with BYSETPOS applied. */
function collectOccurrences(
  master: ICAL.Event,
  iterator: ReturnType<ICAL.Event["iterator"]>,
  tz: string,
  rangeEnd: Date,
): ICAL.Time[] {
  const manual = manualSetPositions(master);
  const out: ICAL.Time[] = [];
  let bucket: ICAL.Time[] = [];
  let bucketKey: string | null = null;

  for (let i = 0; i < MAX_OCCURRENCES_PER_EVENT; i++) {
    const next = iterator.next();
    if (!next) break;
    const instant = next.isDate ? allDayBoundary(next, tz) : toInstant(next, tz);
    if (!manual) {
      // Stop once occurrences begin after the window (all-day compare by local day).
      if (instant >= rangeEnd) break;
      out.push(next);
      continue;
    }
    const key = manual.keyOf(next);
    if (key !== bucketKey) {
      out.push(...pickPositions(bucket, manual.positions));
      bucket = [];
      bucketKey = key;
      // A new period that starts after the window can't contribute anything.
      if (instant >= rangeEnd) return out;
    }
    bucket.push(next);
  }
  out.push(...pickPositions(bucket, manual?.positions ?? []));
  return out;
}

/** Local calendar day (YYYY-MM-DD) an event starts on — handy for grouping. */
export function eventDayKey(event: CalendarEvent, tz: string): string {
  const p = zonedParts(tz, new Date(event.start));
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

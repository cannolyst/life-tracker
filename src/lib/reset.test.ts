import { describe, it, expect } from "vitest";
import {
  RESET_POINTS,
  STALE_DAYS,
  buildLookAhead,
  isSunday,
  resetWeekKey,
  staleTasks,
  suggestAssignments,
  suggestHighlight,
  summarizeWeek,
} from "./reset";
import type { CalendarEvent } from "./calendarParse";

const TZ = "America/Chicago";

describe("week key", () => {
  it("is the Sunday on or before the day", () => {
    // Oct 25 2026 is a Sunday
    expect(isSunday("2026-10-25")).toBe(true);
    expect(isSunday("2026-10-26")).toBe(false);
    expect(resetWeekKey("2026-10-25")).toBe("2026-10-25");
    expect(resetWeekKey("2026-10-28")).toBe("2026-10-25");
    expect(resetWeekKey("2026-10-31")).toBe("2026-10-25");
    expect(resetWeekKey("2026-11-01")).toBe("2026-11-01");
  });

  it("crosses month and year boundaries", () => {
    expect(resetWeekKey("2027-01-02")).toBe("2026-12-27");
  });

  it("is worth the approved five points", () => {
    expect(RESET_POINTS).toBe(5);
  });
});

describe("summarizeWeek", () => {
  const rows = [
    { date: "2026-10-18", points: 50 }, // too old (before the 7-day window)
    { date: "2026-10-26", points: 4 },
    { date: "2026-10-26", points: 3 },
    { date: "2026-10-28", points: 12 },
    { date: "2026-10-31", points: 2 },
    { date: "2026-11-01", points: 9 }, // today: not part of the week just ended
  ];

  it("reviews the seven days before today", () => {
    const week = summarizeWeek(rows, "2026-11-01");
    expect(week.total).toBe(21);
    expect(week.activeDays).toBe(3);
    expect(week.best).toEqual({ dateKey: "2026-10-28", points: 12 });
  });

  it("copes with a quiet week", () => {
    expect(summarizeWeek([], "2026-11-01")).toEqual({ total: 0, activeDays: 0, best: null });
  });
});

describe("suggestHighlight", () => {
  it("prefers the biggest finished task, then the best day, else nothing", () => {
    const best = { dateKey: "2026-10-28", points: 12 };
    expect(
      suggestHighlight({ finished: [{ title: "Email Priya", minutes: 10 }, { title: "Write the report", minutes: 45 }], best }),
    ).toBe("Finished: Write the report");
    expect(suggestHighlight({ finished: [], best })).toBe("Best day: Wednesday, 12 points");
    expect(suggestHighlight({ finished: [], best: null })).toBe("");
  });
});

describe("buildLookAhead", () => {
  // Chicago is UTC-5 until Nov 1 2026 (CDT), UTC-6 after.
  const dinner: CalendarEvent = {
    title: "Dinner with Sam",
    start: "2026-11-03T00:30:00.000Z", // Mon Nov 2, 7:30 pm CST? (Nov 2 is after DST ends: UTC-6)
    end: "2026-11-03T02:00:00.000Z",
    allDay: false,
    isEvening: true,
  };
  const standup: CalendarEvent = {
    title: "Standup",
    start: "2026-11-03T15:00:00.000Z", // Tue 9:00 am
    end: "2026-11-03T15:30:00.000Z",
    allDay: false,
    isEvening: false,
  };

  it("flags out nights from the calendar or the user's own mark, and the rest are open", () => {
    const days = buildLookAhead({
      todayKey: "2026-11-01",
      events: [dinner, standup],
      markedOut: new Set(["2026-11-04"]),
      tz: TZ,
    });
    expect(days).toHaveLength(7);
    expect(days[0].label).toBe("Today");
    const byKey = Object.fromEntries(days.map((d) => [d.dateKey, d]));
    expect(byKey["2026-11-02"]).toMatchObject({ outTonight: true, outReason: "calendar", openEvening: false });
    expect(byKey["2026-11-03"]).toMatchObject({ outTonight: false, openEvening: true });
    expect(byKey["2026-11-03"].events.map((e) => e.title)).toEqual(["Standup"]);
    expect(byKey["2026-11-04"]).toMatchObject({ outTonight: true, outReason: "marked", openEvening: false });
    expect(days.filter((d) => d.openEvening)).toHaveLength(5);
  });

  it("treats a week with no calendar as all open", () => {
    const days = buildLookAhead({ todayKey: "2026-11-01", events: [], markedOut: new Set(), tz: TZ });
    expect(days.every((d) => d.openEvening)).toBe(true);
  });
});

describe("suggestAssignments", () => {
  const t = (id: string, minutes: number | null, over = {}) => ({
    id,
    title: id,
    minutes,
    status: "open",
    plannedFor: null as string | null,
    ...over,
  });

  it("puts the biggest tasks on the open evenings, one each", () => {
    const picks = suggestAssignments([t("small", 10), t("big", 90), t("medium", 45), t("another", 60)], ["a", "b"]);
    expect(picks).toEqual({ a: "big", b: "another" });
  });

  it("only suggests big, open, unplanned tasks", () => {
    expect(suggestAssignments([t("tiny", 5), t("done", 60, { status: "done" }), t("planned", 60, { plannedFor: "x" })], ["a"])).toEqual({});
    expect(suggestAssignments([t("big", 60)], [])).toEqual({});
  });
});

describe("staleTasks", () => {
  const now = Date.UTC(2026, 10, 1);
  const daysAgo = (n: number) => new Date(now - n * 86_400_000);
  const base = { status: "open", plannedFor: null as string | null, reviewedAt: null as Date | null };

  it("finds open, unplanned tasks untouched for three weeks", () => {
    const tasks = [
      { id: "old", ...base, createdAt: daysAgo(STALE_DAYS + 1) },
      { id: "fresh", ...base, createdAt: daysAgo(3) },
      { id: "planned", ...base, plannedFor: "2026-11-03", createdAt: daysAgo(40) },
      { id: "done", ...base, status: "done", createdAt: daysAgo(40) },
    ];
    expect(staleTasks(tasks, now).map((x) => x.id)).toEqual(["old"]);
  });

  it("stops counting as stale once it's been kept", () => {
    const kept = { id: "kept", ...base, createdAt: daysAgo(60), reviewedAt: daysAgo(2) };
    expect(staleTasks([kept], now)).toEqual([]);
  });
});

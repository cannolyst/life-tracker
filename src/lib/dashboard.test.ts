import { describe, it, expect } from "vitest";
import {
  billDueOn,
  buildComingUp,
  buildFlags,
  buildGreeting,
  buildNowCard,
  buildTimeline,
  eventOnDay,
  greetingHighlights,
  type NowInput,
} from "./dashboard";
import { currentBlock, dayBlocks, formatMinutes, isEveningTone } from "./dayBlocks";
import { DEFAULT_DAY_STRUCTURE } from "./userSettingsDefaults";
import type { CalendarEvent } from "./calendarParse";

const TZ = "America/Chicago";
const S = DEFAULT_DAY_STRUCTURE; // 5:00 launch, 8:00 work, 4:00pm transition, 5:00pm evening, 8:00pm shutdown
const t = (h: number, m = 0) => h * 60 + m;

// Chicago is UTC-6 in January.
function event(title: string, startUtc: string, endUtc: string, extra: Partial<CalendarEvent> = {}): CalendarEvent {
  return { title, start: startUtc, end: endUtc, allDay: false, isEvening: false, ...extra };
}

describe("day blocks", () => {
  it("finds the block for a time of day", () => {
    expect(currentBlock(S, t(6))?.id).toBe("launch");
    expect(currentBlock(S, t(8))?.id).toBe("work");
    expect(currentBlock(S, t(15, 59))?.id).toBe("work");
    expect(currentBlock(S, t(16))?.id).toBe("transition");
    expect(currentBlock(S, t(17))?.id).toBe("evening");
    expect(currentBlock(S, t(20))?.id).toBe("shutdown");
    expect(currentBlock(S, t(23, 59))?.id).toBe("shutdown");
    expect(currentBlock(S, t(3))).toBeNull();
  });

  it("drops a block with no length", () => {
    const noTransition = { ...S, workEndMinutes: t(17) };
    expect(dayBlocks(noTransition).map((b) => b.id)).toEqual(["launch", "work", "evening", "shutdown"]);
  });

  it("formats times and the evening-tone window", () => {
    expect(formatMinutes(0)).toBe("12:00 am");
    expect(formatMinutes(t(16))).toBe("4:00 pm");
    expect(formatMinutes(t(12, 5))).toBe("12:05 pm");
    expect(isEveningTone(S, t(19, 59))).toBe(false);
    expect(isEveningTone(S, t(20))).toBe(true);
    expect(isEveningTone(S, t(4, 59))).toBe(true);
    expect(isEveningTone(S, t(5))).toBe(false);
  });
});

describe("greeting", () => {
  it("builds the briefing sentence", () => {
    expect(buildGreeting({ name: "Cody", minutes: t(7), weekday: "Wednesday", highlights: ["Run day", "TBM chapter 2 tonight"] })).toBe(
      "Morning, Cody. Wednesday: Run day, TBM chapter 2 tonight.",
    );
  });

  it("works without a name or highlights, and changes with the time of day", () => {
    expect(buildGreeting({ name: null, minutes: t(14), weekday: "Friday", highlights: [] })).toBe(
      "Afternoon. Friday: nothing pressing.",
    );
    expect(buildGreeting({ name: "Sam", minutes: t(19), weekday: "Friday", highlights: ["a"] })).toMatch(/^Evening, Sam\./);
  });

  it("prefers a workout and an evening event, then falls back to what's on deck", () => {
    const dinner = event("Dinner", "2026-01-15T01:00:00.000Z", "2026-01-15T03:00:00.000Z", { isEvening: true });
    expect(
      greetingHighlights({ workoutName: "Run", todayEvents: [dinner], nowMinutes: t(7), onDeckCount: 4, tz: TZ }),
    ).toEqual(["Run day", "Dinner tonight"]);
    expect(greetingHighlights({ workoutName: null, todayEvents: [], nowMinutes: t(7), onDeckCount: 3, tz: TZ })).toEqual([
      "3 things on deck",
    ]);
    expect(greetingHighlights({ workoutName: null, todayEvents: [], nowMinutes: t(7), onDeckCount: 1, tz: TZ })).toEqual([
      "1 thing on deck",
    ]);
    expect(greetingHighlights({ workoutName: null, todayEvents: [], nowMinutes: t(7), onDeckCount: 0, tz: TZ })).toEqual([]);
  });

  it("mentions the next timed event when nothing is in the evening", () => {
    const standup = event("Standup", "2026-01-14T15:30:00.000Z", "2026-01-14T16:00:00.000Z"); // 9:30 am
    expect(greetingHighlights({ workoutName: null, todayEvents: [standup], nowMinutes: t(8), onDeckCount: 0, tz: TZ })).toEqual([
      "Standup at 9:30 am",
    ]);
  });
});

describe("Now card", () => {
  const base: NowInput = {
    structure: S,
    minutes: t(6),
    habit: { name: "Make the bed", points: 2 },
    cleaning: { name: "Wipe counters", overdue: false },
    weekly: { name: "Call Mom" },
    workout: { dayName: "Push" },
    doneToday: 0,
  };

  it("launches with the workout, then habits", () => {
    expect(buildNowCard(base).title).toBe("Push");
    expect(buildNowCard({ ...base, workout: null }).title).toBe("Make the bed");
    expect(buildNowCard({ ...base, workout: null, habit: null, weekly: null }).title).toBe("Launch is covered");
  });

  it("stays quiet during work and points to the next open window", () => {
    const card = buildNowCard({ ...base, minutes: t(10) });
    expect(card.title).toBe("Work time");
    expect(card.detail).toContain("4:00 pm");
    expect(card.href).toBeUndefined();
  });

  it("suggests rest, then one easy thing, in the transition", () => {
    const card = buildNowCard({ ...base, minutes: t(16, 30) });
    expect(card.title).toBe("Take a breather");
    expect(card.detail).toContain("Make the bed");
  });

  it("starts the evening with cleaning, and says when the list is clear", () => {
    expect(buildNowCard({ ...base, minutes: t(18) }).title).toBe("Wipe counters");
    expect(buildNowCard({ ...base, minutes: t(18), cleaning: null, habit: null, weekly: null, workout: null }).title).toBe(
      "Nothing left on your list",
    );
  });

  it("winds down at shutdown, with calm wording", () => {
    expect(buildNowCard({ ...base, minutes: t(21) }).title).toMatch(/^One small thing before bed/);
    const done = buildNowCard({ ...base, minutes: t(21), habit: null, cleaning: null, doneToday: 3 });
    expect(done.title).toBe("Wind down");
    expect(done.detail).toBe("3 things done today. That counts.");
  });

  it("handles the small hours before Launch", () => {
    expect(buildNowCard({ ...base, minutes: t(3) }).title).toBe("It's early");
  });

  it("never uses alarming wording", () => {
    for (const minutes of [t(3), t(6), t(10), t(16, 30), t(18), t(21)]) {
      const card = buildNowCard({ ...base, minutes, cleaning: { name: "x", overdue: true } });
      expect(JSON.stringify(card)).not.toMatch(/overdue|late|behind|missed|failed/i);
    }
  });
});

describe("timeline", () => {
  it("merges events with the day's blocks in order and marks the current one", () => {
    const lunch = event("Lunch with Sam", "2026-01-14T18:00:00.000Z", "2026-01-14T19:00:00.000Z"); // noon
    const dinner = event("Dinner", "2026-01-15T00:30:00.000Z", "2026-01-15T02:00:00.000Z", { isEvening: true }); // 6:30 pm
    const holiday: CalendarEvent = {
      title: "Holiday",
      start: "2026-01-14T06:00:00.000Z",
      end: "2026-01-15T06:00:00.000Z",
      allDay: true,
      isEvening: false,
    };
    const timeline = buildTimeline({
      structure: S,
      nowMinutes: t(12, 15),
      todayKey: "2026-01-14",
      events: [lunch, dinner, holiday],
      tz: TZ,
    });
    expect(timeline.allDay).toEqual(["Holiday"]);
    expect(timeline.rows.map((r) => r.title)).toEqual([
      "Launch",
      "Work",
      "Lunch with Sam",
      "Transition",
      "Evening",
      "Dinner",
      "Shutdown",
    ]);
    const byTitle = Object.fromEntries(timeline.rows.map((r) => [r.title, r.state]));
    expect(byTitle).toMatchObject({ Launch: "past", Work: "now", "Lunch with Sam": "now", Evening: "later", Dinner: "later" });
  });

  it("leaves out events on other days", () => {
    const tomorrow = event("Tomorrow thing", "2026-01-15T16:00:00.000Z", "2026-01-15T17:00:00.000Z");
    const timeline = buildTimeline({ structure: S, nowMinutes: t(9), todayKey: "2026-01-14", events: [tomorrow], tz: TZ });
    expect(timeline.rows.some((r) => r.title === "Tomorrow thing")).toBe(false);
  });
});

describe("coming up", () => {
  const events = [
    event("Early flight", "2026-01-15T11:00:00.000Z", "2026-01-15T13:00:00.000Z"), // 5:00 am Jan 15
    event("Concert", "2026-01-16T01:30:00.000Z", "2026-01-16T04:00:00.000Z", { isEvening: true }), // 7:30 pm Jan 15
    event("Brunch", "2026-01-17T17:00:00.000Z", "2026-01-17T18:00:00.000Z"), // 11:00 am Jan 17
  ];

  const days = buildComingUp({
    todayKey: "2026-01-14",
    structure: S,
    events,
    bills: [{ name: "Rent", dueDay: 17, amount: 1250 }],
    cleaning: [{ name: "Wash sheets", dueKey: "2026-01-16" }],
    tz: TZ,
  });

  it("groups the next days and skips empty ones", () => {
    expect(days.map((d) => d.label)).toEqual(["Tomorrow", "Friday", "Saturday"]);
  });

  it("adds prep where an item needs it", () => {
    const tomorrow = days[0].items;
    expect(tomorrow.find((i) => i.title === "Early flight")?.prep).toMatch(/early start/i);
    expect(tomorrow.find((i) => i.title === "Concert")?.prep).toMatch(/evening plans/i);
    expect(days[2].items.find((i) => i.kind === "bill")?.title).toBe("Rent due · $1,250");
    expect(days[2].items.find((i) => i.title === "Brunch")?.prep).toBeUndefined();
  });

  it("puts bills and cleaning on their due days", () => {
    expect(days[1].items.map((i) => i.title)).toEqual(["Wash sheets"]);
  });

  it("caps a busy day", () => {
    const many = Array.from({ length: 7 }, (_, i) =>
      event(`E${i}`, "2026-01-15T16:00:00.000Z", "2026-01-15T17:00:00.000Z"),
    );
    const [day] = buildComingUp({ todayKey: "2026-01-14", structure: S, events: many, bills: [], cleaning: [], tz: TZ });
    expect(day.items).toHaveLength(4);
    expect(day.more).toBe(3);
  });
});

describe("billDueOn / eventOnDay", () => {
  it("clamps a 31st due day to short months", () => {
    expect(billDueOn(31, "2026-02-28")).toBe(true);
    expect(billDueOn(31, "2026-02-27")).toBe(false);
    expect(billDueOn(15, "2026-03-15")).toBe(true);
  });

  it("spans multi-day all-day events across each of their days", () => {
    const trip: CalendarEvent = {
      title: "Trip",
      start: "2026-01-14T06:00:00.000Z",
      end: "2026-01-17T06:00:00.000Z",
      allDay: true,
      isEvening: false,
    };
    expect(eventOnDay(trip, "2026-01-14", TZ)).toBe(true);
    expect(eventOnDay(trip, "2026-01-16", TZ)).toBe(true);
    expect(eventOnDay(trip, "2026-01-17", TZ)).toBe(false);
  });
});

describe("flags", () => {
  const base = { streak: 6, habitDoneToday: false, minutes: t(18), structure: S, bills: [] };

  it("flags a streak that's waiting on a habit once the workday is over", () => {
    expect(buildFlags(base).map((f) => f.key)).toEqual(["streak"]);
    expect(buildFlags({ ...base, minutes: t(10) })).toEqual([]);
    expect(buildFlags({ ...base, habitDoneToday: true })).toEqual([]);
    expect(buildFlags({ ...base, streak: 1 })).toEqual([]);
  });

  it("flags bills due within two days, soonest first, and never more than three flags", () => {
    const flags = buildFlags({
      ...base,
      bills: [
        { name: "Phone", daysUntil: 2 },
        { name: "Rent", daysUntil: 0 },
        { name: "Power", daysUntil: 1 },
        { name: "Water", daysUntil: 5 },
        { name: "Gym", daysUntil: 2 },
      ],
    });
    expect(flags).toHaveLength(3);
    expect(flags.map((f) => f.text)).toEqual(["Rent is due today.", "Power is due tomorrow.", "Phone is due in 2 days."]);
  });

  it("uses calm wording", () => {
    const text = JSON.stringify(buildFlags({ ...base, bills: [{ name: "Rent", daysUntil: 0 }] }));
    expect(text).not.toMatch(/overdue|urgent|late|!/i);
  });
});

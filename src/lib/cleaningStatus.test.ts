import { describe, it, expect } from "vitest";
import { computeCleaningStatus, classifyByTimeframe } from "./cleaningStatus";

const today = new Date(Date.UTC(2026, 0, 10, 18)); // Jan 10, 2026 (Saturday), mid-day UTC
const createdAt = new Date(Date.UTC(2025, 11, 1, 12));

describe("computeCleaningStatus", () => {
  it("is due today when the due date lands exactly on today", () => {
    const { status } = computeCleaningStatus("2026-01-03", 7, createdAt, today);
    expect(status).toBe("due-today");
  });

  it("is overdue when the due date has passed", () => {
    const { status } = computeCleaningStatus("2026-01-01", 7, createdAt, today);
    expect(status).toBe("overdue");
  });

  it("is upcoming when the due date is still ahead", () => {
    const { status } = computeCleaningStatus("2026-01-08", 7, createdAt, today);
    expect(status).toBe("upcoming");
  });

  it("anchors to createdAt when never completed", () => {
    const neverDone = computeCleaningStatus(null, 7, new Date(Date.UTC(2026, 0, 5, 12)), today);
    expect(neverDone.status).toBe("upcoming"); // due Jan 12, today is Jan 10

    const overdueSinceCreation = computeCleaningStatus(null, 3, new Date(Date.UTC(2026, 0, 1, 12)), today);
    expect(overdueSinceCreation.status).toBe("overdue"); // due Jan 4, today is Jan 10
  });
});

describe("classifyByTimeframe", () => {
  const d = (day: number) => new Date(Date.UTC(2026, 0, day));

  it("buckets overdue tasks regardless of due date", () => {
    expect(classifyByTimeframe("overdue", d(1), today)).toBe("overdue");
  });

  it("buckets the rest of this calendar week (Sun Jan 4 - Sat Jan 10) as 'week'", () => {
    expect(classifyByTimeframe("due-today", d(10), today)).toBe("week");
    expect(classifyByTimeframe("upcoming", d(4), today)).toBe("week");
  });

  it("buckets next calendar week (Sun Jan 11 - Sat Jan 17) as 'next-week'", () => {
    expect(classifyByTimeframe("upcoming", d(11), today)).toBe("next-week");
    expect(classifyByTimeframe("upcoming", d(17), today)).toBe("next-week");
  });

  it("buckets the rest of the month (Jan 18 - Jan 31) as 'month'", () => {
    expect(classifyByTimeframe("upcoming", d(18), today)).toBe("month");
    expect(classifyByTimeframe("upcoming", d(31), today)).toBe("month");
  });

  it("buckets anything past month-end as 'later'", () => {
    expect(classifyByTimeframe("upcoming", new Date(Date.UTC(2026, 1, 1)), today)).toBe("later");
  });

  it("moves a just-completed weekly task from this week into next week", () => {
    // Task due today (Jan 10) gets completed today, pushing its next due
    // date out by its 7-day frequency to Jan 17 — still within next week's
    // Sun Jan 11 - Sat Jan 17 range, so it should read as "next-week", not
    // linger in "week" the way a rolling 7-day window would.
    const { dueDate } = computeCleaningStatus("2026-01-10", 7, createdAt, today);
    expect(classifyByTimeframe("upcoming", dueDate, today)).toBe("next-week");
  });
});

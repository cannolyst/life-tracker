import { describe, it, expect } from "vitest";
import { computeCleaningStatus } from "./cleaningStatus";

const today = new Date(Date.UTC(2026, 0, 10, 18)); // Jan 10, 2026, mid-day UTC
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

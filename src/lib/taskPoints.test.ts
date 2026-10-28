import { describe, it, expect } from "vitest";
import {
  REENTRY_POINTS,
  START_MAX_PER_DAY,
  START_POINTS,
  dayDiff,
  describeAward,
  finishPoints,
  isReentry,
  lastActiveBefore,
} from "./taskPoints";

describe("approved values", () => {
  it("starts at +1, capped at three tasks a day, with a +5 welcome back", () => {
    expect(START_POINTS).toBe(1);
    expect(START_MAX_PER_DAY).toBe(3);
    expect(REENTRY_POINTS).toBe(5);
  });

  it("pays for finishing by size", () => {
    expect(finishPoints(null)).toBe(2);
    expect(finishPoints(1)).toBe(2);
    expect(finishPoints(10)).toBe(2);
    expect(finishPoints(11)).toBe(3);
    expect(finishPoints(30)).toBe(3);
    expect(finishPoints(31)).toBe(5);
    expect(finishPoints(60)).toBe(5);
    expect(finishPoints(61)).toBe(8);
    expect(finishPoints(240)).toBe(8);
  });
});

describe("re-entry", () => {
  it("counts whole quiet days since the last activity", () => {
    expect(dayDiff("2026-10-28", "2026-10-31")).toBe(3);
    // active Oct 28, today Oct 31: Oct 29 and 30 were quiet → comeback
    expect(isReentry("2026-10-28", "2026-10-31")).toBe(true);
    // only one quiet day (Oct 30) → not yet
    expect(isReentry("2026-10-29", "2026-10-31")).toBe(false);
    expect(isReentry("2026-10-30", "2026-10-31")).toBe(false);
  });

  it("isn't triggered by a brand-new user or by activity today", () => {
    expect(isReentry(null, "2026-10-31")).toBe(false);
    expect(isReentry("2026-10-31", "2026-10-31")).toBe(false);
  });

  it("works across month and year boundaries", () => {
    expect(isReentry("2026-12-29", "2027-01-01")).toBe(true);
    expect(isReentry("2026-02-27", "2026-03-02")).toBe(true);
  });

  it("finds the last active day before today", () => {
    const days = ["2026-10-20", "2026-10-28", "2026-10-31", "2026-11-02"];
    expect(lastActiveBefore(days, "2026-10-31")).toBe("2026-10-28");
    expect(lastActiveBefore(new Set(["2026-10-31"]), "2026-10-31")).toBeNull();
    expect(lastActiveBefore([], "2026-10-31")).toBeNull();
  });
});

describe("describeAward", () => {
  it("says what was earned, kindly", () => {
    expect(describeAward(1, false)).toBe("+1 point");
    expect(describeAward(3, false)).toBe("+3 points");
    expect(describeAward(8, true)).toBe("Welcome back — +8 points including a +5 comeback bonus.");
  });
});

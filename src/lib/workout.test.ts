import { describe, it, expect } from "vitest";
import { setScore, compareWeekOverWeek, evaluateProgressiveOverload } from "./workout";

describe("setScore", () => {
  it("scores a strength set as weight x reps", () => {
    expect(setScore({ weight: 100, reps: 10, durationSeconds: null })).toBe(1000);
  });

  it("scores a duration set as its hold time", () => {
    expect(setScore({ weight: null, reps: null, durationSeconds: 45 })).toBe(45);
  });

  it("scores an incomplete set as 0", () => {
    expect(setScore({ weight: 100, reps: null, durationSeconds: null })).toBe(0);
  });
});

describe("compareWeekOverWeek", () => {
  it("reports no-data when either week is empty", () => {
    expect(compareWeekOverWeek([], [{ weight: 100, reps: 10, durationSeconds: null }])).toBe(
      "no-data",
    );
    expect(compareWeekOverWeek([{ weight: 100, reps: 10, durationSeconds: null }], [])).toBe(
      "no-data",
    );
  });

  it("reports up when this week's best set beats last week's", () => {
    const thisWeek = [{ weight: 110, reps: 10, durationSeconds: null }];
    const lastWeek = [{ weight: 100, reps: 10, durationSeconds: null }];
    expect(compareWeekOverWeek(thisWeek, lastWeek)).toBe("up");
  });

  it("reports down when this week's best set is worse", () => {
    const thisWeek = [{ weight: 90, reps: 10, durationSeconds: null }];
    const lastWeek = [{ weight: 100, reps: 10, durationSeconds: null }];
    expect(compareWeekOverWeek(thisWeek, lastWeek)).toBe("down");
  });

  it("reports flat when the best sets tie", () => {
    const thisWeek = [{ weight: 100, reps: 10, durationSeconds: null }];
    const lastWeek = [{ weight: 50, reps: 20, durationSeconds: null }];
    expect(compareWeekOverWeek(thisWeek, lastWeek)).toBe("flat");
  });

  it("compares hold time for duration exercises", () => {
    const thisWeek = [{ weight: null, reps: null, durationSeconds: 60 }];
    const lastWeek = [{ weight: null, reps: null, durationSeconds: 45 }];
    expect(compareWeekOverWeek(thisWeek, lastWeek)).toBe("up");
  });
});

describe("evaluateProgressiveOverload", () => {
  const targetReps = 12;

  it("is not ready with fewer than two sessions", () => {
    const sessions = [[{ weight: 100, reps: 12, durationSeconds: null }]];
    expect(evaluateProgressiveOverload(sessions, targetReps).ready).toBe(false);
  });

  it("is ready when both sessions used the same weight and hit target reps", () => {
    const sessions = [
      [
        { weight: 100, reps: 12, durationSeconds: null },
        { weight: 100, reps: 13, durationSeconds: null },
      ],
      [
        { weight: 100, reps: 14, durationSeconds: null },
        { weight: 100, reps: 12, durationSeconds: null },
      ],
    ];
    const result = evaluateProgressiveOverload(sessions, targetReps);
    expect(result.ready).toBe(true);
    expect(result.currentWeight).toBe(100);
  });

  it("is not ready when the weight changed between sessions", () => {
    const sessions = [
      [{ weight: 95, reps: 12, durationSeconds: null }],
      [{ weight: 100, reps: 12, durationSeconds: null }],
    ];
    expect(evaluateProgressiveOverload(sessions, targetReps).ready).toBe(false);
  });

  it("is not ready when a set fell short of target reps", () => {
    const sessions = [
      [{ weight: 100, reps: 12, durationSeconds: null }],
      [{ weight: 100, reps: 10, durationSeconds: null }],
    ];
    expect(evaluateProgressiveOverload(sessions, targetReps).ready).toBe(false);
  });

  it("is never ready for duration-only sets (no weight)", () => {
    const sessions = [
      [{ weight: null, reps: null, durationSeconds: 60 }],
      [{ weight: null, reps: null, durationSeconds: 65 }],
    ];
    expect(evaluateProgressiveOverload(sessions, targetReps).ready).toBe(false);
  });
});

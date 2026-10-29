import { describe, it, expect } from "vitest";
import {
  buildGoalMetrics,
  daysLeftLabel,
  deadlineState,
  elapsedFraction,
  extendedDeadline,
  finishProgress,
  isShortGoal,
  neededPace,
  ongoingActiveWeeks,
  paceForFinish,
  paceForOngoing,
  rhythmStats,
  validateDeadline,
  weekStartKey,
  weeklyCounts,
  PACE_LABEL,
} from "./goals";

describe("deadlines", () => {
  it("accepts about a month to a year", () => {
    expect(validateDeadline("2026-01-01", "2026-01-31")).toBeNull();
    expect(validateDeadline("2026-01-01", "2026-12-31")).toBeNull();
    expect(validateDeadline("2026-01-01", "2026-01-20")).toMatch(/month/);
    expect(validateDeadline("2026-01-01", "2027-06-01")).toMatch(/year/);
  });

  it("splits short goals (Sunday reset) from long ones (monthly review) at about 60 days", () => {
    expect(isShortGoal("2026-01-01", "2026-02-15")).toBe(true); // 45 days
    expect(isShortGoal("2026-01-01", "2026-03-01")).toBe(true); // 59 days is still short
    expect(isShortGoal("2026-01-01", "2026-03-02")).toBe(false); // 60 days
    expect(isShortGoal("2026-01-01", "2026-06-01")).toBe(false);
  });

  it("extends by whole days and reports what's left calmly", () => {
    expect(extendedDeadline("2026-03-01", 30)).toBe("2026-03-31");
    expect(deadlineState("2026-03-01", "2026-02-27")).toEqual({ reached: false, daysLeft: 2 });
    expect(deadlineState("2026-03-01", "2026-03-01")).toEqual({ reached: true, daysLeft: 0 });
    expect(deadlineState("2026-03-01", "2026-03-10").reached).toBe(true);
    expect(daysLeftLabel(0)).toBe("deadline reached");
    expect(daysLeftLabel(1)).toBe("1 day left");
    expect(daysLeftLabel(9)).toBe("9 days left");
    expect(daysLeftLabel(45)).toBe("about 6 weeks left");
  });
});

describe("weeks", () => {
  it("run Sunday to Saturday", () => {
    expect(weekStartKey("2026-11-01")).toBe("2026-11-01"); // Sunday
    expect(weekStartKey("2026-11-04")).toBe("2026-11-01");
    expect(weekStartKey("2026-11-07")).toBe("2026-11-01"); // Saturday
    expect(weekStartKey("2026-11-08")).toBe("2026-11-08");
  });

  it("counts activity by week", () => {
    const counts = weeklyCounts(["2026-11-01", "2026-11-03", "2026-11-03", "2026-11-09"]);
    expect(counts.get("2026-11-01")).toBe(3);
    expect(counts.get("2026-11-08")).toBe(1);
  });
});

describe("finish goals", () => {
  it("track milestones, or the goal's tasks when there are none", () => {
    expect(finishProgress({ milestonesDone: 2, milestonesTotal: 5, tasksDone: 9, tasksTotal: 9 })).toEqual({
      ratio: 0.4,
      detail: "2 of 5 milestones",
    });
    expect(finishProgress({ milestonesDone: 0, milestonesTotal: 0, tasksDone: 1, tasksTotal: 4 })).toEqual({
      ratio: 0.25,
      detail: "1 of 4 steps",
    });
    expect(finishProgress({ milestonesDone: 0, milestonesTotal: 0, tasksDone: 0, tasksTotal: 0 }).ratio).toBe(0);
  });

  it("is judged against how much of the time has passed", () => {
    expect(elapsedFraction("2026-01-01", "2026-04-11", "2026-02-15")).toBeCloseTo(0.45, 1);
    expect(elapsedFraction("2026-01-01", "2026-04-11", "2025-12-01")).toBe(0);
    expect(elapsedFraction("2026-01-01", "2026-04-11", "2027-01-01")).toBe(1);
    expect(paceForFinish(0.6, 0.45)).toBe("ahead");
    expect(paceForFinish(0.45, 0.45)).toBe("on_pace");
    expect(paceForFinish(0.35, 0.45)).toBe("on_pace");
    expect(paceForFinish(0.25, 0.45)).toBe("behind");
    expect(paceForFinish(0.05, 0.6)).toBe("fresh_look");
  });

  it("says how fast it takes to land on time", () => {
    expect(neededPace(0, "2026-01-01", "2026-03-01")).toBeNull();
    expect(neededPace(8, "2026-01-01", "2026-01-29")).toBe("About 2 a week to finish on time.");
    expect(neededPace(2, "2026-01-01", "2026-03-12")).toBe("About one every 5 weeks to finish on time.");
  });
});

describe("rhythm goals", () => {
  // Goal starts Wed Nov 4 2026. Full weeks after: Nov 8, Nov 15, Nov 22.
  const start = "2026-11-04";

  it("counts weeks on target out of the full weeks so far", () => {
    const counts = weeklyCounts([
      "2026-11-08", "2026-11-10", "2026-11-12", // week of Nov 8: 3 (hit, target 3)
      "2026-11-15", "2026-11-17", // week of Nov 15: 2 (miss)
      "2026-11-22", "2026-11-23", "2026-11-25", "2026-11-27", // week of Nov 22: 4 (hit)
      "2026-11-30", // this week (Nov 29): 1
    ]);
    const stats = rhythmStats(counts, 3, start, "2026-12-01");
    expect(stats).toEqual({ completedWeeks: 3, weeksHit: 2, thisWeek: 1, ratio: 2 / 3 });
  });

  it("doesn't count the partial first week or the current week against you", () => {
    const stats = rhythmStats(new Map(), 3, start, "2026-11-06");
    expect(stats).toMatchObject({ completedWeeks: 0, weeksHit: 0, ratio: 0 });
    const early = rhythmStats(weeklyCounts(["2026-11-04", "2026-11-05"]), 3, start, "2026-11-06");
    expect(early.thisWeek).toBe(2);
    expect(early.ratio).toBeCloseTo(2 / 3);
  });

  it("describes progress in plain words", () => {
    const metrics = buildGoalMetrics({
      kind: "rhythm",
      startKey: start,
      deadlineKey: "2027-01-04",
      todayKey: "2026-12-01",
      weeklyTarget: 3,
      finish: { milestonesDone: 0, milestonesTotal: 0, tasksDone: 0, tasksTotal: 0 },
      activityDates: ["2026-11-08", "2026-11-10", "2026-11-12", "2026-11-22", "2026-11-23", "2026-11-25", "2026-11-30"],
    });
    expect(metrics.detail).toBe("2 of 3 weeks on target · 1/3 this week");
    expect(metrics.pace).toBe("behind");
    expect(metrics.paceLabel).toBe(PACE_LABEL.behind);
  });
});

describe("ongoing goals", () => {
  it("count the active weeks among the last four", () => {
    const counts = weeklyCounts(["2026-11-30", "2026-11-17", "2026-11-03"]);
    // today Dec 2 → weeks of Nov 29, Nov 22, Nov 15, Nov 8
    expect(ongoingActiveWeeks(counts, "2026-12-02")).toBe(2);
    expect(paceForOngoing(4)).toBe("ahead");
    expect(paceForOngoing(3)).toBe("on_pace");
    expect(paceForOngoing(2)).toBe("behind");
    expect(paceForOngoing(1)).toBe("fresh_look");
    expect(paceForOngoing(0)).toBe("fresh_look");
  });

  it("only counts activity since the goal began", () => {
    const metrics = buildGoalMetrics({
      kind: "ongoing",
      startKey: "2026-11-20",
      deadlineKey: "2027-02-20",
      todayKey: "2026-12-02",
      weeklyTarget: null,
      finish: { milestonesDone: 0, milestonesTotal: 0, tasksDone: 0, tasksTotal: 0 },
      activityDates: ["2026-10-01", "2026-11-02", "2026-11-25"],
    });
    expect(metrics.detail).toBe("1 of the last 4 weeks active");
    expect(metrics.progress).toBe(0.25);
  });
});

describe("calm wording", () => {
  it("never uses harsh words", () => {
    for (const label of Object.values(PACE_LABEL)) expect(label).not.toMatch(/fail|overdue|late|miss|bad/i);
  });
});

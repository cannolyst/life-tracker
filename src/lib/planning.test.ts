import { describe, it, expect } from "vitest";
import {
  BUCKETS,
  REST_SECONDS,
  capacityCap,
  formatCountdown,
  groupOpenByBucket,
  inLunchWindow,
  lunchWindow,
  outTonightState,
  pickLunchTask,
  pickStarter,
  restRemainingSeconds,
  roomLeft,
  versionFor,
  type PlanTaskLike,
} from "./planning";
import { DEFAULT_DAY_STRUCTURE } from "./userSettingsDefaults";

const S = DEFAULT_DAY_STRUCTURE;
const t = (h: number, m = 0) => h * 60 + m;

function task(over: Partial<PlanTaskLike> & { id: string }): PlanTaskLike {
  return {
    title: "Task " + over.id,
    lowTitle: null,
    bucket: "inbox",
    minutes: null,
    status: "open",
    plannedFor: null,
    isPriority: false,
    ...over,
  };
}

describe("energy versions", () => {
  const withLow = { title: "Run 3 miles", lowTitle: "Walk around the block" };
  it("shows the easier version only for a low-energy check-in", () => {
    expect(versionFor(withLow, "low")).toEqual({ title: "Walk around the block", easier: true });
    expect(versionFor(withLow, "high")).toEqual({ title: "Run 3 miles", easier: false });
    expect(versionFor(withLow, null)).toEqual({ title: "Run 3 miles", easier: false });
  });

  it("falls back to the normal version when there's no easier one", () => {
    expect(versionFor({ title: "Study", lowTitle: null }, "low")).toEqual({ title: "Study", easier: false });
  });
});

describe("capacity cap", () => {
  it("matches what was finished today, with a floor of one", () => {
    expect(capacityCap(0)).toBe(1);
    expect(capacityCap(1)).toBe(1);
    expect(capacityCap(4)).toBe(4);
    expect(capacityCap(3.9)).toBe(3);
  });

  it("works out how much room is left", () => {
    expect(roomLeft(3, 1)).toBe(2);
    expect(roomLeft(3, 3)).toBe(0);
    expect(roomLeft(3, 5)).toBe(0);
  });
});

describe("lunch", () => {
  it("is the middle of the work block, clipped to the user's own hours", () => {
    expect(lunchWindow(S)).toEqual({ start: t(11, 30), end: t(13, 30) });
    expect(lunchWindow({ ...S, workStartMinutes: t(12), workEndMinutes: t(13) })).toEqual({ start: t(12), end: t(13) });
    expect(lunchWindow({ ...S, workStartMinutes: t(14), workEndMinutes: t(18), eveningStartMinutes: t(18) })).toBeNull();
  });

  it("checks a time against the window", () => {
    expect(inLunchWindow(S, t(11, 29))).toBe(false);
    expect(inLunchWindow(S, t(11, 30))).toBe(true);
    expect(inLunchWindow(S, t(13, 29))).toBe(true);
    expect(inLunchWindow(S, t(13, 30))).toBe(false);
  });

  it("picks the shortest open task of ten minutes or less", () => {
    const tasks = [
      task({ id: "a", minutes: 25 }),
      task({ id: "b", minutes: 10 }),
      task({ id: "c", minutes: 5 }),
      task({ id: "d", minutes: null }),
      task({ id: "e", minutes: 3, status: "done" }),
    ];
    expect(pickLunchTask(tasks)?.id).toBe("c");
    expect(pickLunchTask([task({ id: "x", minutes: 30 })])).toBeNull();
  });
});

describe("couch-friendly starter", () => {
  it("prefers tasks that have an easier version, then the smallest", () => {
    const tasks = [
      task({ id: "big", minutes: 60 }),
      task({ id: "small", minutes: 5 }),
      task({ id: "easy", lowTitle: "Just open the book", minutes: 30 }),
    ];
    expect(pickStarter(tasks)?.id).toBe("easy");
    expect(pickStarter(tasks.filter((x) => x.id !== "easy"))?.id).toBe("small");
  });

  it("ignores finished and Someday tasks", () => {
    expect(pickStarter([task({ id: "a", status: "done" }), task({ id: "b", status: "someday" })])).toBeNull();
  });
});

describe("rest timer", () => {
  it("counts down twenty minutes and stops at zero", () => {
    const start = 1_000_000;
    expect(restRemainingSeconds(start, start)).toBe(REST_SECONDS);
    expect(restRemainingSeconds(start, start + 60_000)).toBe(REST_SECONDS - 60);
    expect(restRemainingSeconds(start, start + 30 * 60_000)).toBe(0);
    expect(restRemainingSeconds(start, start - 5_000)).toBe(REST_SECONDS);
  });

  it("formats the countdown", () => {
    expect(formatCountdown(1200)).toBe("20:00");
    expect(formatCountdown(65)).toBe("1:05");
    expect(formatCountdown(0)).toBe("0:00");
  });
});

describe("out tonight", () => {
  it("turns on automatically with an evening event", () => {
    expect(outTonightState({ stored: null, hasEveningEvent: true })).toEqual({ on: true, source: "auto" });
    expect(outTonightState({ stored: null, hasEveningEvent: false })).toEqual({ on: false, source: "none" });
  });

  it("lets the user's own tap win in both directions", () => {
    expect(outTonightState({ stored: { outTonight: false, source: "manual" }, hasEveningEvent: true })).toEqual({
      on: false,
      source: "manual",
    });
    expect(outTonightState({ stored: { outTonight: true, source: "manual" }, hasEveningEvent: false })).toEqual({
      on: true,
      source: "manual",
    });
  });
});

describe("evening buckets", () => {
  it("groups open tasks by bucket with today's planned ones first", () => {
    const tasks = [
      task({ id: "a", bucket: "home" }),
      task({ id: "b", bucket: "home", plannedFor: "2026-10-29" }),
      task({ id: "c", bucket: "learning" }),
      task({ id: "d", bucket: "body", status: "done" }),
      task({ id: "e", bucket: "inbox", status: "someday" }),
    ];
    const grouped = groupOpenByBucket(tasks, "2026-10-29");
    expect(grouped.home.map((x) => x.id)).toEqual(["b", "a"]);
    expect(grouped.learning.map((x) => x.id)).toEqual(["c"]);
    expect(grouped.body).toEqual([]);
    expect(grouped.inbox).toEqual([]);
    expect(Object.keys(grouped)).toEqual([...BUCKETS]);
  });
});

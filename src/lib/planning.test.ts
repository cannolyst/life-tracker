import { describe, it, expect } from "vitest";
import {
  BUCKETS,
  DEFAULT_FIRST_STEP,
  REST_SECONDS,
  capacityCap,
  composeTitle,
  dealCard,
  firstStepFor,
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

describe("composeTitle", () => {
  it("puts the verb first, once", () => {
    expect(composeTitle("call", "the dentist")).toBe("Call the dentist");
    expect(composeTitle("Email", "Priya about the lease")).toBe("Email priya about the lease");
    expect(composeTitle("Call", "call the dentist")).toBe("call the dentist");
    expect(composeTitle("", "Laundry")).toBe("Laundry");
    expect(composeTitle(null, "  Laundry  ")).toBe("Laundry");
  });
});

describe("firstStepFor", () => {
  it("uses the written first step, or a gentle default", () => {
    expect(firstStepFor({ firstStep: "Open the lease PDF" })).toBe("Open the lease PDF");
    expect(firstStepFor({ firstStep: "  " })).toBe(DEFAULT_FIRST_STEP);
    expect(firstStepFor({})).toBe(DEFAULT_FIRST_STEP);
  });
});

describe("dealCard", () => {
  const ctx = { todayKey: "2026-10-30", energy: null, blockId: "evening" } as const;
  const act = (over: Partial<PlanTaskLike> & { id: string; bucket?: PlanTaskLike["bucket"] }) =>
    ({ ...task({ bucket: "home", ...over }), energy: null, block: null, skippedDate: null, ...over }) as PlanTaskLike & {
      energy: "high" | "low" | null;
      block: string | null;
      skippedDate: string | null;
    };

  it("never deals an Inbox item or a finished one", () => {
    const tasks = [act({ id: "a", bucket: "inbox" }), act({ id: "b", status: "done" }), act({ id: "c", status: "someday" })];
    expect(dealCard(tasks, ctx)).toBeNull();
  });

  it("leads with what's planned for today, then the block's own tasks", () => {
    const tasks = [act({ id: "any" }), act({ id: "mine", block: "evening" }), act({ id: "today", plannedFor: "2026-10-30" })];
    expect(dealCard(tasks, ctx)?.id).toBe("today");
    expect(dealCard(tasks.filter((t) => t.id !== "today"), ctx)?.id).toBe("mine");
  });

  it("holds back tasks that belong to another block", () => {
    const tasks = [act({ id: "morning", block: "launch" }), act({ id: "free" })];
    expect(dealCard(tasks, ctx)?.id).toBe("free");
  });

  it("favors easy tasks on a low-energy evening and demanding ones on a high-energy one", () => {
    const tasks = [act({ id: "hard", energy: "high" }), act({ id: "easy", energy: "low" }), act({ id: "plain" })];
    expect(dealCard(tasks, { ...ctx, energy: "low" })?.id).toBe("easy");
    expect(dealCard(tasks, { ...ctx, energy: "high" })?.id).toBe("hard");
  });

  it("deals a smaller task after “Not this one”, and doesn't bring the passed-over one back", () => {
    const tasks = [
      act({ id: "big", minutes: 60, skippedDate: "2026-10-30" }),
      act({ id: "medium", minutes: 30 }),
      act({ id: "small", minutes: 10 }),
      act({ id: "unsized" }),
    ];
    const first = dealCard(tasks, ctx);
    expect(first?.id).not.toBe("big");
    expect(first?.minutes).not.toBeNull();
    expect((first?.minutes ?? 99) < 60).toBe(true);
    // Passing over the 30-minute one too narrows it to the 10-minute one.
    const second = dealCard(tasks.map((t) => (t.id === "medium" ? { ...t, skippedDate: "2026-10-30" } : t)), ctx);
    expect(second?.id).toBe("small");
  });

  it("falls back to anything left, and only forgets yesterday's swaps", () => {
    const tasks = [act({ id: "only", minutes: 20, skippedDate: "2026-10-30" }), act({ id: "unsized" })];
    expect(dealCard(tasks, ctx)?.id).toBe("unsized");
    expect(dealCard([act({ id: "yesterday", skippedDate: "2026-10-29" })], ctx)?.id).toBe("yesterday");
    expect(dealCard([act({ id: "gone", skippedDate: "2026-10-30" })], ctx)).toBeNull();
  });
});

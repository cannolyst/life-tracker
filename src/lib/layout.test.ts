import { describe, expect, it } from "vitest";
import {
  hideWidget,
  moveWidget,
  placeWidget,
  resolveLayout,
  sanitizeLayout,
  showWidget,
  type WidgetDef,
} from "./layout";

const defs: WidgetDef[] = [
  { id: "now", defaultColumn: 0, defaultOrder: 1 },
  { id: "capture", defaultColumn: 0, defaultOrder: 2 },
  { id: "today", defaultColumn: 1, defaultOrder: 1 },
  { id: "brief", defaultColumn: 1, defaultOrder: 3 },
  { id: "spark", defaultColumn: 2, defaultOrder: 2 },
];

describe("resolveLayout", () => {
  it("starts every card in its default column and order", () => {
    expect(resolveLayout(defs, undefined, 3)).toEqual({
      columns: [["now", "capture"], ["today", "brief"], ["spark"]],
      hidden: [],
    });
  });

  it("keeps a saved arrangement, dropping cards that no longer exist", () => {
    const saved = { columns: [["today", "ghost", "now"], [], ["spark", "capture", "brief"]], hidden: [] };
    expect(resolveLayout(defs, saved, 3).columns).toEqual([["today", "now"], [], ["spark", "capture", "brief"]]);
  });

  it("slots a brand-new card into its default place", () => {
    const saved = { columns: [["now"], ["brief"], ["spark"]], hidden: [] };
    const withNew = [...defs, { id: "flags", defaultColumn: 1, defaultOrder: 2 }];
    // today (order 1) and flags (order 2) both slot in ahead of brief (order 3).
    expect(resolveLayout(withNew, saved, 3).columns[1]).toEqual(["today", "flags", "brief"]);
  });

  it("keeps hidden cards hidden and out of the columns", () => {
    const saved = { columns: [["now"], ["today"], ["spark"]], hidden: ["brief", "capture", "nope"] };
    const resolved = resolveLayout(defs, saved, 3);
    expect(resolved.hidden).toEqual(["brief", "capture"]);
    expect(resolved.columns.flat()).not.toContain("brief");
  });

  it("folds extra saved columns into the last one when there are fewer columns", () => {
    const saved = { columns: [["now"], ["today"], ["spark"]], hidden: [] };
    expect(resolveLayout(defs, saved, 2).columns).toEqual([["now", "capture"], ["today", "spark", "brief"]]);
  });
});

describe("moving cards", () => {
  const base = { columns: [["now", "capture"], ["today", "brief"], ["spark"]], hidden: [] as string[] };

  it("moves up and down within a column and stops at the ends", () => {
    expect(moveWidget(base, "capture", "up").columns[0]).toEqual(["capture", "now"]);
    expect(moveWidget(base, "now", "up")).toBe(base);
    expect(moveWidget(base, "now", "down").columns[0]).toEqual(["capture", "now"]);
    expect(moveWidget(base, "capture", "down")).toBe(base);
  });

  it("moves across columns, keeping the row where it can", () => {
    const moved = moveWidget(base, "capture", "right");
    expect(moved.columns).toEqual([["now"], ["today", "capture", "brief"], ["spark"]]);
    expect(moveWidget(base, "now", "left")).toBe(base);
    expect(moveWidget(base, "spark", "right")).toBe(base);
  });

  it("places a dragged card at an exact spot, including an empty column", () => {
    const empty = { columns: [["a", "b"], []], hidden: [] as string[] };
    expect(placeWidget(empty, "a", 1, 0).columns).toEqual([["b"], ["a"]]);
    expect(placeWidget(base, "now", 2, 99).columns[2]).toEqual(["spark", "now"]);
  });

  it("hides a card and brings it back at the bottom of a column", () => {
    const hidden = hideWidget(base, "today");
    expect(hidden.hidden).toEqual(["today"]);
    expect(hidden.columns.flat()).not.toContain("today");
    expect(showWidget(hidden, "today", 0).columns[0]).toEqual(["now", "capture", "today"]);
    expect(showWidget(hidden, "today", 0).hidden).toEqual([]);
  });
});

describe("sanitizeLayout", () => {
  it("accepts a well-formed layout and drops duplicates and bad ids", () => {
    expect(sanitizeLayout({ columns: [["a", "a", 3], ["b"]], hidden: ["c", ""] })).toEqual({
      columns: [["a"], ["b"]],
      hidden: ["c"],
    });
  });

  it("rejects the wrong shape or too many columns", () => {
    expect(sanitizeLayout(null)).toBeNull();
    expect(sanitizeLayout({ columns: "x" })).toBeNull();
    expect(sanitizeLayout({ columns: [[], [], [], [], []] })).toBeNull();
    expect(sanitizeLayout({ columns: [["a"], "b"] })).toBeNull();
  });
});

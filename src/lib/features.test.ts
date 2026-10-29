import { describe, expect, it } from "vitest";
import { DASHBOARD_PARTS, isFeatureOn, isPartId, isPartOn } from "./features";

describe("dashboard parts", () => {
  it("are off until the dashboard is on", () => {
    expect(isPartOn({}, "goals")).toBe(false);
    expect(isPartOn({ goals: true }, "goals")).toBe(false);
  });

  it("come on with the dashboard and can be switched off one by one", () => {
    expect(isPartOn({ dashboard: true }, "journal")).toBe(true);
    expect(isPartOn({ dashboard: true, journal: false }, "journal")).toBe(false);
    expect(isPartOn({ dashboard: true, journal: false }, "goals")).toBe(true);
  });

  it("have unique ids and don't collide with top-level features", () => {
    const ids = DASHBOARD_PARTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(isPartId("spark")).toBe(true);
    expect(isPartId("dashboard")).toBe(false);
    expect(isFeatureOn({ dashboard: true }, "calendar")).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { timeAgo } from "./timeAgo";

const now = new Date("2026-10-23T18:00:00Z");

describe("timeAgo", () => {
  it("formats minutes, hours and days", () => {
    expect(timeAgo("2026-10-23T17:59:40Z", now)).toBe("just now");
    expect(timeAgo("2026-10-23T17:25:00Z", now)).toBe("35m ago");
    expect(timeAgo("2026-10-23T15:00:00Z", now)).toBe("3h ago");
    expect(timeAgo("2026-10-21T18:00:00Z", now)).toBe("2d ago");
  });
  it("falls back to a short date for old stories and empty for bad input", () => {
    expect(timeAgo("2026-10-01T18:00:00Z", now)).toBe("Oct 1");
    expect(timeAgo(null, now)).toBe("");
    expect(timeAgo("nonsense", now)).toBe("");
  });
});

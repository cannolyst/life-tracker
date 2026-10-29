import { describe, expect, it } from "vitest";
import {
  flagsMessage,
  isInWindow,
  kindsDue,
  runsToday,
  silencedByOutTonight,
} from "./notifications";
import { DEFAULT_NOTIFICATION_PREFS } from "./userSettingsDefaults";

const prefs = DEFAULT_NOTIFICATION_PREFS;
const t = (h: number, m = 0) => h * 60 + m;

describe("isInWindow", () => {
  it("opens at the scheduled time and closes after the window", () => {
    expect(isInWindow(t(12, 14), t(12, 15))).toBe(false);
    expect(isInWindow(t(12, 15), t(12, 15))).toBe(true);
    expect(isInWindow(t(12, 59), t(12, 15))).toBe(true);
    expect(isInWindow(t(13, 0), t(12, 15))).toBe(false);
  });
});

describe("kindsDue", () => {
  it("sends lunch at 12:15 on a weekday", () => {
    expect(kindsDue({ nowMinutes: t(12, 20), weekday: 3, prefs })).toEqual(["lunch"]);
  });

  it("skips lunch on weekends and the Sunday reminder on other days", () => {
    expect(kindsDue({ nowMinutes: t(12, 20), weekday: 6, prefs })).toEqual([]);
    expect(runsToday("sunday", 2)).toBe(false);
    expect(kindsDue({ nowMinutes: t(10, 5), weekday: 0, prefs })).toEqual(["sunday"]);
  });

  it("nudges for shutdown at 8:30pm", () => {
    expect(kindsDue({ nowMinutes: t(20, 35), weekday: 2, prefs })).toEqual(["shutdown"]);
  });

  it("respects switches and custom times", () => {
    const off = { ...prefs, lunchCard: false };
    expect(kindsDue({ nowMinutes: t(12, 20), weekday: 3, prefs: off })).toEqual([]);
    const custom = { ...prefs, times: { ...prefs.times, flags: t(7, 30) } };
    expect(kindsDue({ nowMinutes: t(7, 40), weekday: 3, prefs: custom })).toEqual(["flags"]);
  });

  it("never exceeds four a day", () => {
    const all = { ...prefs, times: { lunch: t(9), shutdown: t(9), sunday: t(9), flags: t(9) } };
    expect(kindsDue({ nowMinutes: t(9, 5), weekday: 0, prefs: all }).length).toBeLessThanOrEqual(4);
  });
});

describe("Out tonight", () => {
  it("quiets only what is scheduled for the evening", () => {
    expect(silencedByOutTonight("shutdown", prefs, t(17))).toBe(true);
    expect(silencedByOutTonight("lunch", prefs, t(17))).toBe(false);
    expect(silencedByOutTonight("sunday", prefs, t(17))).toBe(false);
  });
});

describe("flagsMessage", () => {
  it("links straight to a single flag and counts several", () => {
    const one = flagsMessage([{ text: "Rent is due tomorrow.", href: "/finance" }]);
    expect(one.url).toBe("/finance");
    const many = flagsMessage([
      { text: "Rent is due tomorrow.", href: "/finance" },
      { text: "Netflix trial ends today.", href: "/life" },
    ]);
    expect(many.title).toBe("2 things worth a look");
    expect(many.body).toContain("+1 more");
    expect(many.url).toBe("/");
  });
});

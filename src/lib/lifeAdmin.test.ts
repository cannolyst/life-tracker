import { describe, it, expect } from "vitest";
import {
  addMonths,
  auditTotals,
  describeInterval,
  dueLabel,
  intervalToDays,
  mentionsPerson,
  monthlyEquivalent,
  nextBirthday,
  nextChargeKey,
  recurringStatus,
  seeNudgeDue,
  subscriptionStatus,
  turningAge,
} from "./lifeAdmin";

describe("recurring items", () => {
  it("converts and describes intervals", () => {
    expect(intervalToDays(2, "weeks")).toBe(14);
    expect(intervalToDays(3, "months")).toBe(90);
    expect(intervalToDays(1, "years")).toBe(365);
    expect(intervalToDays(0, "days")).toBe(1);
    expect(intervalToDays(99, "years")).toBe(3650);
    expect(describeInterval(365)).toBe("every year");
    expect(describeInterval(730)).toBe("every 2 years");
    expect(describeInterval(90)).toBe("every 3 months");
    expect(describeInterval(14)).toBe("every 2 weeks");
    expect(describeInterval(10)).toBe("every 10 days");
    expect(describeInterval(1)).toBe("every day");
  });

  it("is due last done plus the interval, and moves through later → coming → due", () => {
    const item = { lastDone: "2026-10-01", intervalDays: 30, createdKey: "2026-01-01" };
    expect(recurringStatus(item, "2026-10-01")).toEqual({ dueKey: "2026-10-31", daysUntil: 30, phase: "later" });
    expect(recurringStatus(item, "2026-10-17")).toMatchObject({ daysUntil: 14, phase: "coming" });
    expect(recurringStatus(item, "2026-10-16")).toMatchObject({ daysUntil: 15, phase: "later" });
    expect(recurringStatus(item, "2026-10-31")).toMatchObject({ daysUntil: 0, phase: "due" });
    expect(recurringStatus(item, "2026-11-05")).toMatchObject({ daysUntil: -5, phase: "due" });
  });

  it("is due right away when it has never been done", () => {
    expect(recurringStatus({ lastDone: null, intervalDays: 90, createdKey: "2026-10-20" }, "2026-10-29")).toMatchObject({
      dueKey: "2026-10-20",
      phase: "due",
    });
  });

  it("resets the clock when done", () => {
    const done = { lastDone: "2026-10-29", intervalDays: 90, createdKey: "2026-01-01" };
    expect(recurringStatus(done, "2026-10-29")).toMatchObject({ daysUntil: 90, phase: "later" });
  });

  it("uses calm wording", () => {
    expect(dueLabel(0)).toBe("ready today");
    expect(dueLabel(1)).toBe("tomorrow");
    expect(dueLabel(9)).toBe("in 9 days");
    expect(dueLabel(-1)).toBe("ready since yesterday");
    expect(dueLabel(-6)).toBe("ready since 6 days ago");
    for (const n of [-30, -1, 0, 1, 20]) expect(dueLabel(n)).not.toMatch(/overdue|late|missed/i);
  });
});

describe("subscriptions and trials", () => {
  it("adds months, clamping the day", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
    expect(addMonths("2026-12-01", 1)).toBe("2027-01-01");
  });

  it("rolls a passed charge date forward by the cycle, without drifting", () => {
    expect(nextChargeKey("2026-10-31", "monthly", "2026-10-29")).toBe("2026-10-31");
    expect(nextChargeKey("2026-01-31", "monthly", "2026-03-01")).toBe("2026-03-31");
    expect(nextChargeKey("2025-11-02", "yearly", "2026-10-29")).toBe("2026-11-02");
    expect(nextChargeKey("2024-11-02", "yearly", "2026-11-03")).toBe("2027-11-02");
  });

  it("treats a trial as converting on its end date, then as a normal subscription", () => {
    const trial = { nextCharge: "2026-11-01", cycle: "monthly" as const, trialEnds: "2026-11-01" };
    expect(subscriptionStatus(trial, "2026-10-30")).toEqual({ chargeKey: "2026-11-01", daysUntil: 2, isTrial: true });
    expect(subscriptionStatus(trial, "2026-11-01")).toMatchObject({ daysUntil: 0, isTrial: true });
    // After it converts: not a trial anymore; the next charge a month later
    expect(subscriptionStatus(trial, "2026-11-02")).toEqual({ chargeKey: "2026-12-01", daysUntil: 29, isTrial: false });
  });

  it("totals what you actually pay, excluding trials", () => {
    const totals = auditTotals([
      { amount: 15, cycle: "monthly", isTrial: false },
      { amount: 120, cycle: "yearly", isTrial: false },
      { amount: 99, cycle: "monthly", isTrial: true },
    ]);
    expect(totals.count).toBe(2);
    expect(totals.monthly).toBe(25);
    expect(totals.yearly).toBe(300);
    expect(monthlyEquivalent(120, "yearly")).toBe(10);
  });
});

describe("birthdays", () => {
  it("finds the next one, including later this year and next year", () => {
    expect(nextBirthday(11, 3, "2026-10-29")).toEqual({ dateKey: "2026-11-03", daysUntil: 5 });
    expect(nextBirthday(10, 29, "2026-10-29")).toEqual({ dateKey: "2026-10-29", daysUntil: 0 });
    expect(nextBirthday(10, 28, "2026-10-29")).toEqual({ dateKey: "2027-10-28", daysUntil: 364 });
  });

  it("puts a Feb 29 birthday on Feb 28 in common years", () => {
    expect(nextBirthday(2, 29, "2026-02-01").dateKey).toBe("2026-02-28");
    expect(nextBirthday(2, 29, "2028-02-01").dateKey).toBe("2028-02-29");
  });

  it("works out the age they're turning, when the year is known", () => {
    expect(turningAge(1995, "2026-11-03")).toBe(31);
    expect(turningAge(null, "2026-11-03")).toBeNull();
  });
});

describe("see them every X weeks", () => {
  it("nudges once that long has passed since they were last seen", () => {
    const person = { seeEveryWeeks: 4, lastSeen: "2026-09-20", createdKey: "2026-01-01" };
    expect(seeNudgeDue(person, "2026-10-17")).toBeNull(); // 27 days
    expect(seeNudgeDue(person, "2026-10-18")).toEqual({ weeksSince: 4 });
    expect(seeNudgeDue(person, "2026-11-29")).toEqual({ weeksSince: 10 });
  });

  it("counts from when they were added if never seen, and does nothing without a cadence", () => {
    expect(seeNudgeDue({ seeEveryWeeks: 2, lastSeen: null, createdKey: "2026-10-01" }, "2026-10-14")).toBeNull();
    expect(seeNudgeDue({ seeEveryWeeks: 2, lastSeen: null, createdKey: "2026-10-01" }, "2026-10-15")).toEqual({ weeksSince: 2 });
    expect(seeNudgeDue({ seeEveryWeeks: null, lastSeen: null, createdKey: "2020-01-01" }, "2026-10-29")).toBeNull();
  });
});

describe("mentionsPerson", () => {
  const names = ["Sam Lee", "Priya", "Dan"];

  it("matches full names and unique first names as whole words, ignoring case", () => {
    expect(mentionsPerson("Dinner with Sam", "Sam Lee", names)).toBe(true);
    expect(mentionsPerson("sam lee — birthday", "Sam Lee", names)).toBe(true);
    expect(mentionsPerson("Coffee: Priya", "Priya", names)).toBe(true);
  });

  it("doesn't match inside other words", () => {
    expect(mentionsPerson("Danny's party", "Dan", names)).toBe(false);
    expect(mentionsPerson("Abundant harvest", "Dan", names)).toBe(false);
    expect(mentionsPerson("Samsung demo", "Sam Lee", names)).toBe(false);
  });

  it("needs the full name when two people share a first name", () => {
    const shared = ["Sam Lee", "Sam Cho"];
    expect(mentionsPerson("Lunch with Sam", "Sam Lee", shared)).toBe(false);
    expect(mentionsPerson("Lunch with Sam Lee", "Sam Lee", shared)).toBe(true);
  });

  it("ignores very short first names and empty names", () => {
    expect(mentionsPerson("Meeting with Al", "Al Green", ["Al Green"])).toBe(false);
    expect(mentionsPerson("anything", "", [""])).toBe(false);
  });
});

import { describe, it, expect, beforeAll } from "vitest";
import { randomBytes } from "node:crypto";
import { parseCalendarEvents } from "./calendarParse";
import { normalizeCalendarUrl, calendarUrlHint, isAllowedCalendarHost } from "./calendarUrl";
import { encryptSecret, decryptSecret } from "./calendarCrypto";

const TZ = "America/Chicago";
const EVENING = 17 * 60;
// Mon Jan 12 2026 00:00 Chicago → Mon Jan 19
const rangeStart = new Date(Date.UTC(2026, 0, 12, 6));
const rangeEnd = new Date(Date.UTC(2026, 0, 19, 6));

function ics(...events: string[]): string {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//test//EN", ...events, "END:VCALENDAR"].join("\r\n");
}

const parse = (text: string) => parseCalendarEvents(text, TZ, EVENING, rangeStart, rangeEnd);

describe("parseCalendarEvents", () => {
  it("reads a UTC event and flags evening starts in the user's zone", () => {
    const events = parse(
      ics(
        // 18:30 UTC = 12:30 Chicago (CST) — not evening
        "BEGIN:VEVENT\r\nUID:a\r\nDTSTART:20260113T183000Z\r\nDTEND:20260113T193000Z\r\nSUMMARY:Lunch\r\nEND:VEVENT",
        // 01:00 UTC Jan 15 = 19:00 Jan 14 Chicago — evening
        "BEGIN:VEVENT\r\nUID:b\r\nDTSTART:20260115T010000Z\r\nDTEND:20260115T030000Z\r\nSUMMARY:Dinner\r\nEND:VEVENT",
      ),
    );
    expect(events.map((e) => [e.title, e.isEvening])).toEqual([
      ["Lunch", false],
      ["Dinner", true],
    ]);
  });

  it("reads floating times in the user's zone", () => {
    const [event] = parse(
      ics("BEGIN:VEVENT\r\nUID:f\r\nDTSTART:20260113T090000\r\nDTEND:20260113T100000\r\nSUMMARY:Standup\r\nEND:VEVENT"),
    );
    expect(event.start).toBe("2026-01-13T15:00:00.000Z");
    expect(event.allDay).toBe(false);
  });

  it("treats all-day events as whole local days", () => {
    const [event] = parse(
      ics(
        "BEGIN:VEVENT\r\nUID:d\r\nDTSTART;VALUE=DATE:20260114\r\nDTEND;VALUE=DATE:20260115\r\nSUMMARY:Holiday\r\nEND:VEVENT",
      ),
    );
    expect(event.allDay).toBe(true);
    expect(event.isEvening).toBe(false);
    expect(event.start).toBe("2026-01-14T06:00:00.000Z");
    expect(event.end).toBe("2026-01-15T06:00:00.000Z");
  });

  it("honors a VTIMEZONE definition", () => {
    const vtimezone = [
      "BEGIN:VTIMEZONE",
      "TZID:America/New_York",
      "BEGIN:STANDARD",
      "DTSTART:19701101T020000",
      "TZOFFSETFROM:-0400",
      "TZOFFSETTO:-0500",
      "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
      "END:STANDARD",
      "END:VTIMEZONE",
    ].join("\r\n");
    const [event] = parse(
      ics(
        vtimezone,
        "BEGIN:VEVENT\r\nUID:ny\r\nDTSTART;TZID=America/New_York:20260113T100000\r\nDTEND;TZID=America/New_York:20260113T110000\r\nSUMMARY:East coast call\r\nEND:VEVENT",
      ),
    );
    expect(event.start).toBe("2026-01-13T15:00:00.000Z");
  });

  it("expands recurring events, skips cancelled and applies edited occurrences", () => {
    const events = parse(
      ics(
        "BEGIN:VEVENT\r\nUID:r\r\nDTSTART:20260105T150000Z\r\nDTEND:20260105T160000Z\r\nRRULE:FREQ=DAILY;COUNT=10\r\nSUMMARY:Daily\r\nEND:VEVENT",
        // Jan 13 moved one hour later and renamed
        "BEGIN:VEVENT\r\nUID:r\r\nRECURRENCE-ID:20260113T150000Z\r\nDTSTART:20260113T160000Z\r\nDTEND:20260113T170000Z\r\nSUMMARY:Daily (moved)\r\nEND:VEVENT",
        // Jan 14 cancelled
        "BEGIN:VEVENT\r\nUID:r\r\nRECURRENCE-ID:20260114T150000Z\r\nDTSTART:20260114T150000Z\r\nDTEND:20260114T160000Z\r\nSTATUS:CANCELLED\r\nSUMMARY:Daily\r\nEND:VEVENT",
      ),
    );
    const days = events.map((e) => e.start.slice(0, 10));
    // Occurrences run Jan 5–14; the window starts Jan 12, so Jan 12, 13 and (cancelled) 14.
    expect(days).toEqual(["2026-01-12", "2026-01-13"]);
    expect(events[1].title).toBe("Daily (moved)");
    expect(events[1].start).toBe("2026-01-13T16:00:00.000Z");
  });

  it("excludes events outside the window", () => {
    const events = parse(
      ics(
        "BEGIN:VEVENT\r\nUID:o\r\nDTSTART:20260301T150000Z\r\nDTEND:20260301T160000Z\r\nSUMMARY:Later\r\nEND:VEVENT",
        "BEGIN:VEVENT\r\nUID:p\r\nDTSTART:20251201T150000Z\r\nDTEND:20251201T160000Z\r\nSUMMARY:Earlier\r\nEND:VEVENT",
      ),
    );
    expect(events).toEqual([]);
  });

  it("returns nothing for garbage instead of throwing", () => {
    expect(parse("not a calendar")).toEqual([]);
  });
});

describe("normalizeCalendarUrl", () => {
  it("turns webcal into https", () => {
    const result = normalizeCalendarUrl("webcal://p12-caldav.icloud.com/published/2/abcdef");
    expect(result).toEqual({
      ok: true,
      url: "https://p12-caldav.icloud.com/published/2/abcdef",
      provider: "icloud",
    });
  });

  it("rejects non-iCloud hosts, plain http, credentials and odd ports", () => {
    for (const bad of [
      "https://example.com/cal.ics",
      "https://icloud.com.evil.com/x",
      "https://evil-icloud.com/x",
      "http://p12-caldav.icloud.com/x",
      "https://user:pw@p12-caldav.icloud.com/x",
      "https://p12-caldav.icloud.com:8443/x",
      "https://127.0.0.1/x",
      "javascript:alert(1)",
      "",
      "banana",
    ]) {
      expect(normalizeCalendarUrl(bad).ok, bad).toBe(false);
    }
  });

  it("accepts a Google secret iCal address", () => {
    const link = "https://calendar.google.com/calendar/ical/me%40gmail.com/private-abc123def456/basic.ics";
    expect(normalizeCalendarUrl(link)).toEqual({ ok: true, url: link, provider: "google" });
  });

  it("rejects Google links that aren't the private iCal feed, and lookalike hosts", () => {
    for (const bad of [
      "https://calendar.google.com/calendar/u/0/r",
      "https://calendar.google.com.evil.com/calendar/ical/x/basic.ics",
      "https://www.google.com/calendar/ical/x/basic.ics",
      "https://evilcalendar.google.com/calendar/ical/x/basic.ics",
      "http://calendar.google.com/calendar/ical/x/basic.ics",
    ]) {
      expect(normalizeCalendarUrl(bad).ok, bad).toBe(false);
    }
  });

  it("only allows icloud.com and its subdomains", () => {
    expect(isAllowedCalendarHost("icloud.com")).toBe(true);
    expect(isAllowedCalendarHost("P12-CalDAV.iCloud.com")).toBe(true);
    expect(isAllowedCalendarHost("notificloud.com")).toBe(false);
  });

  it("hints on the token for Google links, not the basic.ics tail", () => {
    expect(calendarUrlHint("https://calendar.google.com/calendar/ical/me%40gmail.com/private-abc123def456/basic.ics")).toBe(
      "calendar.google.com …f456",
    );
  });

  it("builds a hint that doesn't reveal the whole link", () => {
    expect(calendarUrlHint("https://p12-caldav.icloud.com/published/2/ABCDEFGH1234")).toBe(
      "p12-caldav.icloud.com …1234",
    );
  });
});

describe("encryptSecret / decryptSecret", () => {
  beforeAll(() => {
    process.env.CALENDAR_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });

  it("round-trips and never stores the plaintext", () => {
    const secret = "https://p12-caldav.icloud.com/published/2/secret-token";
    const stored = encryptSecret(secret);
    expect(stored).not.toContain("secret-token");
    expect(decryptSecret(stored)).toBe(secret);
  });

  it("uses a fresh IV each time", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("fails on tampered data", () => {
    const stored = encryptSecret("hello");
    const parts = stored.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptSecret(parts.join("."))).toThrow();
  });
});

import { getEncryptedCalendarLinks, getUserSettings } from "@/db/userSettings";
import { decryptSecret, isEncryptionConfigured } from "./calendarCrypto";
import { CalendarFetchError, fetchCalendarIcs } from "./calendarFetch";
import { parseCalendarEvents, type CalendarEvent } from "./calendarParse";
import { isFeatureOn } from "./features";
import { zonedParts, zonedTimeToUtc } from "./timezone";

export type MergedCalendarEvent = CalendarEvent & {
  /** The label of the calendar link it came from (e.g. "Google", "iCloud"). */
  calendar: string;
};

export type CalendarResult =
  | {
      status: "ok";
      events: MergedCalendarEvent[];
      /** One message per link that couldn't be loaded; the others still show. */
      warnings: string[];
    }
  | { status: "off" | "no-link" | "unconfigured" | "error"; events: []; message: string };

export const MAX_CALENDAR_DAYS = 14;

/** Events from the start of the user's today through `days` days ahead, merged across all linked calendars. */
export async function getCalendarEvents(
  userId: string,
  opts: { days?: number; fresh?: boolean; ignoreFeatureSwitch?: boolean } = {},
): Promise<CalendarResult> {
  const settings = await getUserSettings(userId);
  if (!opts.ignoreFeatureSwitch && !isFeatureOn(settings.features, "calendar")) {
    return { status: "off", events: [], message: "Calendar is turned off in Settings." };
  }

  const links = await getEncryptedCalendarLinks(userId);
  if (links.length === 0) {
    return { status: "no-link", events: [], message: "No calendar link saved yet." };
  }
  if (!isEncryptionConfigured()) {
    return {
      status: "unconfigured",
      events: [],
      message: "Calendar needs one-time server setup before it can load.",
    };
  }

  const days = Math.max(1, Math.min(MAX_CALENDAR_DAYS, Math.floor(opts.days ?? 7)));
  const { year, month, day } = zonedParts(settings.timezone, new Date());
  const rangeStart = zonedTimeToUtc(settings.timezone, year, month, day);
  const rangeEnd = zonedTimeToUtc(settings.timezone, year, month, day + days);

  const loaded = await Promise.all(
    links.map(async (link): Promise<{ events: MergedCalendarEvent[] } | { warning: string }> => {
      let url: string;
      try {
        url = decryptSecret(link.urlEncrypted);
      } catch {
        return { warning: `Couldn't read the saved ${link.label} link. Remove it and paste it again.` };
      }
      try {
        const ics = await fetchCalendarIcs(url, opts.fresh);
        const events = parseCalendarEvents(
          ics,
          settings.timezone,
          settings.eveningStartMinutes,
          rangeStart,
          rangeEnd,
        );
        return { events: events.map((e) => ({ ...e, calendar: link.label })) };
      } catch (error) {
        const detail =
          error instanceof CalendarFetchError ? error.message : "Something went wrong loading it.";
        return { warning: `${link.label}: ${detail}` };
      }
    }),
  );

  const events = loaded.flatMap((r) => ("events" in r ? r.events : []));
  const warnings = loaded.flatMap((r) => ("warning" in r ? [r.warning] : []));

  // Every link failed: report it as an error instead of an empty calendar.
  if (warnings.length === loaded.length) {
    return { status: "error", events: [], message: warnings.join(" ") };
  }

  events.sort((a, b) => a.start.localeCompare(b.start));
  return { status: "ok", events, warnings };
}

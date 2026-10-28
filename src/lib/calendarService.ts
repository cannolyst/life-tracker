import { getEncryptedCalendarUrl, getUserSettings } from "@/db/userSettings";
import { decryptSecret, isEncryptionConfigured } from "./calendarCrypto";
import { CalendarFetchError, fetchCalendarIcs } from "./calendarFetch";
import { parseCalendarEvents, type CalendarEvent } from "./calendarParse";
import { isFeatureOn } from "./features";
import { zonedParts, zonedTimeToUtc } from "./timezone";

export type CalendarResult =
  | { status: "ok"; events: CalendarEvent[] }
  | { status: "off" | "no-link" | "unconfigured" | "error"; events: []; message: string };

export const MAX_CALENDAR_DAYS = 14;

/** Events from the start of the user's today through `days` days ahead. */
export async function getCalendarEvents(
  userId: string,
  opts: { days?: number; fresh?: boolean; ignoreFeatureSwitch?: boolean } = {},
): Promise<CalendarResult> {
  const settings = await getUserSettings(userId);
  if (!opts.ignoreFeatureSwitch && !isFeatureOn(settings.features, "calendar")) {
    return { status: "off", events: [], message: "Calendar is turned off in Settings." };
  }
  if (!settings.hasCalendarLink) {
    return { status: "no-link", events: [], message: "No calendar link saved yet." };
  }
  if (!isEncryptionConfigured()) {
    return {
      status: "unconfigured",
      events: [],
      message: "Calendar needs one-time server setup before it can load.",
    };
  }

  const stored = await getEncryptedCalendarUrl(userId);
  if (!stored) return { status: "no-link", events: [], message: "No calendar link saved yet." };

  let link: string;
  try {
    link = decryptSecret(stored);
  } catch {
    return {
      status: "error",
      events: [],
      message: "Couldn't read your saved calendar link. Paste it again in Settings.",
    };
  }

  const days = Math.max(1, Math.min(MAX_CALENDAR_DAYS, Math.floor(opts.days ?? 7)));
  const { year, month, day } = zonedParts(settings.timezone, new Date());
  const rangeStart = zonedTimeToUtc(settings.timezone, year, month, day);
  const rangeEnd = zonedTimeToUtc(settings.timezone, year, month, day + days);

  try {
    const ics = await fetchCalendarIcs(link, opts.fresh);
    return {
      status: "ok",
      events: parseCalendarEvents(
        ics,
        settings.timezone,
        settings.eveningStartMinutes,
        rangeStart,
        rangeEnd,
      ),
    };
  } catch (error) {
    const message =
      error instanceof CalendarFetchError ? error.message : "Something went wrong loading your calendar.";
    return { status: "error", events: [], message };
  }
}

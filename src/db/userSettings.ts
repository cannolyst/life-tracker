import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "./index";
import { calendarLinks, userSettings } from "./schema";
import type { CalendarProvider } from "@/lib/calendarUrl";
import {
  DEFAULT_NOTIFICATION_PREFS,
  DEFAULT_USER_SETTINGS,
  type NotificationPrefs,
  type UserSettings,
} from "@/lib/userSettingsDefaults";

// One lookup per request no matter how many callers ask (React cache), so
// threading the time zone through every query costs a single tiny read.
export const getUserSettings = cache(async (userId: string): Promise<UserSettings> => {
  const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  if (!row) return DEFAULT_USER_SETTINGS;
  return {
    timezone: row.timezone,
    launchStartMinutes: row.launchStartMinutes,
    workStartMinutes: row.workStartMinutes,
    workEndMinutes: row.workEndMinutes,
    eveningStartMinutes: row.eveningStartMinutes,
    shutdownStartMinutes: row.shutdownStartMinutes,
    briefCity: row.briefCity,
    displayName: row.displayName,
    notificationPrefs: {
      ...DEFAULT_NOTIFICATION_PREFS,
      ...(row.notificationPrefs as Partial<NotificationPrefs>),
      times: {
        ...DEFAULT_NOTIFICATION_PREFS.times,
        ...(row.notificationPrefs as Partial<NotificationPrefs>).times,
      },
    },
    features: (row.features ?? {}) as Record<string, boolean>,
    walkthroughSeen: row.walkthroughSeenAt !== null,
  };
});

export async function getUserTimezone(userId: string): Promise<string> {
  return (await getUserSettings(userId)).timezone;
}

export type CalendarLinkSummary = {
  id: string;
  provider: CalendarProvider;
  label: string;
  hint: string;
};

// What the Settings UI may see about a user's calendar links: never the
// encrypted (or plain) URL itself.
export async function getCalendarLinkSummaries(userId: string): Promise<CalendarLinkSummary[]> {
  const rows = await db
    .select({
      id: calendarLinks.id,
      provider: calendarLinks.provider,
      label: calendarLinks.label,
      hint: calendarLinks.hint,
    })
    .from(calendarLinks)
    .where(eq(calendarLinks.userId, userId))
    .orderBy(asc(calendarLinks.createdAt));
  return rows as CalendarLinkSummary[];
}

// Server-only: the encrypted links, for fetching feeds. Deliberately not part
// of UserSettings or any summary, so they can't reach browser props by accident.
export async function getEncryptedCalendarLinks(
  userId: string,
): Promise<{ id: string; label: string; urlEncrypted: string }[]> {
  return db
    .select({ id: calendarLinks.id, label: calendarLinks.label, urlEncrypted: calendarLinks.urlEncrypted })
    .from(calendarLinks)
    .where(eq(calendarLinks.userId, userId))
    .orderBy(asc(calendarLinks.createdAt));
}

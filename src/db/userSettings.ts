import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { userSettings } from "./schema";
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
    hasCalendarLink: row.calendarUrlEncrypted !== null,
    calendarUrlHint: row.calendarUrlHint,
    briefCity: row.briefCity,
    notificationPrefs: {
      ...DEFAULT_NOTIFICATION_PREFS,
      ...(row.notificationPrefs as Partial<NotificationPrefs>),
    },
    features: (row.features ?? {}) as Record<string, boolean>,
  };
});

export async function getUserTimezone(userId: string): Promise<string> {
  return (await getUserSettings(userId)).timezone;
}

// The encrypted calendar link is deliberately NOT part of UserSettings, so
// it can't leak into props that reach the browser by accident.
export async function getEncryptedCalendarUrl(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ value: userSettings.calendarUrlEncrypted })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return row?.value ?? null;
}

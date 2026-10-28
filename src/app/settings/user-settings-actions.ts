"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { requireUserId } from "@/lib/session";
import { isValidTimezone } from "@/lib/timezone";
import {
  DEFAULT_NOTIFICATION_PREFS,
  timeInputToMinutes,
  validateDayStructure,
  type NotificationPrefs,
} from "@/lib/userSettingsDefaults";
import { FEATURES } from "@/lib/features";
import { calendarUrlHint, normalizeCalendarUrl } from "@/lib/calendarUrl";
import { encryptSecret, isEncryptionConfigured } from "@/lib/calendarCrypto";
import { getCalendarEvents } from "@/lib/calendarService";
import { getUserSettings } from "@/db/userSettings";
import type { CalendarEvent } from "@/lib/calendarParse";

export type SettingsActionState = { error?: string; saved?: boolean };

type SettingsValues = Partial<typeof userSettings.$inferInsert>;

// user_settings rows are created lazily, the first time a user saves
// anything — until then everyone reads the defaults.
async function saveSettings(userId: string, values: SettingsValues) {
  await db
    .insert(userSettings)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: userSettings.userId, set: { ...values, updatedAt: new Date() } });
  revalidatePath("/settings");
  revalidatePath("/");
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function saveDaySettings(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const timezone = text(formData, "timezone");
  if (!isValidTimezone(timezone)) return { error: "Pick a time zone from the list." };

  const day = {
    launchStartMinutes: timeInputToMinutes(text(formData, "launchStart")),
    workStartMinutes: timeInputToMinutes(text(formData, "workStart")),
    workEndMinutes: timeInputToMinutes(text(formData, "workEnd")),
    eveningStartMinutes: timeInputToMinutes(text(formData, "eveningStart")),
    shutdownStartMinutes: timeInputToMinutes(text(formData, "shutdownStart")),
  };
  if (Object.values(day).some((v) => v === null)) return { error: "Fill in every time." };
  const parsed = day as Record<keyof typeof day, number>;
  const orderProblem = validateDayStructure(parsed);
  if (orderProblem) return { error: orderProblem };

  const userId = await requireUserId();
  await saveSettings(userId, { timezone, ...parsed });
  return { saved: true };
}

export async function saveCalendarLink(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const result = normalizeCalendarUrl(text(formData, "calendarUrl"));
  if (!result.ok) return { error: result.error };
  if (!isEncryptionConfigured()) {
    return { error: "Calendar needs a one-time server setup before links can be saved. Ask Cody." };
  }

  const userId = await requireUserId();
  await saveSettings(userId, {
    calendarUrlEncrypted: encryptSecret(result.url),
    calendarUrlHint: calendarUrlHint(result.url),
  });
  return { saved: true };
}

export async function removeCalendarLink(): Promise<void> {
  const userId = await requireUserId();
  await saveSettings(userId, { calendarUrlEncrypted: null, calendarUrlHint: null });
}

export type CalendarPreview =
  | { ok: true; events: CalendarEvent[]; timezone: string }
  | { ok: false; error: string };

// Always fetches fresh and works even while the Calendar feature switch is
// off, so a link can be checked before turning the feature on.
export async function previewCalendar(): Promise<CalendarPreview> {
  const userId = await requireUserId();
  const result = await getCalendarEvents(userId, { days: 7, fresh: true, ignoreFeatureSwitch: true });
  if (result.status !== "ok") return { ok: false, error: result.message };
  const { timezone } = await getUserSettings(userId);
  return { ok: true, events: result.events, timezone };
}

export async function saveBriefCity(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const city = text(formData, "briefCity").trim();
  if (!city) return { error: "Enter a city." };
  if (city.length > 80) return { error: "That city name is too long." };
  const userId = await requireUserId();
  await saveSettings(userId, { briefCity: city });
  return { saved: true };
}

export async function saveNotificationPrefs(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const prefs = Object.fromEntries(
    (Object.keys(DEFAULT_NOTIFICATION_PREFS) as (keyof NotificationPrefs)[]).map((key) => [
      key,
      formData.get(key) === "on",
    ]),
  ) as NotificationPrefs;
  const userId = await requireUserId();
  await saveSettings(userId, { notificationPrefs: prefs });
  return { saved: true };
}

export async function saveFeatures(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const features = Object.fromEntries(FEATURES.map((f) => [f.id, formData.get(f.id) === "on"]));
  const userId = await requireUserId();
  // Merge over what's stored so switches for features this form doesn't
  // know about (from later phases) are never wiped.
  const current = (await getUserSettings(userId)).features;
  await saveSettings(userId, { features: { ...current, ...features } });
  return { saved: true };
}

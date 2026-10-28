"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { calendarLinks, userSettings } from "@/db/schema";
import { requireUserId } from "@/lib/session";
import { isValidTimezone } from "@/lib/timezone";
import {
  DEFAULT_NOTIFICATION_PREFS,
  timeInputToMinutes,
  validateDayStructure,
  type NotificationPrefs,
} from "@/lib/userSettingsDefaults";
import { FEATURES } from "@/lib/features";
import { PROVIDER_LABEL, calendarUrlHint, normalizeCalendarUrl } from "@/lib/calendarUrl";
import { encryptSecret, isEncryptionConfigured } from "@/lib/calendarCrypto";
import { getCalendarEvents, type MergedCalendarEvent } from "@/lib/calendarService";
import { getUserSettings } from "@/db/userSettings";

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

const MAX_CALENDAR_LINKS = 5;

export async function addCalendarLink(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const result = normalizeCalendarUrl(text(formData, "calendarUrl"));
  if (!result.ok) return { error: result.error };
  if (!isEncryptionConfigured()) {
    return { error: "Calendar needs a one-time server setup before links can be saved. Ask Cody." };
  }
  const label = text(formData, "label").trim() || PROVIDER_LABEL[result.provider];
  if (label.length > 40) return { error: "That name is too long (40 characters at most)." };

  const userId = await requireUserId();
  const existing = await db
    .select({ id: calendarLinks.id })
    .from(calendarLinks)
    .where(eq(calendarLinks.userId, userId));
  if (existing.length >= MAX_CALENDAR_LINKS) {
    return { error: `You can link up to ${MAX_CALENDAR_LINKS} calendars. Remove one first.` };
  }

  await db.insert(calendarLinks).values({
    userId,
    provider: result.provider,
    label,
    urlEncrypted: encryptSecret(result.url),
    hint: calendarUrlHint(result.url),
  });
  revalidatePath("/settings");
  revalidatePath("/");
  return { saved: true };
}

export async function removeCalendarLink(linkId: string): Promise<void> {
  const userId = await requireUserId();
  await db
    .delete(calendarLinks)
    .where(and(eq(calendarLinks.id, linkId), eq(calendarLinks.userId, userId)));
  revalidatePath("/settings");
  revalidatePath("/");
}

export type CalendarPreview =
  | { ok: true; events: MergedCalendarEvent[]; warnings: string[]; timezone: string }
  | { ok: false; error: string };

// Always fetches fresh and works even while the Calendar feature switch is
// off, so a link can be checked before turning the feature on.
export async function previewCalendar(): Promise<CalendarPreview> {
  const userId = await requireUserId();
  const result = await getCalendarEvents(userId, { days: 7, fresh: true, ignoreFeatureSwitch: true });
  if (result.status !== "ok") return { ok: false, error: result.message };
  const { timezone } = await getUserSettings(userId);
  return { ok: true, events: result.events, warnings: result.warnings, timezone };
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

import { DEFAULT_TIMEZONE } from "./timezone";

export type NotificationPrefs = {
  lunchCard: boolean;
  shutdownNudge: boolean;
  sundayReset: boolean;
  urgentFlags: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  lunchCard: true,
  shutdownNudge: true,
  sundayReset: true,
  urgentFlags: true,
};

export type DayStructure = {
  launchStartMinutes: number;
  workStartMinutes: number;
  workEndMinutes: number;
  eveningStartMinutes: number;
  shutdownStartMinutes: number;
};

export const DEFAULT_DAY_STRUCTURE: DayStructure = {
  launchStartMinutes: 5 * 60,
  workStartMinutes: 8 * 60,
  workEndMinutes: 16 * 60,
  eveningStartMinutes: 17 * 60,
  shutdownStartMinutes: 20 * 60,
};

export type UserSettings = DayStructure & {
  timezone: string;
  briefCity: string;
  displayName: string | null;
  notificationPrefs: NotificationPrefs;
  features: Record<string, boolean>;
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  ...DEFAULT_DAY_STRUCTURE,
  timezone: DEFAULT_TIMEZONE,
  briefCity: "Chicago",
  displayName: null,
  notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
  features: {},
};

// "08:00" <-> minutes after midnight, for <input type="time">.
export function minutesToTimeInput(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeInputToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

// Returns an error message if the five boundaries aren't in a sensible
// order (launch < work start < work end <= evening < shutdown), else null.
export function validateDayStructure(d: DayStructure): string | null {
  if (!(d.launchStartMinutes < d.workStartMinutes)) return "Launch has to start before work does.";
  if (!(d.workStartMinutes < d.workEndMinutes)) return "Work has to end after it starts.";
  if (!(d.workEndMinutes <= d.eveningStartMinutes)) return "Evening can't start before work ends.";
  if (!(d.eveningStartMinutes < d.shutdownStartMinutes)) return "Shutdown has to start after evening does.";
  return null;
}

import { getUserSettings } from "./userSettings";
import { getDayAgenda } from "./dashboard";
import { getDayFlag, getDayLog, getPlanTasks } from "./planning";
import { getResetState } from "./reset";
import { getLifeAdmin } from "./lifeAdmin";
import { claimNotification, releaseNotification, sendToUser, subscribedUserIds } from "./notifications";
import { getCalendarEvents } from "@/lib/calendarService";
import { buildFlags, eventOnDay } from "@/lib/dashboard";
import { isFeatureOn } from "@/lib/features";
import {
  flagsMessage,
  kindsDue,
  lunchMessage,
  shutdownMessage,
  silencedByOutTonight,
  sundayMessage,
  type PushMessage,
} from "@/lib/notifications";
import { MANUAL_CHARGE_FLAG_DAYS } from "@/lib/lifeAdmin";
import { pickLunchTask } from "@/lib/planning";
import { resetWeekKey } from "@/lib/reset";
import { dateKeyIn, minutesIntoDayIn } from "@/lib/timezone";
import type { NotificationKind } from "@/lib/userSettingsDefaults";

async function isOutTonight(userId: string, tz: string, todayKey: string, calendarOn: boolean): Promise<boolean> {
  const stored = await getDayFlag(userId, todayKey);
  if (stored) return stored.outTonight;
  if (!calendarOn) return false;
  const calendar = await getCalendarEvents(userId, { days: 1 }).catch(() => null);
  if (!calendar || calendar.status !== "ok") return false;
  return calendar.events.some((e) => !e.allDay && e.isEvening && eventOnDay(e, todayKey, tz));
}

// Only the sharp edges: bills and subscriptions due soon, and free trials about to convert.
async function urgentFlags(userId: string, tz: string, todayKey: string) {
  const [agenda, life] = await Promise.all([
    getDayAgenda(userId, tz, { points: false, cleaning: false, exercise: false, finance: true }),
    getLifeAdmin(userId, tz, todayKey),
  ]);
  return buildFlags({
    streak: 0,
    habitDoneToday: true,
    minutes: 0,
    structure: { launchStartMinutes: 0, workStartMinutes: 0, workEndMinutes: 0, eveningStartMinutes: 0, shutdownStartMinutes: 0 },
    bills: [
      ...agenda.billsUnpaidDaysUntil,
      ...life.subscriptions
        .filter((s) => !s.status.isTrial && !s.autopay && s.status.daysUntil >= 0 && s.status.daysUntil <= MANUAL_CHARGE_FLAG_DAYS)
        .map((s) => ({ name: s.name, daysUntil: s.status.daysUntil, href: "/life" })),
    ],
    trials: life.subscriptions
      .filter((s) => s.status.isTrial)
      .map((s) => ({ name: s.name, daysUntil: s.status.daysUntil, amount: s.amount })),
  });
}

async function messageFor(
  userId: string,
  kind: NotificationKind,
  tz: string,
  todayKey: string,
): Promise<PushMessage | null> {
  switch (kind) {
    case "lunch": {
      const task = pickLunchTask((await getPlanTasks(userId)).filter((t) => t.status === "open"));
      return task ? lunchMessage(task.title) : null;
    }
    case "shutdown":
      // Already logged the day: nothing to nudge about.
      return (await getDayLog(userId, todayKey)) ? null : shutdownMessage();
    case "sunday":
      return (await getResetState(userId, resetWeekKey(todayKey))).completed ? null : sundayMessage();
    case "flags": {
      const flags = await urgentFlags(userId, tz, todayKey);
      return flags.length > 0 ? flagsMessage(flags) : null;
    }
  }
}

export type RunSummary = { users: number; sent: { userId: string; kind: NotificationKind }[] };

// One pass over everyone with a subscribed device. Safe to run often: each
// kind is claimed per user per local day before it is sent.
export async function runNotifications(now: Date = new Date()): Promise<RunSummary> {
  const userIds = await subscribedUserIds();
  const sent: RunSummary["sent"] = [];

  for (const userId of userIds) {
    try {
      const settings = await getUserSettings(userId);
      const tz = settings.timezone;
      const todayKey = dateKeyIn(tz, now);
      const weekday = new Date(`${todayKey}T00:00:00Z`).getUTCDay();
      const due = kindsDue({
        nowMinutes: minutesIntoDayIn(tz, now),
        weekday,
        prefs: settings.notificationPrefs,
      });
      if (due.length === 0) continue;

      const needsOutCheck = due.some((k) => silencedByOutTonight(k, settings.notificationPrefs, settings.eveningStartMinutes));
      const out = needsOutCheck ? await isOutTonight(userId, tz, todayKey, isFeatureOn(settings.features, "calendar")) : false;

      for (const kind of due) {
        if (out && silencedByOutTonight(kind, settings.notificationPrefs, settings.eveningStartMinutes)) continue;
        const message = await messageFor(userId, kind, tz, todayKey);
        if (!message) continue;
        if (!(await claimNotification(userId, kind, todayKey))) continue;
        const delivered = await sendToUser(userId, message);
        if (delivered === 0) await releaseNotification(userId, kind, todayKey);
        else sent.push({ userId, kind });
      }
    } catch (error) {
      console.warn("[notify] skipping user", userId, error);
    }
  }
  return { users: userIds.length, sent };
}

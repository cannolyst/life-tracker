import type { NotificationKind, NotificationPrefs } from "./userSettingsDefaults";

// The cron job wakes every 15 minutes. A notification is sent once its time
// has passed, within this window — so one late or missed run still delivers it,
// but nothing arrives hours late. A per-day log stops repeats.
export const SEND_WINDOW_MINUTES = 45;

// A day's budget: lunch, shutdown, the Sunday reminder and urgent flags, at most.
export const KIND_ORDER: NotificationKind[] = ["flags", "sunday", "lunch", "shutdown"];

const TOGGLE: Record<NotificationKind, keyof Omit<NotificationPrefs, "times">> = {
  lunch: "lunchCard",
  shutdown: "shutdownNudge",
  sunday: "sundayReset",
  flags: "urgentFlags",
};

export const KIND_LABEL: Record<NotificationKind, string> = {
  lunch: "Lunch check-in",
  shutdown: "Shutdown nudge",
  sunday: "Sunday reset",
  flags: "Urgent flags",
};

// Lunch is a workday thing; the Sunday reminder is Sunday only.
export function runsToday(kind: NotificationKind, weekday: number): boolean {
  if (kind === "sunday") return weekday === 0;
  if (kind === "lunch") return weekday >= 1 && weekday <= 5;
  return true;
}

export function isInWindow(nowMinutes: number, targetMinutes: number): boolean {
  const late = nowMinutes - targetMinutes;
  return late >= 0 && late < SEND_WINDOW_MINUTES;
}

// Which kinds could go out right now for someone with these preferences.
export function kindsDue(opts: { nowMinutes: number; weekday: number; prefs: NotificationPrefs }): NotificationKind[] {
  return KIND_ORDER.filter(
    (kind) =>
      opts.prefs[TOGGLE[kind]] &&
      runsToday(kind, opts.weekday) &&
      isInWindow(opts.nowMinutes, opts.prefs.times[kind]),
  );
}

// "Out tonight" quiets whatever is scheduled for the evening or later.
export function silencedByOutTonight(kind: NotificationKind, prefs: NotificationPrefs, eveningStartMinutes: number): boolean {
  return prefs.times[kind] >= eveningStartMinutes;
}

export type PushMessage = { title: string; body: string; url: string; tag: string };

export function lunchMessage(taskTitle: string): PushMessage {
  return {
    title: "A small one for lunch?",
    body: taskTitle,
    url: "/",
    tag: "lunch",
  };
}

export function shutdownMessage(): PushMessage {
  return {
    title: "Shutdown time",
    body: "A line about today, then pick tomorrow. It only takes a few minutes.",
    url: "/",
    tag: "shutdown",
  };
}

export function sundayMessage(): PushMessage {
  return {
    title: "Sunday reset",
    body: "About ten minutes to look back, look ahead and clear the decks.",
    url: "/reset",
    tag: "sunday",
  };
}

// Flags are already written as calm sentences; the first leads, the rest are a count.
export function flagsMessage(flags: { text: string; href: string }[]): PushMessage {
  const [first, ...rest] = flags;
  return {
    title: flags.length === 1 ? "Worth a look" : `${flags.length} things worth a look`,
    body: rest.length > 0 ? `${first.text} (+${rest.length} more)` : first.text,
    url: flags.length === 1 ? first.href : "/",
    tag: "flags",
  };
}

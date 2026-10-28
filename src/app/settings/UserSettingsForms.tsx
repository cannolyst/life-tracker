"use client";

import { useActionState, useState, useTransition } from "react";
import { buttonClass, inputClass, labelClass } from "@/components/ui";
import { FEATURES } from "@/lib/features";
import {
  minutesToTimeInput,
  type DayStructure,
  type NotificationPrefs,
} from "@/lib/userSettingsDefaults";
import { timezoneLabel } from "@/lib/timezoneOptions";
import type { CalendarEvent } from "@/lib/calendarParse";
import { PROVIDER_LABEL } from "@/lib/calendarUrl";
import type { CalendarLinkSummary } from "@/db/userSettings";
import {
  previewCalendar,
  removeCalendarLink,
  saveBriefCity,
  addCalendarLink,
  saveDaySettings,
  saveFeatures,
  saveNotificationPrefs,
  type CalendarPreview,
  type SettingsActionState,
} from "./user-settings-actions";

const initial: SettingsActionState = {};

function Status({ state }: { state: SettingsActionState }) {
  if (state.error) return <p className="text-sm text-red-400">{state.error}</p>;
  if (state.saved) return <p className="text-sm text-emerald-400">Saved.</p>;
  return null;
}

function SubmitButton({ pending, children = "Save" }: { pending: boolean; children?: string }) {
  return (
    <button type="submit" disabled={pending} className={buttonClass}>
      {pending ? "Saving..." : children}
    </button>
  );
}

function TimeField({ label, name, minutes }: { label: string; name: string; minutes: number }) {
  return (
    <label className="block space-y-1">
      <span className={labelClass}>{label}</span>
      <input type="time" name={name} defaultValue={minutesToTimeInput(minutes)} required className={inputClass} />
    </label>
  );
}

export function DayForm({
  day,
  timezone,
  zones,
}: {
  day: DayStructure;
  timezone: string;
  zones: { common: string[]; other: string[] };
}) {
  const [state, action, pending] = useActionState(saveDaySettings, initial);
  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-neutral-400">
        These times shape your day. Nothing here changes how the app looks yet — the new Today view
        will use them.
      </p>
      <label className="block space-y-1">
        <span className={labelClass}>Time zone</span>
        <select name="timezone" defaultValue={timezone} className={inputClass}>
          <optgroup label="Common">
            {zones.common.map((z) => (
              <option key={z} value={z}>
                {timezoneLabel(z)}
              </option>
            ))}
          </optgroup>
          <optgroup label="All time zones">
            {zones.other.map((z) => (
              <option key={z} value={z}>
                {timezoneLabel(z)}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <TimeField label="Launch starts" name="launchStart" minutes={day.launchStartMinutes} />
        <TimeField label="Work starts" name="workStart" minutes={day.workStartMinutes} />
        <TimeField label="Work ends" name="workEnd" minutes={day.workEndMinutes} />
        <TimeField label="Evening starts" name="eveningStart" minutes={day.eveningStartMinutes} />
        <TimeField label="Shutdown starts" name="shutdownStart" minutes={day.shutdownStartMinutes} />
      </div>
      <Status state={state} />
      <SubmitButton pending={pending} />
    </form>
  );
}

function formatEventTime(event: CalendarEvent, timezone: string): string {
  const day = new Date(event.start).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timezone,
  });
  if (event.allDay) return `${day} · all day`;
  const time = new Date(event.start).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });
  return `${day} · ${time}`;
}

export function CalendarCard({
  links,
  encryptionReady,
}: {
  links: CalendarLinkSummary[];
  encryptionReady: boolean;
}) {
  const [state, action, pending] = useActionState(addCalendarLink, initial);
  const [previewState, setPreview] = useState<{ key: string; value: CalendarPreview } | null>(null);
  const linksKey = links.map((l) => l.id).join(",");
  // A preview only counts while the set of links is the one it was loaded for.
  const preview = previewState?.key === linksKey ? previewState.value : null;
  const [busy, startTransition] = useTransition();

  function runPreview() {
    startTransition(async () => setPreview({ key: linksKey, value: await previewCalendar() }));
  }

  function remove(link: CalendarLinkSummary) {
    if (!confirm(`Remove the “${link.label}” calendar link?`)) return;
    startTransition(async () => {
      await removeCalendarLink(link.id);
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-400">
        Link the calendars you use — iCloud, Google, or both — and they’ll be shown together. Links are
        stored encrypted and only used to read your events; nothing is ever written to your calendars.
      </p>

      {!encryptionReady && (
        <p className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-400">
          Calendar needs a one-time server setup before links can be saved.
        </p>
      )}

      {links.length > 0 && (
        <ul className="space-y-2">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex items-center justify-between gap-3 rounded-md border border-neutral-800 px-3 py-2 text-sm"
            >
              <span className="min-w-0">
                <span className="block truncate text-neutral-200">{link.label}</span>
                <span className="block truncate text-xs text-neutral-500">
                  {PROVIDER_LABEL[link.provider]} · {link.hint}
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove(link)}
                disabled={busy}
                className="shrink-0 rounded-md border border-neutral-700 px-3 py-1.5 text-neutral-300 disabled:opacity-60"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="space-y-3">
        <p className={labelClass}>{links.length > 0 ? "Add another calendar" : "Add a calendar"}</p>
        <label className="block space-y-1">
          <span className={labelClass}>Link (iCloud or Google)</span>
          <input
            name="calendarUrl"
            type="url"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            required
            placeholder="webcal://… or https://calendar.google.com/calendar/ical/…"
            className={inputClass}
          />
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>Name (optional)</span>
          <input name="label" maxLength={40} placeholder="Gmail, Work, Family…" className={inputClass} />
        </label>
        <Status state={state} />
        <SubmitButton pending={pending}>Add calendar</SubmitButton>
      </form>

      {links.length > 0 && (
        <div className="space-y-3">
          <button type="button" onClick={runPreview} disabled={busy} className={buttonClass}>
            {busy ? "Loading..." : "Preview next 7 days"}
          </button>

          {preview && !preview.ok && <p className="text-sm text-red-400">{preview.error}</p>}
          {preview?.ok && (
            <>
              {preview.warnings.map((warning) => (
                <p key={warning} className="text-sm text-red-400">
                  {warning}
                </p>
              ))}
              {preview.events.length === 0 ? (
                <p className="text-sm text-neutral-500">Nothing on your calendars for the next 7 days.</p>
              ) : (
                <ul className="space-y-1.5">
                  {preview.events.map((event, i) => (
                    <li key={i} className="flex flex-col text-sm sm:flex-row sm:gap-3">
                      <span className="shrink-0 text-neutral-500 sm:w-44">
                        {formatEventTime(event, preview.timezone)}
                      </span>
                      <span className="text-neutral-200">
                        {event.title}
                        {links.length > 1 && (
                          <span className="ml-2 text-xs text-neutral-500">{event.calendar}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      <details className="text-sm text-neutral-400">
        <summary className="cursor-pointer py-1 text-neutral-300">How to get an iCloud link</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>On iCloud.com, open Calendar.</li>
          <li>Tap the share icon next to the calendar you want.</li>
          <li>Turn on “Public Calendar”, then copy the link.</li>
          <li>Paste it above.</li>
        </ol>
      </details>

      <details className="text-sm text-neutral-400">
        <summary className="cursor-pointer py-1 text-neutral-300">How to get a Google link</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            Open calendar.google.com in a browser. On a phone, choose “Desktop site” — the Google
            Calendar app doesn’t have this setting.
          </li>
          <li>Next to the calendar you want, open its menu and choose Settings and sharing.</li>
          <li>Scroll to “Integrate calendar” and copy the “Secret address in iCal format”.</li>
          <li>Paste it above. Do this once for each Google calendar you want shown.</li>
        </ol>
      </details>

      <p className="text-sm text-neutral-500">
        Anyone with one of these links can see that calendar, so don’t share them. If one leaks, reset it in
        iCloud or Google and paste the new one here.
      </p>
    </div>
  );
}

export function BriefCityForm({ city }: { city: string }) {
  const [state, action, pending] = useActionState(saveBriefCity, initial);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-neutral-400">The city your daily brief will use for weather.</p>
      <label className="block space-y-1">
        <span className={labelClass}>City</span>
        <input name="briefCity" defaultValue={city} maxLength={80} required className={inputClass} />
      </label>
      <Status state={state} />
      <SubmitButton pending={pending} />
    </form>
  );
}

const NOTIFICATION_LABELS: Record<keyof NotificationPrefs, string> = {
  lunchCard: "Lunch check-in",
  shutdownNudge: "Shutdown nudge",
  sundayReset: "Sunday reset",
  urgentFlags: "Urgent flags",
};

export function NotificationsForm({ prefs }: { prefs: NotificationPrefs }) {
  const [state, action, pending] = useActionState(saveNotificationPrefs, initial);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-neutral-400">
        Choose what you’d like to hear about. Notifications themselves arrive in a later update — your
        choices are saved now so they’re ready.
      </p>
      <div className="space-y-2">
        {(Object.keys(NOTIFICATION_LABELS) as (keyof NotificationPrefs)[]).map((key) => (
          <label
            key={key}
            className="flex min-h-11 items-center gap-3 rounded-md border border-neutral-800 px-3 text-sm"
          >
            <input
              type="checkbox"
              name={key}
              defaultChecked={prefs[key]}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-800"
            />
            {NOTIFICATION_LABELS[key]}
          </label>
        ))}
      </div>
      <Status state={state} />
      <SubmitButton pending={pending} />
    </form>
  );
}

export function FeaturesForm({ features }: { features: Record<string, boolean> }) {
  const [state, action, pending] = useActionState(saveFeatures, initial);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-neutral-400">
        New things are off until you turn them on. Your existing tabs and data aren’t affected.
      </p>
      <div className="space-y-2">
        {FEATURES.map((feature) => (
          <label
            key={feature.id}
            className="flex min-h-11 items-start gap-3 rounded-md border border-neutral-800 px-3 py-3 text-sm"
          >
            <input
              type="checkbox"
              name={feature.id}
              defaultChecked={features[feature.id] === true}
              className="mt-0.5 h-4 w-4 rounded border-neutral-700 bg-neutral-800"
            />
            <span>
              <span className="block text-neutral-200">{feature.label}</span>
              <span className="block text-neutral-500">{feature.description}</span>
            </span>
          </label>
        ))}
      </div>
      <Status state={state} />
      <SubmitButton pending={pending} />
    </form>
  );
}

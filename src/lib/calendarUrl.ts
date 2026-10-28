// Calendar links are user-supplied and the server fetches them, so they are
// locked down to what an iCloud public link or a Google "secret address in
// iCal format" actually looks like: https on the default port, a known
// host, no embedded credentials.

export type CalendarProvider = "icloud" | "google";

export const PROVIDER_LABEL: Record<CalendarProvider, string> = {
  icloud: "iCloud",
  google: "Google",
};

export type CalendarUrlResult =
  | { ok: true; url: string; provider: CalendarProvider }
  | { ok: false; error: string };

export function isAllowedCalendarHost(hostname: string): boolean {
  return providerForHost(hostname) !== null;
}

export function providerForHost(hostname: string): CalendarProvider | null {
  const host = hostname.toLowerCase();
  if (host === "icloud.com" || host.endsWith(".icloud.com")) return "icloud";
  if (host === "calendar.google.com") return "google";
  return null;
}

export function checkCalendarUrl(url: URL): string | null {
  if (url.protocol !== "https:") return "The calendar link has to be an https (or webcal) link.";
  if (url.username || url.password) return "That link has a username or password in it, which isn't allowed.";
  if (url.port && url.port !== "443") return "That doesn't look like an iCloud or Google calendar link.";
  if (!isAllowedCalendarHost(url.hostname)) {
    return "Only iCloud (icloud.com) and Google (calendar.google.com) calendar links are supported.";
  }
  return null;
}

// Accepts what iCloud's "Public Calendar" share gives you (webcal://…), the
// https:// form of the same address, or Google's secret iCal address.
export function normalizeCalendarUrl(input: string): CalendarUrlResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Paste your calendar link first." };
  if (trimmed.length > 2000) return { ok: false, error: "That link is too long to be a calendar link." };

  const withScheme = trimmed.replace(/^webcals?:\/\//i, "https://");
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, error: "That doesn't look like a link." };
  }
  const problem = checkCalendarUrl(url);
  if (problem) return { ok: false, error: problem };

  const provider = providerForHost(url.hostname)!;
  if (provider === "google" && !/^\/calendar\/ical\//.test(url.pathname)) {
    return {
      ok: false,
      error:
        "That's a Google Calendar link, but not the private iCal one. Use “Secret address in iCal format” from the calendar's settings.",
    };
  }
  return { ok: true, url: url.toString(), provider };
}

// A short, non-secret reminder of which link is saved: the host plus the
// last few characters of the path.
export function calendarUrlHint(url: string): string {
  const parsed = new URL(url);
  // Google links end in /basic.ics, which says nothing — hint on the token before it.
  const path = parsed.pathname.replace(/\/basic\.ics$/, "").replace(/\/+$/, "");
  return `${parsed.hostname} …${path.slice(-4)}`;
}

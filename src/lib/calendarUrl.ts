// The calendar link is user-supplied and the server fetches it, so it is
// locked down to what an iCloud public calendar link actually looks like:
// https on the default port, an *.icloud.com host, no embedded credentials.

export type CalendarUrlResult = { ok: true; url: string } | { ok: false; error: string };

export function isAllowedCalendarHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "icloud.com" || host.endsWith(".icloud.com");
}

export function checkCalendarUrl(url: URL): string | null {
  if (url.protocol !== "https:") return "The calendar link has to be an https (or webcal) link.";
  if (url.username || url.password) return "That link has a username or password in it, which isn't allowed.";
  if (url.port && url.port !== "443") return "That doesn't look like an iCloud calendar link.";
  if (!isAllowedCalendarHost(url.hostname)) {
    return "Only iCloud calendar links are supported (the address should end in icloud.com).";
  }
  return null;
}

// Accepts what iCloud's "Public Calendar" share gives you (webcal://…) as
// well as the https:// form of the same address.
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
  return { ok: true, url: url.toString() };
}

// A short, non-secret reminder of which link is saved: the host plus the
// last few characters of the path.
export function calendarUrlHint(url: string): string {
  const parsed = new URL(url);
  const path = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.hostname} …${path.slice(-4)}`;
}

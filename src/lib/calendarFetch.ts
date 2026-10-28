import { createHash } from "node:crypto";
import { checkCalendarUrl } from "./calendarUrl";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const CACHE_TTL_MS = 10 * 60 * 1000;

// Per-instance memory cache keyed by a hash of the link (the link itself is
// a secret and never used as a key or logged). iCloud feeds change rarely,
// so ten minutes keeps page loads fast without hammering Apple.
const cache = new Map<string, { at: number; body: string }>();

export class CalendarFetchError extends Error {}

async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new CalendarFetchError("That calendar is too large to load.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Fetches the .ics feed for an iCloud link. Redirects are followed by hand so
 * every hop is re-checked against the iCloud-only rule (iCloud answers
 * webcal links with a redirect to a numbered pXX-caldav host).
 */
export async function fetchCalendarIcs(link: string, fresh = false): Promise<string> {
  const key = createHash("sha256").update(link).digest("hex");
  const hit = cache.get(key);
  if (!fresh && hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.body;

  let current = new URL(link);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const problem = checkCalendarUrl(current);
    if (problem) throw new CalendarFetchError(problem);

    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { accept: "text/calendar, text/plain;q=0.9, */*;q=0.1" },
      });
    } catch {
      throw new CalendarFetchError("Couldn't reach iCloud just now. Try again in a minute.");
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new CalendarFetchError("iCloud sent an unexpected response.");
      try {
        current = new URL(location, current);
      } catch {
        throw new CalendarFetchError("iCloud sent an unexpected response.");
      }
      continue;
    }
    if (response.status === 404 || response.status === 410) {
      throw new CalendarFetchError("iCloud says that calendar link doesn't exist anymore. Make a fresh public link and paste it again.");
    }
    if (!response.ok) throw new CalendarFetchError("iCloud wouldn't give us the calendar right now.");

    const body = await readCapped(response);
    if (!body.includes("BEGIN:VCALENDAR")) {
      throw new CalendarFetchError("That link didn't return a calendar.");
    }
    cache.set(key, { at: Date.now(), body });
    if (cache.size > 200) cache.delete(cache.keys().next().value as string);
    return body;
  }
  throw new CalendarFetchError("iCloud redirected too many times.");
}

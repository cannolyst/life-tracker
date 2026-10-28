// US zones first (this is a two-person app, both in the US), then the rest of
// the IANA list the runtime knows about.
const COMMON = [
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

export function listTimezones(): { common: string[]; other: string[] } {
  const all =
    typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : COMMON;
  const commonSet = new Set(COMMON);
  return { common: COMMON, other: all.filter((z) => !commonSet.has(z)) };
}

export function timezoneLabel(zone: string): string {
  return zone.replace(/_/g, " ");
}

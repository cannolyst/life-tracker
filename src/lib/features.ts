// Every optional feature of the hub. All default to OFF for every user —
// existing users keep exactly the app they have today until they switch a
// feature on in Settings. Add new entries here as later phases ship.
export const FEATURES = [
  {
    id: "dashboard",
    label: "Home dashboard",
    description: "Replace Overview with a calm day-at-a-glance home: greeting, a daily spark, what to do now, your day, and what’s coming up. The classic Overview stays at /overview.",
  },
  {
    id: "calendar",
    label: "Calendar",
    description: "Show your iCloud and Google calendar events alongside your day.",
  },
] as const;

export type FeatureId = (typeof FEATURES)[number]["id"];

export function isFeatureId(value: string): value is FeatureId {
  return FEATURES.some((f) => f.id === value);
}

export function isFeatureOn(features: Record<string, boolean>, id: FeatureId): boolean {
  return features[id] === true;
}

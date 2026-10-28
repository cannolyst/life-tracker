// Every optional feature of the hub. All default to OFF for every user —
// existing users keep exactly the app they have today until they switch a
// feature on in Settings. Add new entries here as later phases ship.
export const FEATURES = [
  {
    id: "calendar",
    label: "Calendar",
    description: "Show your iCloud calendar events alongside your day.",
  },
] as const;

export type FeatureId = (typeof FEATURES)[number]["id"];

export function isFeatureId(value: string): value is FeatureId {
  return FEATURES.some((f) => f.id === value);
}

export function isFeatureOn(features: Record<string, boolean>, id: FeatureId): boolean {
  return features[id] === true;
}

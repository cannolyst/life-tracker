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

// Parts of the home dashboard. They only matter once the dashboard is on, and
// are on with it until a user switches one off here.
export const DASHBOARD_PARTS = [
  { id: "spark", label: "Daily spark", description: "A quote, word, question or idea each morning, with a place to save the ones you like." },
  { id: "evening", label: "Evening tone", description: "After your Shutdown time the app turns a little darker and warmer." },
  { id: "reset", label: "Sunday reset", description: "A ten-minute look back and ahead on Sundays, and the monthly review." },
  { id: "lifeAdmin", label: "Life admin", description: "Recurring chores, subscriptions and free trials, birthdays, and the people you want to see." },
  { id: "goals", label: "Goals", description: "Up to three goals with a why, a deadline and a next step." },
  { id: "journal", label: "Photo journal", description: "A short entry with a photo as the last step of Shutdown." },
] as const;

export type PartId = (typeof DASHBOARD_PARTS)[number]["id"];

export function isPartId(value: string): value is PartId {
  return DASHBOARD_PARTS.some((p) => p.id === value);
}

/** A dashboard part is on when the dashboard is on and the user hasn't switched the part off. */
export function isPartOn(features: Record<string, boolean>, id: PartId): boolean {
  return features.dashboard === true && features[id] !== false;
}

export type FeatureId = (typeof FEATURES)[number]["id"];

export function isFeatureId(value: string): value is FeatureId {
  return FEATURES.some((f) => f.id === value);
}

export function isFeatureOn(features: Record<string, boolean>, id: FeatureId): boolean {
  return features[id] === true;
}

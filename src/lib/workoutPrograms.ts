export type ProgramPreset = {
  id: "ab-split" | "body-part-split" | "custom";
  label: string;
  description: string;
  starterDays: string[];
};

// A preset only determines the starter set of days at creation time — it
// isn't stored or tracked afterward. A program is just a name plus
// whatever days it currently has.
export const PROGRAM_PRESETS: ProgramPreset[] = [
  {
    id: "ab-split",
    label: "A/B days",
    description: "Alternate between two workouts.",
    starterDays: ["Day A", "Day B"],
  },
  {
    id: "body-part-split",
    label: "By part of body",
    description: "One day per muscle group.",
    starterDays: ["Chest", "Back", "Legs", "Arms", "Shoulders & Core"],
  },
  {
    id: "custom",
    label: "Custom",
    description: "Start empty and add your own days.",
    starterDays: [],
  },
];

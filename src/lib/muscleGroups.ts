export const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
  "Core",
  "Glutes",
  "Quads",
  "Hamstrings",
  "Calves",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

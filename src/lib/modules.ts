export type ModuleKey =
  | "points"
  | "cleaning"
  | "exercise"
  | "finance"
  | "lists"
  | "todo"
  | "yearReview"
  | "emotionCheckin";

export const MODULES: { key: ModuleKey; href: string; label: string }[] = [
  { key: "points", href: "/points", label: "Points" },
  { key: "cleaning", href: "/cleaning", label: "Cleaning" },
  { key: "exercise", href: "/exercise", label: "Exercise" },
  { key: "finance", href: "/finance", label: "Finance" },
  { key: "lists", href: "/lists", label: "Lists" },
  { key: "todo", href: "/todo", label: "To-do" },
  { key: "yearReview", href: "/year-review", label: "Year in review" },
  { key: "emotionCheckin", href: "/emotion-checkin", label: "Emotion Check-In" },
];

import { cookies } from "next/headers";
import { requireUserId } from "@/lib/session";
import { getModuleSettings } from "@/db/queries";
import { MODULES } from "@/lib/modules";
import { NavClient } from "./NavClient";

const SETTINGS_FIELD = {
  points: "showPoints",
  cleaning: "showCleaning",
  exercise: "showExercise",
  finance: "showFinance",
  lists: "showLists",
  todo: "showTodo",
  yearReview: "showYearReview",
  emotionCheckin: "showEmotionCheckin",
} as const;

export async function Nav() {
  const userId = await requireUserId();
  const settings = await getModuleSettings(userId);
  const links = MODULES.filter((m) => settings[SETTINGS_FIELD[m.key]]);
  const theme = (await cookies()).get("theme")?.value === "dark" ? "dark" : "light";

  return <NavClient links={links} theme={theme} />;
}

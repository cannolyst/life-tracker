import { cookies } from "next/headers";
import { requireUserId } from "@/lib/session";
import { getModuleSettings } from "@/db/queries";
import { getUserSettings } from "@/db/userSettings";
import { MODULES } from "@/lib/modules";
import { isFeatureOn } from "@/lib/features";
import { isEveningTone } from "@/lib/dayBlocks";
import { minutesIntoDayIn } from "@/lib/timezone";
import { NavClient } from "./NavClient";
import { EveningVeil } from "./EveningVeil";

const SETTINGS_FIELD = {
  points: "showPoints",
  cleaning: "showCleaning",
  exercise: "showExercise",
  finance: "showFinance",
  lists: "showLists",
  yearReview: "showYearReview",
  emotionCheckin: "showEmotionCheckin",
  news: "showNews",
} as const;

export async function Nav() {
  const userId = await requireUserId();
  const [settings, userSettings] = await Promise.all([getModuleSettings(userId), getUserSettings(userId)]);
  const tabs = MODULES.filter((m) => settings[SETTINGS_FIELD[m.key]]);
  const theme = (await cookies()).get("theme")?.value === "dark" ? "dark" : "light";

  // The darker, warmer evening tone belongs to the new dashboard — users who
  // haven't switched it on see no change.
  const eveningTone = isFeatureOn(userSettings.features, "dashboard");
  // Planning (tomorrow, buckets, Someday) comes with the dashboard too.
  const links = eveningTone ? [{ href: "/plan", label: "Plan" }, { href: "/life", label: "Life admin" }, ...tabs] : tabs;

  return (
    <>
      <NavClient links={links} theme={theme} />
      {eveningTone && (
        <EveningVeil
          initialOn={isEveningTone(userSettings, minutesIntoDayIn(userSettings.timezone, new Date()))}
          tz={userSettings.timezone}
          shutdownStartMinutes={userSettings.shutdownStartMinutes}
          launchStartMinutes={userSettings.launchStartMinutes}
        />
      )}
    </>
  );
}

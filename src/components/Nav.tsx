import { cookies } from "next/headers";
import { requireUserId } from "@/lib/session";
import { getModuleSettings } from "@/db/queries";
import { getUserSettings } from "@/db/userSettings";
import { MODULES } from "@/lib/modules";
import { isFeatureOn, isPartOn } from "@/lib/features";
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
  const dashboardOn = isFeatureOn(userSettings.features, "dashboard");
  const eveningTone = isPartOn(userSettings.features, "evening");
  // Planning (tomorrow, buckets, Someday) comes with the dashboard too.
  const links = dashboardOn
    ? [
        { href: "/plan", label: "Plan" },
        ...(isPartOn(userSettings.features, "lifeAdmin") ? [{ href: "/life", label: "Life admin" }] : []),
        ...(isPartOn(userSettings.features, "goals") ? [{ href: "/goals", label: "Goals" }] : []),
        ...(isPartOn(userSettings.features, "journal") ? [{ href: "/journal", label: "Journal" }] : []),
        ...tabs,
      ]
    : tabs;

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

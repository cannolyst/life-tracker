import { requireUserId } from "@/lib/session";
import { getUserSettings } from "@/db/userSettings";
import { isFeatureOn } from "@/lib/features";
import { OverviewView } from "./OverviewView";
import { Dashboard } from "./dashboard/Dashboard";

export const dynamic = "force-dynamic";

// New features are opt-in: until a user switches the dashboard on in Settings
// they get the same Overview they always had.
export default async function HomePage() {
  const userId = await requireUserId();
  const settings = await getUserSettings(userId);
  if (isFeatureOn(settings.features, "dashboard")) return <Dashboard userId={userId} />;
  return <OverviewView />;
}

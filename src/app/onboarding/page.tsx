import { getModuleSettings } from "@/db/queries";
import { requireUserId } from "@/lib/session";
import { Sparkle } from "@/components/Sparkle";
import { JEWELS } from "@/lib/jewels";
import { ModulePicker } from "../settings/ModulePicker";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const userId = await requireUserId();
  const settings = await getModuleSettings(userId);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <h1 className="flex items-center gap-1.5 text-lg font-semibold text-neutral-100">
          <Sparkle className="h-4 w-4" color={JEWELS[0].color} />
          Life Tracker
        </h1>
        <p className="text-sm text-neutral-400">
          What would you like to see at the top of the page? You can change this anytime in
          Settings.
        </p>
        <ModulePicker initialValues={settings} redirectTo="/" submitLabel="Continue" />
      </div>
    </div>
  );
}

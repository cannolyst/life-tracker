import { cookies } from "next/headers";
import { getModuleSettings } from "@/db/queries";
import { requireUserId } from "@/lib/session";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ModulePicker } from "./ModulePicker";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const settings = await getModuleSettings(userId);
  const theme = (await cookies()).get("theme")?.value === "dark" ? "dark" : "light";

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold">Settings</h1>
        <Card>
          <h2 className="mb-3 font-medium">Appearance</h2>
          <ThemeToggle theme={theme} />
        </Card>
        <Card>
          <h2 className="mb-3 font-medium">Tabs you want to see</h2>
          <ModulePicker initialValues={settings} redirectTo="/settings" submitLabel="Save" />
        </Card>
      </main>
    </div>
  );
}

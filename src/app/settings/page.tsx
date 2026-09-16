import { cookies } from "next/headers";
import { getModuleSettings } from "@/db/queries";
import { requireUserId } from "@/lib/session";
import { Nav } from "@/components/Nav";
import { Card, labelClass } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BackgroundColorPicker } from "@/components/BackgroundColorPicker";
import { BACKGROUND_COLORS, type BackgroundColor } from "@/lib/backgroundColors";
import { ModulePicker } from "./ModulePicker";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const settings = await getModuleSettings(userId);
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value === "dark" ? "dark" : "light";
  const colorCookie = cookieStore.get("color")?.value;
  const color: BackgroundColor = (BACKGROUND_COLORS as readonly string[]).includes(
    colorCookie ?? "",
  )
    ? (colorCookie as BackgroundColor)
    : "pink";

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold">Settings</h1>
        <Card>
          <h2 className="mb-3 font-medium">Appearance</h2>
          <div className="space-y-4">
            <ThemeToggle theme={theme} />
            <div className="space-y-1">
              <p className={labelClass}>Background color</p>
              <BackgroundColorPicker color={color} />
              <p className="text-xs text-neutral-500">
                Dark mode always uses the same dark theme, regardless of this choice.
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 font-medium">Tabs you want to see</h2>
          <ModulePicker initialValues={settings} redirectTo="/settings" submitLabel="Save" />
        </Card>
      </main>
    </div>
  );
}

import { PushSetup } from "./PushSetup";
import { cookies } from "next/headers";
import { getModuleSettings } from "@/db/queries";
import { getBriefTokenCreatedAt } from "@/db/brief";
import { dateOnlyIn } from "@/lib/timezone";
import { getCalendarLinkSummaries, getUserSettings } from "@/db/userSettings";
import { isEncryptionConfigured } from "@/lib/calendarCrypto";
import { listTimezones } from "@/lib/timezoneOptions";
import { requireUserId } from "@/lib/session";
import { Nav } from "@/components/Nav";
import { Board, W } from "@/components/Board";
import { Card, labelClass, formatDate } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BackgroundColorPicker } from "@/components/BackgroundColorPicker";
import { BACKGROUND_COLORS, type BackgroundColor } from "@/lib/backgroundColors";
import { ModulePicker } from "./ModulePicker";
import { BriefLinkCard } from "./BriefLinkCard";
import {
  BriefCityForm,
  DisplayNameForm,
  CalendarCard,
  DayForm,
  FeaturesForm,
  NotificationsForm,
} from "./UserSettingsForms";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const [settings, briefCreatedAt, userSettings, calendarLinks] = await Promise.all([
    getModuleSettings(userId),
    getBriefTokenCreatedAt(userId),
    getUserSettings(userId),
    getCalendarLinkSummaries(userId),
  ]);
  const tz = userSettings.timezone;
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
      <main className="board-page mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold">Settings</h1>
        <Board pageId="settings" columnCount={3} saved={userSettings.layouts.settings}>
        <W id="appearance" label="Appearance" col={0}>
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
        </W>
        <W id="tabs-you-want-to-see" label="Tabs you want to see" col={0}>
        <Card>
          <h2 className="mb-3 font-medium">Tabs you want to see</h2>
          <ModulePicker initialValues={settings} redirectTo="/settings" submitLabel="Save" />
        </Card>
        </W>
        <W id="your-name" label="Your name" col={0}>
        <Card>
          <h2 className="mb-3 font-medium">Your name</h2>
          <DisplayNameForm name={userSettings.displayName} />
        </Card>
        </W>
        <W id="your-day" label="Your day" col={0}>
        <Card>
          <h2 className="mb-3 font-medium">Your day</h2>
          <DayForm day={userSettings} timezone={tz} zones={listTimezones()} />
        </Card>
        </W>
        <W id="calendar" label="Calendar" col={1}>
        <Card>
          <h2 className="mb-3 font-medium">Calendar</h2>
          <CalendarCard
            links={calendarLinks}
            encryptionReady={isEncryptionConfigured()}
          />
        </Card>
        </W>
        <W id="daily-brief-link" label="Daily brief link" col={1}>
        <Card>
          <h2 className="mb-3 font-medium">Daily brief link</h2>
          <BriefLinkCard
            createdLabel={briefCreatedAt ? formatDate(dateOnlyIn(tz, briefCreatedAt)) : null}
          />
        </Card>
        </W>
        <W id="daily-brief-city" label="Daily brief city" col={1}>
        <Card>
          <h2 className="mb-3 font-medium">Daily brief city</h2>
          <BriefCityForm city={userSettings.briefCity} />
        </Card>
        </W>
        <W id="notifications" label="Notifications" col={2}>
        <Card>
          <h2 className="mb-3 font-medium">Notifications</h2>
          <div className="space-y-4">
            <PushSetup />
            <NotificationsForm prefs={userSettings.notificationPrefs} />
          </div>
        </Card>
        </W>
        <W id="new-features" label="New features" col={2}>
        <Card>
          <h2 className="mb-3 font-medium">New features</h2>
          <FeaturesForm features={userSettings.features} />
        </Card>
        </W>
        </Board>
      </main>
    </div>
  );
}

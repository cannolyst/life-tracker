import Link from "next/link";
import { requireUserId } from "@/lib/session";
import { getUserSettings } from "@/db/userSettings";
import { getLifeAdmin } from "@/db/lifeAdmin";
import { isPartOn } from "@/lib/features";
import { dateKeyIn } from "@/lib/timezone";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui";
import { PeopleSection, RecurringSection, SubscriptionsSection } from "./LifeClient";

export const dynamic = "force-dynamic";

export default async function LifePage() {
  const userId = await requireUserId();
  const settings = await getUserSettings(userId);
  const todayKey = dateKeyIn(settings.timezone);

  if (!isPartOn(settings.features, "lifeAdmin")) {
    return (
      <div className="flex min-h-full flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
          <h1 className="text-xl font-semibold">Life admin</h1>
          <Card>
            <p className="text-sm text-neutral-400">
              Life admin is switched off.{" "}
              <Link href="/settings" className="underline">
                Turn it on in Settings
              </Link>
              .
            </p>
          </Card>
        </main>
      </div>
    );
  }

  const admin = await getLifeAdmin(userId, settings.timezone, todayKey);

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Life admin</h1>
          <p className="text-sm text-neutral-500">
            The things that come around on their own: recurring chores, subscriptions, and the people who matter.
          </p>
        </div>

        <Card>
          <h2 className="mb-1 font-medium">Recurring</h2>
          <p className="mb-3 text-sm text-neutral-500">
            Shows in Coming up two weeks ahead, then becomes an evening card. Done resets the clock.
          </p>
          <RecurringSection items={admin.recurring} todayKey={todayKey} />
        </Card>

        <Card>
          <h2 className="mb-1 font-medium">Subscriptions &amp; trials</h2>
          <p className="mb-3 text-sm text-neutral-500">
            Manual ones are flagged three days before they charge; free trials two days before they convert.
          </p>
          <SubscriptionsSection items={admin.subscriptions} />
        </Card>

        <Card>
          <h2 className="mb-1 font-medium">People</h2>
          <p className="mb-3 text-sm text-neutral-500">
            Birthdays show in Coming up a week ahead. “See them every X weeks” resets itself when a calendar event
            mentions their name.
          </p>
          <PeopleSection people={admin.people} />
        </Card>
      </main>
    </div>
  );
}

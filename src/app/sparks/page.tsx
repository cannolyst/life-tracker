import Link from "next/link";
import { requireUserId } from "@/lib/session";
import { getSavedSparks } from "@/db/sparks";
import { getUserSettings } from "@/db/userSettings";
import { isFeatureOn } from "@/lib/features";
import { SPARK_TYPE_LABEL } from "@/lib/sparks";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui";
import { RemoveSparkButton } from "./RemoveSparkButton";

export const dynamic = "force-dynamic";

export default async function SparksPage() {
  const userId = await requireUserId();
  const [settings, saved] = await Promise.all([getUserSettings(userId), getSavedSparks(userId)]);
  const enabled = isFeatureOn(settings.features, "dashboard");

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold">Saved sparks</h1>

        {!enabled && (
          <Card>
            <p className="text-sm text-neutral-400">
              Daily sparks are part of the home dashboard, which is switched off.{" "}
              <Link href="/settings" className="underline">
                Turn it on in Settings
              </Link>
              .
            </p>
          </Card>
        )}

        {saved.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Nothing saved yet. Tap Save on a spark you want to keep, and it will live here.
          </p>
        ) : (
          <ul className="space-y-3">
            {saved.map(({ spark }) => (
              <li key={spark.id} className="rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-4">
                <p className="text-xs text-neutral-500">{SPARK_TYPE_LABEL[spark.type]}</p>
                <p className="mt-1 text-base leading-relaxed text-neutral-200">
                  {spark.type === "quote" ? `“${spark.text}”` : spark.text}
                </p>
                {spark.detail && (
                  <p className="mt-1 text-sm text-neutral-500">
                    {spark.type === "quote" ? `— ${spark.detail}` : spark.detail}
                  </p>
                )}
                <RemoveSparkButton sparkId={spark.id} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

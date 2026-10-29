import Link from "next/link";
import { requireUserId } from "@/lib/session";
import { getSavedSparks } from "@/db/sparks";
import { getUserSettings } from "@/db/userSettings";
import { isPartOn } from "@/lib/features";
import { SPARK_TYPE_LABEL } from "@/lib/sparks";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui";
import { Board, W } from "@/components/Board";
import { RemoveSparkButton } from "./RemoveSparkButton";

export const dynamic = "force-dynamic";

export default async function SparksPage() {
  const userId = await requireUserId();
  const [settings, saved] = await Promise.all([getUserSettings(userId), getSavedSparks(userId)]);
  const enabled = isPartOn(settings.features, "spark");

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="board-page mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold">Saved sparks</h1>

        {!enabled && (
          <Card>
            <p className="text-sm text-neutral-400">
              Daily sparks are switched off.{" "}
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
          <Board pageId="sparks" columnCount={3} saved={settings.layouts.sparks}>
            {saved.map(({ spark }) => (
              <W key={spark.id} id={`spark-${spark.id}`} label={SPARK_TYPE_LABEL[spark.type]}>
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-4">
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
              </div>
              </W>
            ))}
          </Board>
        )}
      </main>
    </div>
  );
}

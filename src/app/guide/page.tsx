import { Nav } from "@/components/Nav";
import { requireUserId } from "@/lib/session";
import { getUserSettings } from "@/db/userSettings";
import { isFeatureOn } from "@/lib/features";
import { replayWalkthroughAction } from "../dashboard/walkthrough-actions";
import { Card } from "@/components/ui";
import { Board, W } from "@/components/Board";
import { GUIDE_SECTIONS, WHATS_NEW } from "@/lib/guideContent";

export default async function GuidePage() {
  const settings = await getUserSettings(await requireUserId());
  const dashboardOn = isFeatureOn(settings.features, "dashboard");
  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="board-page mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold">Guide</h1>

        {dashboardOn && (
          <form action={replayWalkthroughAction}>
            <button type="submit" className="tap text-sm text-neutral-400 underline">
              Replay the welcome tour
            </button>
          </form>
        )}

        <Board pageId="guide" columnCount={2} saved={settings.layouts.guide}>
        <W id="whats-new" label="What’s new" col={0}>
        <Card>
          <h2 className="mb-3 font-medium">What’s new</h2>
          <ul className="space-y-4">
            {WHATS_NEW.map((entry) => (
              <li key={entry.date + entry.title} className="space-y-1">
                <p className="text-xs text-neutral-500">
                  {new Date(`${entry.date}T00:00:00Z`).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </p>
                <p className="text-sm font-medium text-neutral-200">{entry.title}</p>
                <p className="text-sm text-neutral-400">{entry.body}</p>
              </li>
            ))}
          </ul>
        </Card>
        </W>

        <W id="sections" label="Page guides" col={1}>
        <div className="space-y-3">
          {GUIDE_SECTIONS.map((section) => (
            <details
              key={section.id}
              id={section.id}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-2"
            >
              <summary className="cursor-pointer font-medium">{section.title}</summary>
              <div className="space-y-2 pb-3 pt-1 text-sm text-neutral-400">
                <p className="text-neutral-300">{section.summary}</p>
                <ul className="list-disc space-y-1 pl-5">
                  {section.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            </details>
          ))}
        </div>
        </W>
        </Board>
      </main>
    </div>
  );
}

import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui";
import { GUIDE_SECTIONS, WHATS_NEW } from "@/lib/guideContent";

export default function GuidePage() {
  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold">Guide</h1>

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
      </main>
    </div>
  );
}

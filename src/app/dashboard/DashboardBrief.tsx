"use client";

import { useState } from "react";
import { allBriefStories } from "@/lib/brief";
import { SECTIONS, type Brief, type Section } from "@/lib/newsTypes";
import { JEWELS } from "@/lib/jewels";
import { buttonClass } from "@/components/ui";
import { markStorySeen, playBrief } from "../news/actions";
import { useSpeechQueue } from "../news/useSpeechQueue";
import { PlayerBar } from "../news/PlayerBar";

const SECTION_COLOR: Record<Section, string> = {
  national: JEWELS[1].color,
  chicago: JEWELS[3].color,
  tech: JEWELS[2].color,
};

// Before work the brief is open; afterwards it folds down to one line the
// reader can tap to open again. `<details>` does the folding, so it works
// without waiting for any script.
export function DashboardBrief({
  brief,
  dateLabel,
  playedCount,
  defaultOpen,
  sectionLabels,
}: {
  brief: Brief;
  dateLabel: string;
  playedCount: number;
  defaultOpen: boolean;
  sectionLabels: Record<Section, string>;
}) {
  const speech = useSpeechQueue();
  const [starting, setStarting] = useState(false);
  const [playedHere, setPlayedHere] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stories = allBriefStories(brief);
  const played = playedCount > 0 || playedHere;
  const count = played && playedCount > 0 ? playedCount : stories.length;

  async function play() {
    setStarting(true);
    setError(null);
    try {
      // The server marks these stories heard as it returns the script.
      const { parts } = await playBrief(stories.map((s) => ({ id: s.id, earlier: s.earlier })));
      setPlayedHere(true);
      speech.play(parts.map((text) => ({ text, label: "Daily brief" })));
    } catch {
      setError("Couldn’t start the brief. Try again.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <section aria-label="Daily brief" className="rounded-lg border border-neutral-800 bg-neutral-900">
      <details open={defaultOpen} className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3">
          <span className="text-sm font-medium text-neutral-200">
            Today’s Brief · {count} {count === 1 ? "story" : "stories"}
            {played ? " · played ✓" : ""}
          </span>
          <span className="text-xs text-neutral-500 group-open:hidden">Show</span>
          <span className="hidden text-xs text-neutral-500 group-open:inline">Hide</span>
        </summary>

        <div className="space-y-4 px-5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-neutral-500">{dateLabel}</p>
            {speech.supported && stories.length > 0 && (
              <button type="button" onClick={play} disabled={starting} className={buttonClass}>
                {starting ? "Starting..." : "Play brief"}
              </button>
            )}
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}

          {SECTIONS.map((section) => {
            const items = brief[section];
            return (
              <div key={section}>
                <h3 className="flex items-center gap-2 text-xs font-medium text-neutral-500">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SECTION_COLOR[section] }} />
                  {sectionLabels[section]}
                </h3>
                {items.length === 0 ? (
                  <p className="mt-1 text-sm text-neutral-500">Nothing here right now.</p>
                ) : (
                  <ul className="mt-1 divide-y divide-neutral-800">
                    {items.map((story) => (
                      <li key={story.id}>
                        <a
                          href={story.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() =>
                            void markStorySeen({ storyId: story.id, title: story.title, section: story.section }).catch(() => {})
                          }
                          className="block py-2.5 text-sm"
                        >
                          <span className={`block ${story.earlier ? "text-neutral-500" : "text-neutral-200"}`}>
                            {story.title}
                          </span>
                          {story.summary && (
                            <span className="mt-0.5 line-clamp-2 block text-xs text-neutral-500">{story.summary}</span>
                          )}
                          <span className="mt-0.5 block text-xs text-neutral-600">
                            {story.source}
                            {story.earlier ? " · earlier" : ""}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </details>

      {speech.status !== "idle" && speech.current && (
        <PlayerBar
          status={speech.status === "paused" ? "paused" : "playing"}
          label={speech.current.label}
          onPause={speech.pause}
          onResume={speech.resume}
          onSkip={speech.skip}
          onStop={speech.stop}
        />
      )}
    </section>
  );
}

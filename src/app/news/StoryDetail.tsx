"use client";

import { useEffect } from "react";
import { buttonClass } from "@/components/ui";
import { SECTION_LABEL, type Story } from "@/lib/newsTypes";
import { timeAgo } from "@/lib/timeAgo";

export function StoryDetail({
  story,
  color,
  canPlay,
  onPlay,
  onClose,
}: {
  story: Story;
  color: string;
  canPlay: boolean;
  onPlay: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-detail-title"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-lg border border-neutral-800 bg-neutral-900 p-5 sm:rounded-lg"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {SECTION_LABEL[story.section]} · {story.source}
            {story.publishedAt && (
              <>
                {" "}
                · <time dateTime={story.publishedAt} suppressHydrationWarning>{timeAgo(story.publishedAt)}</time>
              </>
            )}
          </p>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="Close"
            className="text-neutral-500 hover:text-neutral-100"
          >
            ✕
          </button>
        </div>

        {/* A real <h2> would pick up the app's global all-caps display style (an unlayered rule that beats Tailwind utilities), which makes a full headline hard to read — so this is a heading by role only. */}
        <p
          id="story-detail-title"
          role="heading"
          aria-level={2}
          className="text-xl font-semibold leading-snug"
        >
          {story.title}
        </p>

        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
          {story.summary || "The source didn’t include a summary for this story."}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a href={story.url} target="_blank" rel="noopener noreferrer" className={`${buttonClass} inline-block`}>
            Read full story ↗
          </a>
          {canPlay && (
            <button
              type="button"
              onClick={onPlay}
              className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:border-neutral-500 hover:text-neutral-100"
            >
              ▶ Play
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

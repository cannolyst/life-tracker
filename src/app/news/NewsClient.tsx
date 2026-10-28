"use client";

import { useCallback, useRef, useState } from "react";
import { Card, buttonClass } from "@/components/ui";
import { JEWELS } from "@/lib/jewels";
import { allBriefStories, cleanForSpeech } from "@/lib/brief";
import { timeAgo } from "@/lib/timeAgo";
import {
  SECTIONS,
  sectionLabels,
  type BriefPayload,
  type FeedStory,
  type Section,
  type Story,
} from "@/lib/newsTypes";
import { markStorySeen, playBrief } from "./actions";
import { useSpeechQueue, type SpeechEntry } from "./useSpeechQueue";
import { StoryDetail } from "./StoryDetail";
import { PlayerBar } from "./PlayerBar";

type Filter = "all" | Section;
type FeedPage = { stories: FeedStory[]; nextOffset: number | null };

const SECTION_COLOR: Record<Section, string> = {
  national: JEWELS[1].color,
  chicago: JEWELS[3].color,
  tech: JEWELS[2].color,
};

const outlineButton =
  "rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-500 hover:text-neutral-100 disabled:opacity-60";

async function fetchPage(section: Filter, offset: number, fresh: boolean): Promise<FeedPage> {
  const res = await fetch(`/api/feed?section=${section}&offset=${offset}${fresh ? "&fresh=1" : ""}`);
  if (!res.ok) throw new Error(`feed ${res.status}`);
  return res.json();
}

function Dot({ section }: { section: Section }) {
  return <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: SECTION_COLOR[section] }} />;
}

function TimeAgo({ iso }: { iso: string | null }) {
  // Computed from the current time on both server and client, so the text
  // can legitimately differ by a tick between the two renders.
  return (
    <time dateTime={iso ?? undefined} suppressHydrationWarning>
      {timeAgo(iso)}
    </time>
  );
}

function speakable(story: Story): string {
  const headline = story.title.replace(/[.!?]+$/, "");
  return cleanForSpeech(`${headline}. ${story.summary}`);
}

export function NewsClient({
  initialBrief,
  initialFeed,
  localLabel,
}: {
  localLabel: string;
  initialBrief: BriefPayload;
  initialFeed: FeedPage;
}) {
  const labels = sectionLabels(localLabel);
  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    ...SECTIONS.map((section) => ({ key: section, label: labels[section] })),
  ];
  const [briefData, setBriefData] = useState(initialBrief);
  const [stories, setStories] = useState<FeedStory[]>(initialFeed.stories);
  const [nextOffset, setNextOffset] = useState<number | null>(initialFeed.nextOffset);
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<null | "filter" | "more" | "refresh">(null);
  const [error, setError] = useState<string | null>(null);
  const [seenLocal, setSeenLocal] = useState<Set<string>>(() => new Set());
  const [detail, setDetail] = useState<Story | null>(null);
  const [briefStarting, setBriefStarting] = useState(false);
  const [mode, setMode] = useState<"story" | "queue" | "brief">("story");
  const speech = useSpeechQueue();
  // Responses can arrive out of order when filters are clicked quickly;
  // only the most recent request is allowed to update the list.
  const requestId = useRef(0);

  const isSeen = (story: Story | FeedStory) =>
    ("seen" in story && story.seen) || seenLocal.has(story.id);

  const markSeen = useCallback((story: Story) => {
    setSeenLocal((prev) => (prev.has(story.id) ? prev : new Set(prev).add(story.id)));
    void markStorySeen({ storyId: story.id, title: story.title, section: story.section }).catch(() => {});
  }, []);

  async function replaceFeed(section: Filter, fresh: boolean) {
    const id = ++requestId.current;
    setError(null);
    try {
      const page = await fetchPage(section, 0, fresh);
      if (id !== requestId.current) return;
      setStories(page.stories);
      setNextOffset(page.nextOffset);
    } catch {
      if (id === requestId.current) setError("Couldn’t load stories. Try again.");
    }
  }

  async function changeFilter(next: Filter) {
    if (next === filter) return;
    setFilter(next);
    setBusy("filter");
    await replaceFeed(next, false);
    setBusy(null);
  }

  async function loadMore() {
    if (nextOffset === null) return;
    const id = requestId.current;
    setBusy("more");
    try {
      const page = await fetchPage(filter, nextOffset, false);
      if (id !== requestId.current) return;
      setStories((prev) => {
        const have = new Set(prev.map((s) => s.id));
        return [...prev, ...page.stories.filter((s) => !have.has(s.id))];
      });
      setNextOffset(page.nextOffset);
    } catch {
      if (id === requestId.current) setError("Couldn’t load more stories. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function refresh() {
    setBusy("refresh");
    const briefRequest = fetch("/api/brief?fresh=1")
      .then((res) => (res.ok ? (res.json() as Promise<BriefPayload>) : null))
      .catch(() => null);
    await replaceFeed(filter, true);
    const nextBrief = await briefRequest;
    if (nextBrief) setBriefData(nextBrief);
    setBusy(null);
  }

  function playStory(story: Story) {
    setMode("story");
    speech.play([{ text: speakable(story), label: story.title, onStart: () => markSeen(story) }]);
  }

  function playAll() {
    if (stories.length === 0) return;
    setMode("queue");
    const entries: SpeechEntry[] = stories.map((story) => ({
      text: speakable(story),
      label: story.title,
      onStart: () => markSeen(story),
    }));
    speech.play(entries);
  }

  async function playBriefNow() {
    setBriefStarting(true);
    try {
      const selection = allBriefStories(briefData.brief).map((s) => ({ id: s.id, earlier: s.earlier }));
      // The server marks these stories seen as it hands back the script.
      const { parts } = await playBrief(selection);
      setSeenLocal((prev) => {
        const next = new Set(prev);
        for (const story of allBriefStories(briefData.brief)) next.add(story.id);
        return next;
      });
      setMode("brief");
      speech.play(parts.map((text) => ({ text, label: "Daily brief" })));
    } catch {
      setError("Couldn’t start the brief. Try again.");
    } finally {
      setBriefStarting(false);
    }
  }

  function openDetail(story: Story) {
    markSeen(story);
    setDetail(story);
  }

  const playing = speech.status !== "idle" && speech.current;

  return (
    <div className="space-y-8 pb-24">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-medium">Daily brief</h2>
            <p className="text-sm text-neutral-500">{briefData.dateLabel}</p>
          </div>
          {speech.supported && (
            <button type="button" onClick={playBriefNow} disabled={briefStarting} className={buttonClass}>
              {briefStarting ? "Starting..." : "Play brief"}
            </button>
          )}
        </div>

        <div className="mt-4 space-y-4">
          {SECTIONS.map((section) => {
            const items = briefData.brief[section];
            return (
              <div key={section}>
                <h3 className="flex items-center gap-2 text-xs font-medium text-neutral-500">
                  <Dot section={section} />
                  {labels[section]}
                </h3>
                {items.length === 0 ? (
                  <p className="mt-1 text-sm text-neutral-500">Nothing here right now.</p>
                ) : (
                  <ul className="mt-1 divide-y divide-neutral-800">
                    {items.map((story) => (
                      <li key={story.id}>
                        <button
                          type="button"
                          onClick={() => openDetail(story)}
                          className={`w-full py-2 text-left text-sm ${
                            story.earlier ? "text-neutral-500" : "text-neutral-300"
                          }`}
                        >
                          <span className="block">{story.title}</span>
                          <span className="block text-xs text-neutral-500">
                            {story.source}
                            {story.earlier ? " · earlier" : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map(({ key, label }) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => changeFilter(key)}
                  aria-pressed={active}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                    active
                      ? "border-neutral-100 bg-neutral-100 text-neutral-900"
                      : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-100"
                  }`}
                >
                  {key !== "all" && <Dot section={key} />}
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            {speech.supported && stories.length > 0 && (
              <button type="button" onClick={playAll} className={outlineButton}>
                ▶ Play all
              </button>
            )}
            <button type="button" onClick={refresh} disabled={busy !== null} className={outlineButton}>
              {busy === "refresh" ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {stories.length === 0 && busy !== "filter" ? (
          <Card>
            <p className="text-sm text-neutral-500">No stories right now. Try refreshing.</p>
          </Card>
        ) : (
          <ul className={`space-y-3 ${busy === "filter" ? "opacity-50" : ""}`}>
            {stories.map((story) => (
              <li
                key={story.id}
                className={`flex items-start gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4 ${
                  isSeen(story) ? "opacity-60" : ""
                }`}
              >
                <button type="button" onClick={() => openDetail(story)} className="min-w-0 flex-1 text-left">
                  <span className="flex items-center gap-2 text-xs text-neutral-500">
                    <Dot section={story.section} />
                    <span>
                      {story.source} · <TimeAgo iso={story.publishedAt} />
                    </span>
                  </span>
                  <span className="mt-1 block font-medium leading-snug">{story.title}</span>
                  {story.summary && (
                    <span className="mt-1 line-clamp-1 text-sm text-neutral-400">{story.summary}</span>
                  )}
                </button>
                {speech.supported && (
                  <button
                    type="button"
                    onClick={() => playStory(story)}
                    aria-label={`Play: ${story.title}`}
                    className="shrink-0 rounded-full border border-neutral-700 px-2.5 py-1 text-xs text-neutral-300 hover:border-neutral-500 hover:text-neutral-100"
                  >
                    ▶ Play
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {nextOffset !== null && (
          <button
            type="button"
            onClick={loadMore}
            disabled={busy !== null}
            className="w-full rounded-md border border-neutral-700 py-2 text-sm text-neutral-300 hover:border-neutral-500 hover:text-neutral-100 disabled:opacity-60"
          >
            {busy === "more" ? "Loading..." : "Load more"}
          </button>
        )}
      </section>

      {detail && (
        <StoryDetail
          story={detail}
          sectionLabel={labels[detail.section]}
          color={SECTION_COLOR[detail.section]}
          canPlay={speech.supported}
          onPlay={() => playStory(detail)}
          onClose={() => setDetail(null)}
        />
      )}

      {playing && speech.current && (
        <PlayerBar
          status={speech.status === "paused" ? "paused" : "playing"}
          label={speech.current.label}
          position={
            mode === "queue"
              ? { current: speech.current.position, total: speech.current.total }
              : undefined
          }
          onPause={speech.pause}
          onResume={speech.resume}
          onSkip={speech.skip}
          onStop={speech.stop}
        />
      )}
    </div>
  );
}

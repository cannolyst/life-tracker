"use server";

import { requireUserId } from "@/lib/session";
import { getUserTimezone } from "@/db/userSettings";
import { fetchAllStories } from "@/lib/news";
import { getSeenStoryIds, recordSeen } from "@/db/brief";
import { allBriefStories, briefToSpeechParts, buildBrief } from "@/lib/brief";
import type { Brief, BriefStory } from "@/lib/newsTypes";

// Called when a story is opened or played in the app — the only in-app
// events that count as "seen" (appearing in the feed never does).
export async function markStorySeen(input: { storyId: string; title: string; section: string }) {
  const userId = await requireUserId();
  await recordSeen(userId, [input]);
}

// "Play brief": marks the brief's stories seen and returns the speech split
// into natural pauses for the in-app player. The client sends the ids it is
// currently showing so what's spoken matches the card; text always comes
// from the server's own feed data, never from the client.
export async function playBrief(
  selection: { id: string; earlier: boolean }[],
): Promise<{ parts: string[] }> {
  const userId = await requireUserId();
  const stories = await fetchAllStories();
  const byId = new Map(stories.map((s) => [s.id, s]));

  const chosen: BriefStory[] = selection
    .slice(0, 30)
    .flatMap((sel) => {
      const story = byId.get(sel.id);
      return story ? [{ ...story, earlier: Boolean(sel.earlier) }] : [];
    });

  let brief: Brief;
  if (chosen.length > 0) {
    brief = { national: [], chicago: [], tech: [] };
    for (const story of chosen) brief[story.section].push(story);
  } else {
    brief = buildBrief(stories, await getSeenStoryIds(userId));
  }

  await recordSeen(
    userId,
    allBriefStories(brief).map((s) => ({ storyId: s.id, title: s.title, section: s.section })),
  );
  return { parts: briefToSpeechParts(brief, await getUserTimezone(userId)) };
}

import { requireUserId } from "@/lib/session";
import { Nav } from "@/components/Nav";
import { fetchAllStories } from "@/lib/news";
import { getSeenStoryIds } from "@/db/brief";
import { buildBrief, formatBriefDate } from "@/lib/brief";
import { paginate } from "@/lib/newsFeed";
import { NewsClient } from "./NewsClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function NewsPage() {
  const userId = await requireUserId();
  const [stories, seen] = await Promise.all([fetchAllStories(), getSeenStoryIds(userId)]);

  const brief = buildBrief(stories, seen);
  const { page, nextOffset } = paginate(stories, "all", 0, PAGE_SIZE);

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold">News</h1>
        <NewsClient
          initialBrief={{ dateLabel: formatBriefDate(), brief }}
          initialFeed={{
            stories: page.map((story) => ({ ...story, seen: seen.has(story.id) })),
            nextOffset,
          }}
        />
      </main>
    </div>
  );
}

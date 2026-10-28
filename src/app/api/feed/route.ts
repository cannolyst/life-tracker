import type { NextRequest } from "next/server";
import { fetchAllStories } from "@/lib/news";
import { resolveBriefUserId } from "@/lib/briefAuth";
import { getSeenStoryIds } from "@/db/brief";
import { getUserSettings } from "@/db/userSettings";
import { paginate } from "@/lib/newsFeed";
import { SECTIONS, type Section } from "@/lib/newsTypes";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const userId = await resolveBriefUserId(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const params = request.nextUrl.searchParams;
  const sectionParam = params.get("section") ?? "all";
  if (sectionParam !== "all" && !(SECTIONS as readonly string[]).includes(sectionParam)) {
    return Response.json({ error: "Unknown section" }, { status: 400, headers: NO_STORE });
  }
  const offset = Math.max(0, Number.parseInt(params.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(params.get("limit") ?? String(PAGE_SIZE), 10) || PAGE_SIZE),
  );

  const settings = await getUserSettings(userId);
  const [stories, seen] = await Promise.all([
    fetchAllStories({ fresh: params.get("fresh") === "1", city: settings.briefCity }),
    getSeenStoryIds(userId),
  ]);
  const { page, total, nextOffset } = paginate(stories, sectionParam as Section | "all", offset, limit);

  return Response.json(
    { stories: page.map((s) => ({ ...s, seen: seen.has(s.id) })), total, nextOffset },
    { headers: NO_STORE },
  );
}

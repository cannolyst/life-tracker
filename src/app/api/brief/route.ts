import type { NextRequest } from "next/server";
import { fetchAllStories } from "@/lib/news";
import { resolveBriefUserId } from "@/lib/briefAuth";
import { getUserSettings } from "@/db/userSettings";
import { getSeenStoryIds, recordSeen } from "@/db/brief";
import { allBriefStories, briefToSpeech, buildBrief, formatBriefDate } from "@/lib/brief";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const wantsSpeech = params.get("format") === "speech";

  const userId = await resolveBriefUserId(request);
  if (!userId) {
    // The Shortcut reads the body aloud, so make the failure audible.
    return wantsSpeech
      ? new Response("Your brief link is not valid. Generate a new one in Life Tracker settings.", {
          status: 401,
          headers: { "Content-Type": "text/plain; charset=utf-8", ...NO_STORE },
        })
      : Response.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const settings = await getUserSettings(userId);
  const [stories, seen] = await Promise.all([
    fetchAllStories({ fresh: params.get("fresh") === "1", city: settings.briefCity }),
    getSeenStoryIds(userId),
  ]);
  const brief = buildBrief(stories, seen);
  const now = new Date();
  const tz = settings.timezone;

  if (wantsSpeech) {
    // Serving the spoken brief is what marks these stories seen.
    await recordSeen(
      userId,
      allBriefStories(brief).map((s) => ({ storyId: s.id, title: s.title, section: s.section })),
    );
    return new Response(briefToSpeech(brief, tz, now, settings.briefCity.trim() || "Chicago"), {
      headers: { "Content-Type": "text/plain; charset=utf-8", ...NO_STORE },
    });
  }

  // The JSON form only previews the brief for the app's card; the app marks
  // stories seen when you actually play or open them.
  return Response.json({ dateLabel: formatBriefDate(tz, now), localLabel: settings.briefCity.trim() || "Chicago", brief }, { headers: NO_STORE });
}

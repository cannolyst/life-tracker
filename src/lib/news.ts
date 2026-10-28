import { dedupeAndSort, parseFeed } from "./newsFeed";
import type { Section, Story } from "./newsTypes";

type Feed = { name: string; section: Section; url: string };

// Every URL here was checked live. WBEZ and the Sun-Times serve Atom with a
// text/html content-type (the advertised /rss/index.xml), which parseFeed
// handles.
export const FEEDS: Feed[] = [
  { name: "NPR", section: "national", url: "https://feeds.npr.org/1001/rss.xml" },
  {
    name: "BBC",
    section: "national",
    url: "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml",
  },
  { name: "WBEZ", section: "chicago", url: "https://www.wbez.org/rss/index.xml" },
  { name: "Block Club Chicago", section: "chicago", url: "https://blockclubchicago.org/feed/" },
  { name: "Chicago Sun-Times", section: "chicago", url: "https://chicago.suntimes.com/rss/index.xml" },
  { name: "The Verge", section: "tech", url: "https://www.theverge.com/rss/index.xml" },
  { name: "Ars Technica", section: "tech", url: "https://feeds.arstechnica.com/arstechnica/index" },
  { name: "TechCrunch", section: "tech", url: "https://techcrunch.com/feed/" },
];

export const DEFAULT_LOCAL_CITY = "Chicago";

// Chicago keeps its hand-picked local outlets (the "chicago" section is the
// local one for everybody; its label is the user's city). Any other city gets a
// Google News search for that city, which covers local outlets everywhere.
export function usesChicagoFeeds(city: string | undefined): boolean {
  const normalized = (city ?? "").trim().toLowerCase();
  return normalized === "" || normalized === "chicago" || normalized === "chicago, il";
}

export function localFeedFor(city: string): Feed {
  const query = encodeURIComponent(city.trim().slice(0, 80));
  return {
    name: "Google News",
    section: "chicago",
    url: `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`,
  };
}

// Google News titles end with " - Outlet" and its description just repeats the
// headline and outlet, so split the outlet off and drop the useless summary.
export function cleanGoogleNewsStory(story: Story): Story {
  const match = /^(.*\S) - (.{2,60})$/.exec(story.title);
  return {
    ...story,
    title: match ? match[1] : story.title,
    source: match ? match[2].trim() : story.source,
    summary: "",
  };
}

const CACHE_SECONDS = 600; // raw feed responses are reused for at most 10 minutes
const FEED_TIMEOUT_MS = 8000;

async function fetchFeed(feed: Feed, fresh: boolean): Promise<Story[]> {
  const res = await fetch(feed.url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; LifeTrackerNews/1.0)",
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.8",
    },
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: CACHE_SECONDS } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const stories = parseFeed(await res.text(), feed);
  return feed.name === "Google News" ? stories.slice(0, 30).map(cleanGoogleNewsStory) : stories;
}

// All feeds in parallel; a feed that errors, times out, or returns garbage
// is skipped without affecting the rest. `fresh` bypasses the 10-minute
// cache (the app's Refresh button).
export async function fetchAllStories(options: { fresh?: boolean; city?: string } = {}): Promise<Story[]> {
  const feeds = usesChicagoFeeds(options.city)
    ? FEEDS
    : [...FEEDS.filter((f) => f.section !== "chicago"), localFeedFor(options.city!)];
  const results = await Promise.allSettled(feeds.map((feed) => fetchFeed(feed, options.fresh ?? false)));
  const stories: Story[] = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") stories.push(...result.value);
    else console.warn(`[news] skipping ${feeds[i].name}:`, result.reason?.message ?? result.reason);
  });
  return dedupeAndSort(stories);
}

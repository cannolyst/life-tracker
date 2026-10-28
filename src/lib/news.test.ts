import { describe, it, expect } from "vitest";
import { cleanGoogleNewsStory, localFeedFor, usesChicagoFeeds } from "./news";
import { briefToSpeechParts } from "./brief";
import { sectionLabels, type Brief, type Story } from "./newsTypes";

const story = (over: Partial<Story> = {}): Story => ({
  id: "s1",
  title: "City council passes budget - Austin American-Statesman",
  source: "Google News",
  section: "chicago",
  publishedAt: null,
  summary: "City council passes budget Austin American-Statesman",
  url: "https://news.google.com/rss/articles/abc",
  ...over,
});

describe("usesChicagoFeeds", () => {
  it("keeps Chicago (and blank) on the curated Chicago outlets", () => {
    for (const city of ["Chicago", " chicago ", "CHICAGO", "Chicago, IL", "", undefined]) {
      expect(usesChicagoFeeds(city), String(city)).toBe(true);
    }
  });

  it("sends every other city to the Google News search", () => {
    expect(usesChicagoFeeds("Austin")).toBe(false);
    expect(usesChicagoFeeds("Chicago Heights")).toBe(false);
  });
});

describe("localFeedFor", () => {
  it("builds an encoded Google News search for the city, in the local section", () => {
    const feed = localFeedFor(" Austin, Texas ");
    expect(feed.section).toBe("chicago");
    expect(feed.url.startsWith("https://news.google.com/rss/search?q=Austin%2C%20Texas&")).toBe(true);
  });

  it("can't be used to break out of the query string", () => {
    const feed = localFeedFor("x&ceid=evil#frag");
    expect(new URL(feed.url).searchParams.get("q")).toBe("x&ceid=evil#frag");
    expect(new URL(feed.url).searchParams.get("ceid")).toBe("US:en");
  });
});

describe("cleanGoogleNewsStory", () => {
  it("splits the outlet off the title and drops the duplicate summary", () => {
    const cleaned = cleanGoogleNewsStory(story());
    expect(cleaned.title).toBe("City council passes budget");
    expect(cleaned.source).toBe("Austin American-Statesman");
    expect(cleaned.summary).toBe("");
  });

  it("only splits on the last separator, so a dash inside the headline survives", () => {
    const cleaned = cleanGoogleNewsStory(story({ title: "Rain - then sun expected - KXAN Austin" }));
    expect(cleaned.title).toBe("Rain - then sun expected");
    expect(cleaned.source).toBe("KXAN Austin");
  });

  it("leaves a title with no outlet alone", () => {
    expect(cleanGoogleNewsStory(story({ title: "Plain headline" })).title).toBe("Plain headline");
  });
});

describe("the local section's label", () => {
  const brief: Brief = {
    national: [],
    chicago: [{ ...story({ title: "Local thing", summary: "" }), earlier: false }],
    tech: [],
  };

  it("is announced by the user's city in the spoken brief", () => {
    const parts = briefToSpeechParts(brief, "America/Chicago", new Date("2026-10-28T15:00:00Z"), "Austin");
    expect(parts).toContain("In Austin news,");
    expect(parts.join(" ")).not.toContain("Chicago news");
  });

  it("still says Chicago by default, so the existing alarm Shortcut is unchanged", () => {
    const parts = briefToSpeechParts(brief, "America/Chicago", new Date("2026-10-28T15:00:00Z"));
    expect(parts).toContain("In Chicago news,");
  });

  it("relabels the section for the UI", () => {
    expect(sectionLabels("Austin").chicago).toBe("Austin");
    expect(sectionLabels("Austin").national).toBe("National");
  });
});

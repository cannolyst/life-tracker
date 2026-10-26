import { describe, it, expect } from "vitest";
import { parseFeed, dedupeAndSort, normalizeTitle, stripHtml, paginate, storyIdForUrl } from "./newsFeed";
import type { Story } from "./newsTypes";

const RSS = `<?xml version="1.0"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Example</title>
    <item>
      <title><![CDATA[Senate passes budget &amp; tax bill]]></title>
      <link>https://example.com/a?utm_source=rss&amp;id=1</link>
      <pubDate>Fri, 23 Oct 2026 14:00:00 GMT</pubDate>
      <description><![CDATA[<p>Lawmakers voted <b>51-49</b> on Friday. More to come.</p>]]></description>
    </item>
    <item>
      <title>No date story</title>
      <link>https://example.com/b</link>
      <description>Plain summary &#8217;s here</description>
    </item>
    <item>
      <title></title>
      <link>https://example.com/empty-title</link>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Example</title>
  <entry>
    <published>2026-10-23T06:34:40.553-05:00</published>
    <updated>2026-10-23T06:34:40.553-05:00</updated>
    <title>Kennedy Expressway traffic is still a nightmare</title>
    <link rel="alternate" href="https://atom.example.com/story-1"/>
    <content type="html">&lt;img src="x.jpg"&gt;&lt;p&gt;Three years after the rehab, commutes are slow.&lt;/p&gt;</content>
  </entry>
</feed>`;

describe("parseFeed", () => {
  it("parses RSS items, strips html, canonicalizes urls, skips items without a title", () => {
    const stories = parseFeed(RSS, { name: "NPR", section: "national" });
    expect(stories).toHaveLength(2);
    expect(stories[0].title).toBe("Senate passes budget & tax bill");
    expect(stories[0].url).toBe("https://example.com/a?id=1");
    expect(stories[0].summary).toBe("Lawmakers voted 51-49 on Friday. More to come.");
    expect(stories[0].publishedAt).toBe("2026-10-23T14:00:00.000Z");
    expect(stories[0].source).toBe("NPR");
    expect(stories[0].section).toBe("national");
    expect(stories[1].publishedAt).toBeNull();
    expect(stories[1].summary).toBe("Plain summary ’s here");
  });

  it("parses Atom entries including escaped html content", () => {
    const stories = parseFeed(ATOM, { name: "WBEZ", section: "chicago" });
    expect(stories).toHaveLength(1);
    expect(stories[0].url).toBe("https://atom.example.com/story-1");
    expect(stories[0].summary).toBe("Three years after the rehab, commutes are slow.");
    expect(stories[0].publishedAt).toBe("2026-10-23T11:34:40.553Z");
  });

  it("returns nothing for non-feed content instead of throwing", () => {
    expect(parseFeed("<html><body>Not a feed</body></html>", { name: "X", section: "tech" })).toEqual([]);
  });
});

describe("stripHtml", () => {
  it("removes tags, scripts, entities and WordPress boilerplate", () => {
    expect(stripHtml("<p>Hi&nbsp;there &amp; <script>x()</script>friends</p>")).toBe("Hi there & friends");
    expect(stripHtml("Story text. The post Title appeared first on Block Club Chicago.")).toBe("Story text.");
  });
});

function story(id: string, title: string, publishedAt: string | null, section: Story["section"] = "tech"): Story {
  return { id, title, source: "S", section, publishedAt, summary: "", url: `https://x.com/${id}` };
}

describe("dedupeAndSort", () => {
  it("sorts newest first with undated stories last", () => {
    const sorted = dedupeAndSort([
      story("a", "Older", "2026-10-22T10:00:00Z"),
      story("b", "Undated", null),
      story("c", "Newest", "2026-10-23T10:00:00Z"),
    ]);
    expect(sorted.map((s) => s.id)).toEqual(["c", "a", "b"]);
  });

  it("drops near-identical titles across sources, keeping the newest copy", () => {
    const sorted = dedupeAndSort([
      story("a", "Apple Unveils New iPhone!", "2026-10-23T10:00:00Z"),
      story("b", "apple unveils new iphone", "2026-10-23T12:00:00Z"),
      story("c", "Something else", "2026-10-23T09:00:00Z"),
    ]);
    expect(sorted.map((s) => s.id)).toEqual(["b", "c"]);
  });
});

describe("normalizeTitle / storyIdForUrl", () => {
  it("normalizes punctuation, case and ampersands", () => {
    expect(normalizeTitle("Rock & Roll: It's  Back!")).toBe("rock and roll its back");
  });
  it("derives the same id regardless of tracking params or hash", () => {
    expect(storyIdForUrl("https://a.com/x?utm_source=1#top")).toBe(storyIdForUrl("https://a.com/x"));
  });
});

describe("paginate", () => {
  const all = [
    story("1", "a", null, "national"),
    story("2", "b", null, "tech"),
    story("3", "c", null, "tech"),
  ];
  it("filters by section and reports the next offset", () => {
    const first = paginate(all, "tech", 0, 1);
    expect(first.page.map((s) => s.id)).toEqual(["2"]);
    expect(first.total).toBe(2);
    expect(first.nextOffset).toBe(1);
    expect(paginate(all, "tech", 1, 1).nextOffset).toBeNull();
  });
  it("returns everything for all", () => {
    expect(paginate(all, "all", 0, 20).page).toHaveLength(3);
  });
});

describe("url safety", () => {
  it("drops stories whose link is not http(s)", () => {
    const xml = `<rss><channel>
      <item><title>Bad</title><link>javascript:alert(1)</link></item>
      <item><title>Good</title><link>https://ok.example.com/x</link></item>
    </channel></rss>`;
    const stories = parseFeed(xml, { name: "X", section: "tech" });
    expect(stories.map((s) => s.title)).toEqual(["Good"]);
  });
});

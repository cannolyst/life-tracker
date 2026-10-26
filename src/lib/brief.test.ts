import { describe, it, expect } from "vitest";
import { buildBrief, briefToSpeech, briefToSpeechParts, cleanForSpeech, formatBriefDate, allBriefStories, chunkForSpeech } from "./brief";
import type { Section, Story } from "./newsTypes";

function story(id: string, section: Section, minutesAgo: number, extra: Partial<Story> = {}): Story {
  return {
    id,
    title: `Headline ${id}`,
    source: "Src",
    section,
    publishedAt: new Date(Date.UTC(2026, 9, 23, 18) - minutesAgo * 60_000).toISOString(),
    summary: `Summary for ${id}. Second sentence here.`,
    url: `https://x.com/${id}`,
    ...extra,
  };
}

// Newest first, as dedupeAndSort would produce.
const stories: Story[] = [
  story("n1", "national", 1),
  story("n2", "national", 2),
  story("n3", "national", 3),
  story("n4", "national", 4),
  story("c1", "chicago", 5),
  story("c2", "chicago", 6),
  story("t1", "tech", 7),
  story("t2", "tech", 8),
  story("t3", "tech", 9),
];

describe("buildBrief", () => {
  it("takes the 3 newest unseen per section", () => {
    const brief = buildBrief(stories, new Set());
    expect(brief.national.map((s) => s.id)).toEqual(["n1", "n2", "n3"]);
    expect(brief.national.every((s) => !s.earlier)).toBe(true);
    expect(brief.tech.map((s) => s.id)).toEqual(["t1", "t2", "t3"]);
  });

  it("skips seen stories and reaches deeper into the list", () => {
    const brief = buildBrief(stories, new Set(["n1", "n2"]));
    expect(brief.national.map((s) => s.id)).toEqual(["n3", "n4", "n1"]);
    expect(brief.national.map((s) => s.earlier)).toEqual([false, false, true]);
  });

  it("fills short sections with the most recent seen stories, flagged earlier", () => {
    const brief = buildBrief(stories, new Set(["c1"]));
    expect(brief.chicago.map((s) => [s.id, s.earlier])).toEqual([
      ["c2", false],
      ["c1", true],
    ]);
  });

  it("returns fewer than 3 only when the section simply has fewer stories", () => {
    expect(buildBrief(stories, new Set()).chicago).toHaveLength(2);
    expect(allBriefStories(buildBrief(stories, new Set()))).toHaveLength(8);
  });
});

describe("cleanForSpeech", () => {
  it("removes urls and symbols and spells out money and percent", () => {
    expect(cleanForSpeech("Fed cuts rates 0.5% — see https://x.com/a #news @bob")).toBe(
      "Fed cuts rates 0.5 percent, see news bob",
    );
    expect(cleanForSpeech("Deal worth $2.5 billion & more")).toBe("Deal worth 2.5 billion dollars and more");
  });
});

describe("speech polish", () => {
  const long = (tail: string) => `${"A".repeat(0)}${"word ".repeat(30)}${tail}`;

  it("drops opening/closing quote marks but keeps apostrophes inside words", () => {
    expect(cleanForSpeech("'Oh, Mary!’ Chicago Tickets, don’t miss it")).toBe(
      "Oh, Mary! Chicago Tickets, don't miss it",
    );
  });

  it("removes a stray lone apostrophe left floating between words", () => {
    expect(cleanForSpeech("The Bears ' worst fears")).toBe("The Bears worst fears");
  });

  it("doesn't end a summary after a lone initial or U.S. abbreviation", () => {
    const b = buildBrief(
      [
        story("x", "national", 1, {
          title: "Headline x",
          summary: "A talk by J. Smith in the U.S. Capitol went long. Next sentence.",
        }),
      ],
      new Set(),
    );
    const text = briefToSpeech(b);
    expect(text).toContain("A talk by J. Smith in the U.S. Capitol went long.");
    expect(text).not.toContain("Next sentence");
  });

  it("cuts an overlong sentence at a clause break, and drops it if there is none", () => {
    const withClause = buildBrief(
      [story("y", "tech", 1, { summary: `${long("alpha beta,")} gamma delta epsilon ${"zeta ".repeat(20)}end.` })],
      new Set(),
    );
    const cut = briefToSpeech(withClause);
    expect(cut).not.toMatch(/,\./);
    expect(cut).not.toContain("end.");

    const noClause = buildBrief([story("z", "tech", 1, { summary: "word ".repeat(80) + "end." })], new Set());
    expect(briefToSpeech(noClause)).toContain("Headline z. That's your brief.");
  });
});

describe("formatBriefDate", () => {
  it("formats weekday, month and ordinal day in Chicago time", () => {
    expect(formatBriefDate(new Date("2026-10-23T15:00:00Z"))).toBe("Friday, October 23rd");
    expect(formatBriefDate(new Date("2026-10-01T15:00:00Z"))).toBe("Thursday, October 1st");
    expect(formatBriefDate(new Date("2026-10-12T15:00:00Z"))).toBe("Monday, October 12th");
  });
});

describe("briefToSpeech", () => {
  const now = new Date("2026-10-23T15:00:00Z");

  it("reads intro, sections, headlines and a first-sentence summary", () => {
    const text = briefToSpeech(buildBrief(stories, new Set()), now);
    expect(text.startsWith("Here's your brief for Friday, October 23rd. In national news,")).toBe(true);
    expect(text).toContain("Headline n1. Summary for n1.");
    expect(text).not.toContain("Second sentence");
    expect(text).toContain("In Chicago news,");
    expect(text).toContain("In tech news,");
    expect(text).not.toMatch(/https?:|[#@$%&*<>]/);
  });

  it("prefixes earlier stories and handles an empty section", () => {
    // Only n4 is unseen, so the national section fills with n1 and n2.
    const brief = buildBrief(
      stories.filter((s) => s.section !== "tech"),
      new Set(["n1", "n2", "n3"]),
    );
    const text = briefToSpeech(brief, now);
    expect(text).toContain("Headline n4. Summary for n4. From earlier: Headline n1.");
    expect(text).toContain("There are no tech stories right now.");
  });

  it("splits into parts: intro, then lead-in and one part per story", () => {
    const parts = briefToSpeechParts(buildBrief(stories, new Set()), now);
    expect(parts[0]).toBe("Here's your brief for Friday, October 23rd.");
    expect(parts[1]).toBe("In national news,");
    expect(parts[parts.length - 1]).toBe("That's your brief.");
    // intro + 3 lead-ins + 8 stories + outro
    expect(parts).toHaveLength(1 + 3 + 8 + 1);
  });
});

describe("chunkForSpeech", () => {
  it("keeps short text whole and splits long text on sentence boundaries", () => {
    expect(chunkForSpeech("One short sentence.")).toEqual(["One short sentence."]);
    const chunks = chunkForSpeech("First sentence here. Second sentence here. Third sentence here.", 40);
    expect(chunks).toEqual(["First sentence here.", "Second sentence here.", "Third sentence here."]);
  });
  it("splits one oversized sentence at word boundaries and never exceeds the limit", () => {
    const long = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");
    const chunks = chunkForSpeech(long, 50);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 50)).toBe(true);
    expect(chunks.join(" ")).toBe(long);
  });
});

export const SECTIONS = ["national", "chicago", "tech"] as const;
export type Section = (typeof SECTIONS)[number];

export const SECTION_LABEL: Record<Section, string> = {
  national: "National",
  chicago: "Chicago",
  tech: "Tech",
};

export type Story = {
  // Stable hash of the canonical story URL — what brief_seen is keyed on.
  id: string;
  title: string;
  source: string;
  section: Section;
  // ISO string, or null when the feed gave an unparseable/missing date.
  publishedAt: string | null;
  summary: string;
  url: string;
};

export type FeedStory = Story & { seen: boolean };
export type BriefStory = Story & { earlier: boolean };
export type Brief = Record<Section, BriefStory[]>;

export type BriefPayload = {
  dateLabel: string;
  brief: Brief;
};

// The "chicago" section is the local one for every user; it is shown under
// the user's own city (Settings > Daily brief city), defaulting to Chicago.
export function sectionLabels(localLabel: string): Record<Section, string> {
  return { ...SECTION_LABEL, chicago: localLabel };
}

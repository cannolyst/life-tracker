import { dayOfMonthIn } from "./timezone";
import { SECTIONS, type Brief, type BriefStory, type Section, type Story } from "./newsTypes";

export const STORIES_PER_SECTION = 3;
export const SEEN_WINDOW_MS = 24 * 60 * 60 * 1000;

// `stories` must already be newest-first (see dedupeAndSort). Per section:
// the 3 newest stories not seen in the last 24h; if fewer than 3 exist, the
// gap is filled with the newest already-seen ones, flagged earlier.
export function buildBrief(
  stories: Story[],
  seenIds: Set<string>,
  perSection: number = STORIES_PER_SECTION,
): Brief {
  const brief = { national: [], chicago: [], tech: [] } as Brief;
  for (const section of SECTIONS) {
    const inSection = stories.filter((s) => s.section === section);
    const unseen = inSection.filter((s) => !seenIds.has(s.id)).slice(0, perSection);
    const picked: BriefStory[] = unseen.map((s) => ({ ...s, earlier: false }));
    if (picked.length < perSection) {
      const pickedIds = new Set(picked.map((s) => s.id));
      const fill = inSection
        .filter((s) => seenIds.has(s.id) && !pickedIds.has(s.id))
        .slice(0, perSection - picked.length)
        .map((s) => ({ ...s, earlier: true }));
      picked.push(...fill);
    }
    brief[section] = picked;
  }
  return brief;
}

export function allBriefStories(brief: Brief): BriefStory[] {
  return SECTIONS.flatMap((section) => brief[section]);
}

function ordinal(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

// "Friday, October 23rd" in the app's timezone.
export function formatBriefDate(tz: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return `${weekday}, ${month} ${ordinal(dayOfMonthIn(tz, now))}`;
}

// Strips everything a speech engine would stumble over: URLs, symbols,
// currency signs, stray punctuation. Keeps plain sentence punctuation.
export function cleanForSpeech(input: string): string {
  return input
    .replace(/https?:\/\/\S+|www\.\S+/gi, " ")
    .replace(/\$(\d[\d,.]*)(\s*(?:thousand|million|billion|trillion))?/gi, (_m, n: string, scale?: string) =>
      `${n}${scale ?? ""} dollars`,
    )
    .replace(/(\d)\s*%/g, "$1 percent")
    .replace(/&/g, " and ")
    .replace(/[–—]/g, ", ")
    // One apostrophe character, then drop quote marks that are really
    // opening/closing quotes (keeping the ones inside words like "don't").
    .replace(/[’‘ʼ′`´]/g, "'")
    .replace(/[^\p{L}\p{N}\s.,;:!?'-]/gu, " ")
    .replace(/\s'+(?=\s|$)/g, "")
    .replace(/(^|\s)'+(?=\S)/g, "$1")
    .replace(/([.,;:!?])'+/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

// The first sentence of a summary, for reading aloud. Won't split after a
// lone initial or "U.S."-style abbreviation. A sentence too long to read
// comfortably is cut at its last clause break, or dropped (a headline on its
// own beats a thought that trails off mid-clause).
function firstSentence(text: string, maxChars = 220): string {
  const clean = cleanForSpeech(text);
  if (!clean) return "";
  const match = clean.match(/^.*?(?<!\b[A-Z])[.!?](?=\s|$)/);
  const sentence = match ? match[0] : clean;
  if (sentence.length <= maxChars) return sentence;

  const clause = sentence.slice(0, maxChars).lastIndexOf(", ");
  if (clause < 80) return "";
  return `${sentence.slice(0, clause).replace(/[,;:\s]+$/, "")}.`;
}

function endWithPeriod(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function storyToSpeech(story: BriefStory): string {
  const headline = endWithPeriod(cleanForSpeech(story.title));
  const summary = firstSentence(story.summary);
  // Skip a summary that just repeats the headline.
  const body =
    summary && cleanForSpeech(story.title).toLowerCase().startsWith(summary.toLowerCase().replace(/[.!?]$/, ""))
      ? ""
      : summary;
  const lead = story.earlier ? "From earlier: " : "";
  return `${lead}${headline}${body ? ` ${endWithPeriod(body)}` : ""}`;
}

// The "chicago" section is every user's local section; it is announced by the
// user's own city (Chicago unless they chose another in Settings).
function sectionIntro(section: Section, localLabel: string): { lead: string; empty: string } {
  switch (section) {
    case "national":
      return { lead: "In national news,", empty: "There are no national stories right now." };
    case "chicago":
      return { lead: `In ${localLabel} news,`, empty: `There are no ${localLabel} stories right now.` };
    case "tech":
      return { lead: "In tech news,", empty: "There are no tech stories right now." };
  }
}

// One entry per natural pause: intro, then each section's lead-in plus its
// stories. The in-app player speaks these one at a time (long single
// utterances get cut off in some browsers); the Shortcut gets them joined.
export function briefToSpeechParts(
  brief: Brief,
  tz: string,
  now: Date = new Date(),
  localLabel = "Chicago",
): string[] {
  const parts = [`Here's your brief for ${formatBriefDate(tz, now)}.`];
  for (const section of SECTIONS) {
    const stories = brief[section];
    if (stories.length === 0) {
      parts.push(sectionIntro(section, localLabel).empty);
      continue;
    }
    parts.push(sectionIntro(section, localLabel).lead);
    for (const story of stories) parts.push(storyToSpeech(story));
  }
  parts.push("That's your brief.");
  return parts;
}

export function briefToSpeech(brief: Brief, tz: string, now: Date = new Date(), localLabel = "Chicago"): string {
  return briefToSpeechParts(brief, tz, now, localLabel).join(" ");
}

// Browsers cut off long utterances (notably Chrome with network voices), so
// the in-app player speaks text in sentence-sized chunks instead of one go.
export function chunkForSpeech(text: string, maxChars = 200): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  const push = () => {
    if (current) chunks.push(current);
    current = "";
  };
  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      push();
      let rest = sentence;
      while (rest.length > maxChars) {
        const space = rest.lastIndexOf(" ", maxChars);
        const at = space > 0 ? space : maxChars;
        chunks.push(rest.slice(0, at).trim());
        rest = rest.slice(at).trim();
      }
      current = rest;
    } else if (current && current.length + 1 + sentence.length > maxChars) {
      push();
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  push();
  return chunks;
}

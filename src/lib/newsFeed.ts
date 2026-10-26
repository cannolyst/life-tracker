import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import type { Section, Story } from "./newsTypes";

const MAX_SUMMARY_CHARS = 700;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  processEntities: true,
  htmlEntities: true,
});

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  hellip: "…",
};

function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

export function stripHtml(input: string): string {
  const withoutTags = input
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(withoutTags)
    .replace(/\s+/g, " ")
    .replace(/\s*The post .{0,200}? appeared first on .*$/i, "")
    .trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

// fast-xml-parser yields a string for a plain element but an object with
// "#text" when the element carries attributes (e.g. Atom's type="html").
function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return textOf(value[0]);
  if (typeof value === "object") return textOf((value as Record<string, unknown>)["#text"]);
  return "";
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

type AtomLink = string | { "@_href"?: string; "@_rel"?: string };

function atomLink(link: unknown): string {
  const links = asArray(link as AtomLink | AtomLink[] | undefined);
  const pick =
    links.find(
      (l): l is Exclude<AtomLink, string> =>
        typeof l === "object" && l !== null && (l["@_rel"] === "alternate" || l["@_rel"] === undefined),
    ) ?? links[0];
  if (!pick) return "";
  return typeof pick === "string" ? pick : (pick["@_href"] ?? "");
}

export function canonicalUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || key === "fbclid" || key === "ref") url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return raw.trim();
  }
}

// Story links end up in an <a href>, so anything that isn't plain http(s)
// (javascript:, data:, ...) is rejected outright.
function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

export function storyIdForUrl(url: string): string {
  return createHash("sha1").update(canonicalUrl(url)).digest("hex").slice(0, 16);
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

type FeedMeta = { name: string; section: Section };

export function parseFeed(xml: string, meta: FeedMeta): Story[] {
  // Parsed feed XML has no fixed shape (RSS 2.0, RDF, Atom); every field is
  // read defensively through textOf/asArray below.
  const doc = parser.parse(xml) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const stories: Story[] = [];

  const rssItems = asArray(doc?.rss?.channel?.item ?? doc?.["rdf:RDF"]?.item);
  const atomEntries = asArray(doc?.feed?.entry);

  for (const item of rssItems) {
    const title = stripHtml(textOf(item.title));
    const url = textOf(item.link).trim() || (typeof item.guid === "object" ? "" : textOf(item.guid).trim());
    if (!title || !isHttpUrl(url)) continue;
    const rawSummary = textOf(item.description) || textOf(item["content:encoded"]);
    stories.push({
      id: storyIdForUrl(url),
      title,
      source: meta.name,
      section: meta.section,
      publishedAt: parseDate(textOf(item.pubDate) || textOf(item["dc:date"])),
      summary: truncate(stripHtml(rawSummary), MAX_SUMMARY_CHARS),
      url: canonicalUrl(url),
    });
  }

  for (const entry of atomEntries) {
    const title = stripHtml(textOf(entry.title));
    const url = atomLink(entry.link).trim();
    if (!title || !isHttpUrl(url)) continue;
    const rawSummary = textOf(entry.summary) || textOf(entry.content);
    stories.push({
      id: storyIdForUrl(url),
      title,
      source: meta.name,
      section: meta.section,
      publishedAt: parseDate(textOf(entry.published) || textOf(entry.updated)),
      summary: truncate(stripHtml(rawSummary), MAX_SUMMARY_CHARS),
      url: canonicalUrl(url),
    });
  }

  return stories;
}

function byNewest(a: Story, b: Story): number {
  const at = a.publishedAt ? Date.parse(a.publishedAt) : 0;
  const bt = b.publishedAt ? Date.parse(b.publishedAt) : 0;
  return bt - at;
}

// Newest first, then drops later stories whose normalized title (or id)
// matches an earlier one — so the same wire story picked up by two outlets
// shows once, attributed to whichever copy is newest.
export function dedupeAndSort(stories: Story[]): Story[] {
  const sorted = [...stories].sort(byNewest);
  const seenTitles = new Set<string>();
  const seenIds = new Set<string>();
  const result: Story[] = [];
  for (const story of sorted) {
    const key = normalizeTitle(story.title);
    if (!key || seenTitles.has(key) || seenIds.has(story.id)) continue;
    seenTitles.add(key);
    seenIds.add(story.id);
    result.push(story);
  }
  return result;
}

export function paginate<T extends { section: Section }>(
  stories: T[],
  section: Section | "all",
  offset: number,
  limit: number,
): { page: T[]; total: number; nextOffset: number | null } {
  const filtered = section === "all" ? stories : stories.filter((s) => s.section === section);
  const page = filtered.slice(offset, offset + limit);
  const next = offset + page.length;
  return { page, total: filtered.length, nextOffset: next < filtered.length ? next : null };
}

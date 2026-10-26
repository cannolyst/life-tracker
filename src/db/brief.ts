import { createHash, randomBytes } from "node:crypto";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "./index";
import { briefSeen, briefTokens } from "./schema";
import { SEEN_WINDOW_MS } from "@/lib/brief";
import { SECTIONS, type Section } from "@/lib/newsTypes";

// Rows older than this are pure clutter (the window that matters is 24h).
const PRUNE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export async function getSeenStoryIds(userId: string): Promise<Set<string>> {
  const since = new Date(Date.now() - SEEN_WINDOW_MS);
  const rows = await db
    .select({ storyId: briefSeen.storyId })
    .from(briefSeen)
    .where(and(eq(briefSeen.userId, userId), gte(briefSeen.seenAt, since)));
  return new Set(rows.map((r) => r.storyId));
}

export type SeenInput = { storyId: string; title: string; section: string };

// Upserts so seeing a story again just refreshes its 24h window.
export async function recordSeen(userId: string, stories: SeenInput[]): Promise<void> {
  const valid = stories
    .filter((s) => s.storyId && (SECTIONS as readonly string[]).includes(s.section))
    .map((s) => ({
      userId,
      storyId: s.storyId.slice(0, 64),
      title: s.title.slice(0, 500),
      section: s.section as Section,
    }));
  if (valid.length === 0) return;

  await db
    .insert(briefSeen)
    .values(valid)
    .onConflictDoUpdate({
      target: [briefSeen.userId, briefSeen.storyId],
      set: { seenAt: sql`now()`, title: sql`excluded.title`, section: sql`excluded.section` },
    });

  await db
    .delete(briefSeen)
    .where(and(eq(briefSeen.userId, userId), lt(briefSeen.seenAt, new Date(Date.now() - PRUNE_AFTER_MS))));
}

export function hashBriefToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Replaces any existing token for this user. The plaintext is returned once
// and never stored.
export async function regenerateBriefToken(userId: string): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  const tokenHash = hashBriefToken(token);
  await db
    .insert(briefTokens)
    .values({ userId, tokenHash })
    .onConflictDoUpdate({ target: briefTokens.userId, set: { tokenHash, createdAt: sql`now()` } });
  return token;
}

export async function getUserIdForBriefToken(token: string): Promise<string | null> {
  if (!token || token.length > 200) return null;
  const [row] = await db
    .select({ userId: briefTokens.userId })
    .from(briefTokens)
    .where(eq(briefTokens.tokenHash, hashBriefToken(token)));
  return row?.userId ?? null;
}

export async function getBriefTokenCreatedAt(userId: string): Promise<Date | null> {
  const [row] = await db
    .select({ createdAt: briefTokens.createdAt })
    .from(briefTokens)
    .where(eq(briefTokens.userId, userId));
  return row?.createdAt ?? null;
}

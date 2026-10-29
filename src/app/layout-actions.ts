"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { requireUserId } from "@/lib/session";
import { sanitizeLayout, type SavedLayout } from "@/lib/layout";

// Pages whose cards can be rearranged. Grows as more pages get a Board.
const PAGES = new Set([
  "home",
  "plan",
  "points",
  "cleaning",
  "exercise",
  "finance",
  "lists",
  "year-review",
  "life",
  "goals",
  "journal",
  "guide",
  "settings",
  "sparks",
  "overview",
  "programs",
  "debt",
  "savings",
]);

// Saves how the user arranged one page. `null` puts the page back to its default.
export async function saveLayoutAction(pageId: string, layout: SavedLayout | null): Promise<{ ok: boolean }> {
  if (!PAGES.has(pageId)) return { ok: false };
  const userId = await requireUserId();

  if (layout === null) {
    await db
      .insert(userSettings)
      .values({ userId })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { layouts: sql`${userSettings.layouts} - ${pageId}::text`, updatedAt: new Date() },
      });
    return { ok: true };
  }

  const clean = sanitizeLayout(layout);
  if (!clean) return { ok: false };
  const patch = JSON.stringify({ [pageId]: clean });
  await db
    .insert(userSettings)
    .values({ userId, layouts: { [pageId]: clean } })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { layouts: sql`${userSettings.layouts} || ${patch}::jsonb`, updatedAt: new Date() },
    });
  return { ok: true };
}

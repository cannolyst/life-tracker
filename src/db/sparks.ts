import { and, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "./index";
import { savedSparks, sparkDays } from "./schema";
import { NO_REPEAT_DAYS, countSavedByType, pickSpark, sparkById, type Spark } from "@/lib/sparks";
import { addDays } from "@/lib/dashboard";

export type TodaysSpark = { spark: Spark; saved: boolean };

// The first request of a user's day picks the spark and records it, so every
// later request (and device) that day shows the same one. The history of past
// picks is what enforces "no repeats within a year".
export async function getTodaysSpark(userId: string, dateKey: string): Promise<TodaysSpark | null> {
  const [savedRows, existing] = await Promise.all([
    db.select({ sparkId: savedSparks.sparkId }).from(savedSparks).where(eq(savedSparks.userId, userId)),
    db
      .select({ sparkId: sparkDays.sparkId })
      .from(sparkDays)
      .where(and(eq(sparkDays.userId, userId), eq(sparkDays.date, dateKey))),
  ]);
  const savedIds = new Set(savedRows.map((r) => r.sparkId));

  let sparkId = existing[0]?.sparkId;
  if (!sparkId) {
    const windowStart = addDays(dateKey, -(NO_REPEAT_DAYS - 1));
    const history = await db
      .select({ sparkId: sparkDays.sparkId })
      .from(sparkDays)
      .where(and(eq(sparkDays.userId, userId), gte(sparkDays.date, windowStart), lt(sparkDays.date, dateKey)));

    const picked = pickSpark({
      userId,
      dateKey,
      savedCounts: countSavedByType([...savedIds]),
      usedIds: new Set(history.map((h) => h.sparkId)),
    });
    // Two tabs opening at once pick the same spark (it's deterministic), but
    // if anything differed the first insert wins and we read it back.
    await db
      .insert(sparkDays)
      .values({ userId, date: dateKey, sparkId: picked.id, type: picked.type })
      .onConflictDoNothing();
    const [row] = await db
      .select({ sparkId: sparkDays.sparkId })
      .from(sparkDays)
      .where(and(eq(sparkDays.userId, userId), eq(sparkDays.date, dateKey)));
    sparkId = row?.sparkId ?? picked.id;
  }

  const spark = sparkById(sparkId);
  return spark ? { spark, saved: savedIds.has(sparkId) } : null;
}

export async function saveSpark(userId: string, sparkId: string): Promise<void> {
  if (!sparkById(sparkId)) return;
  await db.insert(savedSparks).values({ userId, sparkId }).onConflictDoNothing();
}

export async function unsaveSpark(userId: string, sparkId: string): Promise<void> {
  await db.delete(savedSparks).where(and(eq(savedSparks.userId, userId), eq(savedSparks.sparkId, sparkId)));
}

export async function getSavedSparks(userId: string): Promise<{ spark: Spark; savedAt: Date }[]> {
  const rows = await db
    .select()
    .from(savedSparks)
    .where(eq(savedSparks.userId, userId))
    .orderBy(desc(savedSparks.savedAt));
  return rows.flatMap((r) => {
    const spark = sparkById(r.sparkId);
    return spark ? [{ spark, savedAt: r.savedAt }] : [];
  });
}

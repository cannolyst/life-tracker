import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { sparkDays } from "@/db/schema";
import { buildFacts, getEntry } from "@/db/journal";
import { promptFor } from "@/lib/journal";
import { JournalForm } from "./JournalForm";

// The editable entry for one day. Facts are drafted when the entry is first
// saved; until then they are built fresh so tonight's page already shows them.
export async function JournalPanel({ userId, date }: { userId: string; date: string }) {
  const [entry, spark] = await Promise.all([
    getEntry(userId, date),
    db
      .select({ sparkId: sparkDays.sparkId })
      .from(sparkDays)
      .where(and(eq(sparkDays.userId, userId), eq(sparkDays.date, date)))
      .then((rows) => rows[0] ?? null),
  ]);
  const facts = entry?.facts ?? (await buildFacts(userId, date));

  return (
    <JournalForm
      date={date}
      entry={{
        id: entry?.id ?? null,
        hasPhoto: entry?.hasPhoto ?? false,
        photoTakenOn: entry?.photoTakenOn ?? null,
        fallback: entry?.fallback ?? null,
        prompt: entry?.prompt ?? "",
        reflection: entry?.reflection ?? "",
        mood: entry?.mood ?? null,
        completed: entry?.completed ?? false,
      }}
      facts={facts}
      prompt={promptFor(date)}
      hasSpark={spark !== null}
    />
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { requireUserId } from "@/lib/session";
import { getUserSettings } from "@/db/userSettings";
import { entryIsOpen, removePhoto, saveEntry } from "@/db/journal";
import { dateKeyIn } from "@/lib/timezone";

type Result = { ok: true } | { ok: false; error: string };

async function openDate(date: string): Promise<{ userId: string } | { error: string }> {
  const userId = await requireUserId();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "That day isn’t valid." };
  const settings = await getUserSettings(userId);
  const todayKey = dateKeyIn(settings.timezone);
  if (!entryIsOpen(date, todayKey, settings.timezone, new Date())) {
    return { error: "This entry can no longer be changed." };
  }
  return { userId };
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/journal");
}

// Saves the words, mood and prompt. `finish` completes the entry; without it
// the entry stays a draft that can be finished until noon the next day.
export async function saveJournalAction(
  date: string,
  input: { reflection: string; mood: string | null; prompt: string; fallback: string | null; finish: boolean },
): Promise<Result> {
  const checked = await openDate(date);
  if ("error" in checked) return { ok: false, error: checked.error };
  await saveEntry(checked.userId, date, input);
  refresh();
  return { ok: true };
}

export async function removeJournalPhotoAction(date: string): Promise<Result> {
  const checked = await openDate(date);
  if ("error" in checked) return { ok: false, error: checked.error };
  const path = await removePhoto(checked.userId, date);
  if (path) await del(path).catch(() => {});
  refresh();
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  yearReviewCategories,
  yearReviewItems,
  people,
  yearReviewItemPeople,
  places,
  yearReviewItemPlaces,
} from "@/db/schema";

export type ActionState = { error?: string };

function revalidateAll() {
  revalidatePath("/year-review");
}

export async function addYearReviewCategory(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    return { error: "Name is required" };
  }
  await db.insert(yearReviewCategories).values({ name: name.trim() });
  revalidateAll();
  return {};
}

export async function deleteYearReviewCategory(categoryId: string) {
  await db.delete(yearReviewCategories).where(eq(yearReviewCategories.id, categoryId));
  revalidateAll();
}

// Parses a comma-separated tag field, and finds-or-creates a row per name
// (case-insensitive match) in the given reusable-tag table (people/places).
async function resolveTagIds(
  table: typeof people | typeof places,
  rawValue: FormDataEntryValue | null,
): Promise<string[]> {
  const names =
    typeof rawValue === "string"
      ? Array.from(new Set(rawValue.split(",").map((n) => n.trim()).filter(Boolean)))
      : [];
  if (names.length === 0) return [];

  const existing = await db.select().from(table);
  const existingByLowerName = new Map(existing.map((row) => [row.name.toLowerCase(), row]));

  const ids: string[] = [];
  for (const name of names) {
    const match = existingByLowerName.get(name.toLowerCase());
    if (match) {
      ids.push(match.id);
    } else {
      const [created] = await db.insert(table).values({ name }).returning();
      ids.push(created.id);
    }
  }
  return ids;
}

// Reads year (required), plus month and day as far as they were actually
// filled in — supports year-only, month+year, or a full date.
function parseYearMonthDay(
  formData: FormData,
): { year: number; month: number | null; date: string | null } | { error: string } {
  const yearRaw = formData.get("year");
  if (typeof yearRaw !== "string" || !/^\d{4}$/.test(yearRaw.trim())) {
    return { error: "Year is required (4 digits)" };
  }
  const year = Number(yearRaw.trim());

  const monthRaw = formData.get("month");
  const monthStr = typeof monthRaw === "string" ? monthRaw.trim() : "";
  if (!monthStr) {
    return { year, month: null, date: null };
  }
  const month = Number(monthStr);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { error: "Month must be between 1 and 12" };
  }

  const dayRaw = formData.get("day");
  const dayStr = typeof dayRaw === "string" ? dayRaw.trim() : "";
  if (!dayStr) {
    return { year, month, date: null };
  }
  const day = Number(dayStr);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return { error: "Day must be between 1 and 31" };
  }

  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const parsed = new Date(`${dateStr}T00:00:00Z`);
  const isValidCalendarDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
  if (!isValidCalendarDate) {
    return { error: "That's not a valid date" };
  }

  return { year, month, date: dateStr };
}

export async function addYearReviewItem(
  categoryId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const text = formData.get("text");
  if (typeof text !== "string" || !text.trim()) {
    return { error: "Text is required" };
  }

  const parsedDate = parseYearMonthDay(formData);
  if ("error" in parsedDate) {
    return { error: parsedDate.error };
  }

  const [item] = await db
    .insert(yearReviewItems)
    .values({ categoryId, text: text.trim(), ...parsedDate })
    .returning();

  const personIds = await resolveTagIds(people, formData.get("people"));
  if (personIds.length > 0) {
    await db
      .insert(yearReviewItemPeople)
      .values(personIds.map((personId) => ({ itemId: item.id, personId })));
  }

  const placeIds = await resolveTagIds(places, formData.get("places"));
  if (placeIds.length > 0) {
    await db
      .insert(yearReviewItemPlaces)
      .values(placeIds.map((placeId) => ({ itemId: item.id, placeId })));
  }

  revalidateAll();
  return {};
}

export async function updateYearReviewItem(
  itemId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const text = formData.get("text");
  if (typeof text !== "string" || !text.trim()) {
    return { error: "Text is required" };
  }

  const parsedDate = parseYearMonthDay(formData);
  if ("error" in parsedDate) {
    return { error: parsedDate.error };
  }

  await db
    .update(yearReviewItems)
    .set({ text: text.trim(), ...parsedDate })
    .where(eq(yearReviewItems.id, itemId));

  const personIds = await resolveTagIds(people, formData.get("people"));
  await db.delete(yearReviewItemPeople).where(eq(yearReviewItemPeople.itemId, itemId));
  if (personIds.length > 0) {
    await db
      .insert(yearReviewItemPeople)
      .values(personIds.map((personId) => ({ itemId, personId })));
  }

  const placeIds = await resolveTagIds(places, formData.get("places"));
  await db.delete(yearReviewItemPlaces).where(eq(yearReviewItemPlaces.itemId, itemId));
  if (placeIds.length > 0) {
    await db.insert(yearReviewItemPlaces).values(placeIds.map((placeId) => ({ itemId, placeId })));
  }

  revalidateAll();
  return {};
}

export async function deleteYearReviewItem(itemId: string) {
  await db.delete(yearReviewItems).where(eq(yearReviewItems.id, itemId));
  revalidateAll();
}

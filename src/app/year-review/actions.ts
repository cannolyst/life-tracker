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

export async function addYearReviewItem(
  categoryId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const text = formData.get("text");
  const date = formData.get("date");
  if (typeof text !== "string" || !text.trim()) {
    return { error: "Text is required" };
  }
  if (typeof date !== "string" || !date) {
    return { error: "Date is required" };
  }

  const [item] = await db
    .insert(yearReviewItems)
    .values({ categoryId, text: text.trim(), date })
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
  const date = formData.get("date");
  if (typeof text !== "string" || !text.trim()) {
    return { error: "Text is required" };
  }
  if (typeof date !== "string" || !date) {
    return { error: "Date is required" };
  }

  await db
    .update(yearReviewItems)
    .set({ text: text.trim(), date })
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

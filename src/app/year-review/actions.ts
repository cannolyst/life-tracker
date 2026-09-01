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

export async function addYearReviewItem(
  categoryId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const text = formData.get("text");
  const date = formData.get("date");
  const peopleRaw = formData.get("people");
  const placesRaw = formData.get("places");
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

  const names =
    typeof peopleRaw === "string"
      ? Array.from(new Set(peopleRaw.split(",").map((n) => n.trim()).filter(Boolean)))
      : [];

  if (names.length > 0) {
    const existing = await db.select().from(people);
    const existingByLowerName = new Map(existing.map((p) => [p.name.toLowerCase(), p]));

    const personIds: string[] = [];
    for (const name of names) {
      const match = existingByLowerName.get(name.toLowerCase());
      if (match) {
        personIds.push(match.id);
      } else {
        const [created] = await db.insert(people).values({ name }).returning();
        personIds.push(created.id);
      }
    }

    await db
      .insert(yearReviewItemPeople)
      .values(personIds.map((personId) => ({ itemId: item.id, personId })));
  }

  const placeNames =
    typeof placesRaw === "string"
      ? Array.from(new Set(placesRaw.split(",").map((n) => n.trim()).filter(Boolean)))
      : [];

  if (placeNames.length > 0) {
    const existing = await db.select().from(places);
    const existingByLowerName = new Map(existing.map((p) => [p.name.toLowerCase(), p]));

    const placeIds: string[] = [];
    for (const name of placeNames) {
      const match = existingByLowerName.get(name.toLowerCase());
      if (match) {
        placeIds.push(match.id);
      } else {
        const [created] = await db.insert(places).values({ name }).returning();
        placeIds.push(created.id);
      }
    }

    await db
      .insert(yearReviewItemPlaces)
      .values(placeIds.map((placeId) => ({ itemId: item.id, placeId })));
  }

  revalidateAll();
  return {};
}

export async function deleteYearReviewItem(itemId: string) {
  await db.delete(yearReviewItems).where(eq(yearReviewItems.id, itemId));
  revalidateAll();
}

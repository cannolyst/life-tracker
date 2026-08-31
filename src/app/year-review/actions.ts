"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { yearReviewCategories, yearReviewItems } from "@/db/schema";

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
  if (typeof text !== "string" || !text.trim()) {
    return { error: "Text is required" };
  }
  if (typeof date !== "string" || !date) {
    return { error: "Date is required" };
  }
  await db.insert(yearReviewItems).values({ categoryId, text: text.trim(), date });
  revalidateAll();
  return {};
}

export async function deleteYearReviewItem(itemId: string) {
  await db.delete(yearReviewItems).where(eq(yearReviewItems.id, itemId));
  revalidateAll();
}

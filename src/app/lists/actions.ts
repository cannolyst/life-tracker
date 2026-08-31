"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { listCategories, listItems } from "@/db/schema";

export type ActionState = { error?: string };

function revalidateAll() {
  revalidatePath("/lists");
}

export async function addListCategory(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    return { error: "Name is required" };
  }
  await db.insert(listCategories).values({ name: name.trim() });
  revalidateAll();
  return {};
}

export async function deleteListCategory(categoryId: string) {
  await db.delete(listCategories).where(eq(listCategories.id, categoryId));
  revalidateAll();
}

export async function addListItem(
  categoryId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const text = formData.get("text");
  if (typeof text !== "string" || !text.trim()) {
    return { error: "Text is required" };
  }
  await db.insert(listItems).values({ categoryId, text: text.trim() });
  revalidateAll();
  return {};
}

export async function setListItemDone(itemId: string, done: boolean) {
  await db.update(listItems).set({ done }).where(eq(listItems.id, itemId));
  revalidateAll();
}

export async function deleteListItem(itemId: string) {
  await db.delete(listItems).where(eq(listItems.id, itemId));
  revalidateAll();
}

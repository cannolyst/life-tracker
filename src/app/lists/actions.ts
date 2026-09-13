"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { listCategories, listItems } from "@/db/schema";
import { requireUserId } from "@/lib/session";

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
  const userId = await requireUserId();
  await db.insert(listCategories).values({ userId, name: name.trim() });
  revalidateAll();
  return {};
}

export async function deleteListCategory(categoryId: string) {
  const userId = await requireUserId();
  await db
    .delete(listCategories)
    .where(and(eq(listCategories.id, categoryId), eq(listCategories.userId, userId)));
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
  const userId = await requireUserId();
  await db.insert(listItems).values({ userId, categoryId, text: text.trim() });
  revalidateAll();
  return {};
}

export async function setListItemDone(itemId: string, done: boolean) {
  const userId = await requireUserId();
  await db
    .update(listItems)
    .set({ done })
    .where(and(eq(listItems.id, itemId), eq(listItems.userId, userId)));
  revalidateAll();
}

export async function deleteListItem(itemId: string) {
  const userId = await requireUserId();
  await db.delete(listItems).where(and(eq(listItems.id, itemId), eq(listItems.userId, userId)));
  revalidateAll();
}

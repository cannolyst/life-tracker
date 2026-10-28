"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { listCategories, listItems } from "@/db/schema";
import { requireUserId } from "@/lib/session";
import { isListContext } from "@/lib/planning";

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
  const existing = await db
    .select({ id: listCategories.id })
    .from(listCategories)
    .where(eq(listCategories.userId, userId));
  await db
    .insert(listCategories)
    .values({ userId, name: name.trim(), orderIndex: existing.length });
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

export async function setListContext(categoryId: string, context: string | null) {
  if (context !== null && !isListContext(context)) return;
  const userId = await requireUserId();
  await db
    .update(listCategories)
    .set({ context })
    .where(and(eq(listCategories.id, categoryId), eq(listCategories.userId, userId)));
  revalidateAll();
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

// Swaps this list's position with its neighbor (same two-row orderIndex swap
// the Exercise page uses for exercises and days).
async function swapListOrder(categoryId: string, direction: "up" | "down") {
  const userId = await requireUserId();
  const lists = await db
    .select()
    .from(listCategories)
    .where(eq(listCategories.userId, userId))
    .orderBy(listCategories.orderIndex, listCategories.createdAt);

  const index = lists.findIndex((l) => l.id === categoryId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= lists.length) return;

  // Rewrite positions as 0..n-1 with the two swapped, so lists that share an
  // orderIndex (or were never numbered) still end up with a stable order.
  const reordered = lists.map((l) => l.id);
  [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
  await Promise.all(
    reordered.map((id, position) =>
      db
        .update(listCategories)
        .set({ orderIndex: position })
        .where(and(eq(listCategories.id, id), eq(listCategories.userId, userId))),
    ),
  );
  revalidateAll();
}

export async function moveListUp(categoryId: string) {
  await swapListOrder(categoryId, "up");
}

export async function moveListDown(categoryId: string) {
  await swapListOrder(categoryId, "down");
}

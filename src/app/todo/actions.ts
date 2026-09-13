"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { todos } from "@/db/schema";
import { requireUserId } from "@/lib/session";

export type ActionState = { error?: string };

function revalidateAll() {
  revalidatePath("/todo");
}

export async function addTodo(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const text = formData.get("text");
  if (typeof text !== "string" || !text.trim()) {
    return { error: "Text is required" };
  }
  const userId = await requireUserId();
  await db.insert(todos).values({ userId, text: text.trim() });
  revalidateAll();
  return {};
}

export async function setTodoDone(todoId: string, done: boolean) {
  const userId = await requireUserId();
  await db.update(todos).set({ done }).where(and(eq(todos.id, todoId), eq(todos.userId, userId)));
  revalidateAll();
}

export async function deleteTodo(todoId: string) {
  const userId = await requireUserId();
  await db.delete(todos).where(and(eq(todos.id, todoId), eq(todos.userId, userId)));
  revalidateAll();
}

export async function clearCompletedTodos() {
  const userId = await requireUserId();
  await db.delete(todos).where(and(eq(todos.done, true), eq(todos.userId, userId)));
  revalidateAll();
}

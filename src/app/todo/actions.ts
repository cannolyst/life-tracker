"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { todos } from "@/db/schema";

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
  await db.insert(todos).values({ text: text.trim() });
  revalidateAll();
  return {};
}

export async function setTodoDone(todoId: string, done: boolean) {
  await db.update(todos).set({ done }).where(eq(todos.id, todoId));
  revalidateAll();
}

export async function deleteTodo(todoId: string) {
  await db.delete(todos).where(eq(todos.id, todoId));
  revalidateAll();
}

export async function clearCompletedTodos() {
  await db.delete(todos).where(eq(todos.done, true));
  revalidateAll();
}

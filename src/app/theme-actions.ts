"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { BackgroundColor } from "@/lib/backgroundColors";

export async function setTheme(theme: "light" | "dark") {
  const cookieStore = await cookies();
  cookieStore.set("theme", theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export async function setBackgroundColor(color: BackgroundColor) {
  const cookieStore = await cookies();
  cookieStore.set("color", color, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_DURATION_SECONDS,
} from "@/lib/auth";

export async function login(_prevState: { error?: string }, formData: FormData) {
  const password = formData.get("password");
  const appPassword = process.env.APP_PASSWORD;

  if (!appPassword) {
    throw new Error("APP_PASSWORD is not set");
  }

  if (typeof password !== "string" || password !== appPassword) {
    return { error: "Incorrect password" };
  }

  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  });

  redirect("/");
}

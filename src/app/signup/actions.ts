"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; success?: boolean };

export async function signup(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || !email.trim()) {
    return { error: "Email is required" };
  }
  if (typeof password !== "string" || password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  // Derived from the actual incoming request rather than a manually-set
  // env var, so this always points at whatever host the signup really
  // came from (production, a preview deployment, or local dev) instead of
  // silently falling back to a URL that only resolves on one machine.
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol =
    headersList.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "http://localhost:3000";

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

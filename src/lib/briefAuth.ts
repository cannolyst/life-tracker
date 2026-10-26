import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserIdForBriefToken } from "@/db/brief";

// /api is excluded from the session middleware, so these routes authenticate
// themselves: a personal ?token= (the iOS Shortcut, no session) or the
// regular Supabase session cookie (the app). A token that's present but
// wrong is a hard failure — it never silently falls back to the session.
export async function resolveBriefUserId(request: NextRequest): Promise<string | null> {
  const token = request.nextUrl.searchParams.get("token");
  if (token !== null) return getUserIdForBriefToken(token);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

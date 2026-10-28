import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCalendarEvents } from "@/lib/calendarService";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

// middleware.ts skips /api, so this route authenticates the session itself.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });

  const params = request.nextUrl.searchParams;
  const daysParam = Number(params.get("days"));
  const result = await getCalendarEvents(user.id, {
    days: Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 7,
    fresh: params.get("fresh") === "1",
  });

  if (result.status === "off") {
    return Response.json({ error: result.message }, { status: 403, headers: NO_STORE });
  }
  return Response.json(result, { headers: NO_STORE });
}

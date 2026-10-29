import type { NextRequest } from "next/server";
import { runNotifications } from "@/db/notifyRun";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Called by Vercel Cron every 15 minutes. Vercel sends `Authorization: Bearer
// $CRON_SECRET`; middleware skips /api, so this route checks it itself.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // For local testing only: pretend it is a different moment.
  const at = process.env.NODE_ENV !== "production" ? request.nextUrl.searchParams.get("at") : null;
  const now = at && !Number.isNaN(Date.parse(at)) ? new Date(at) : new Date();

  const summary = await runNotifications(now);
  return Response.json(summary, { headers: { "Cache-Control": "no-store" } });
}

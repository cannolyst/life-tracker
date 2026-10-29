import type { NextRequest } from "next/server";
import { get } from "@vercel/blob";
import { createClient } from "@/lib/supabase/server";
import { getEntryById } from "@/db/journal";

export const dynamic = "force-dynamic";

// Streams a journal photo to its owner only. The stored blob is private, so
// this route is the one way to see it. Another user's id looks like a missing photo.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const entry = await getEntryById(user.id, id);
  if (!entry?.photoPath) return new Response("Not found", { status: 404 });

  const result = await get(entry.photoPath, { access: "private" }).catch(() => null);
  if (!result || result.statusCode !== 200) return new Response("Not found", { status: 404 });

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      // Private to this browser; the photo only changes when the entry is edited.
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

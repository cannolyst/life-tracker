import type { NextRequest } from "next/server";
import { del, put } from "@vercel/blob";
import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/db/userSettings";
import { attachPhoto, entryIsOpen } from "@/db/journal";
import { dateKeyIn } from "@/lib/timezone";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
// The phone resizes to about 1600px first, so a real upload is a few hundred KB.
const MAX_BYTES = 3 * 1024 * 1024;

function fail(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: NO_STORE });
}

// middleware.ts skips /api, so this route authenticates the session itself.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Unauthorized", 401);

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return fail("Photo storage isn’t set up yet, so this photo wasn’t saved.", 503);
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  const date = String(form?.get("date") ?? "");
  const takenOnRaw = String(form?.get("takenOn") ?? "");
  if (!(file instanceof File) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("That photo couldn’t be read.", 400);
  if (file.type !== "image/jpeg") return fail("Photos are saved as JPEG.", 400);
  if (file.size > MAX_BYTES) return fail("That photo is too large. Try a smaller one.", 413);

  const settings = await getUserSettings(user.id);
  const todayKey = dateKeyIn(settings.timezone);
  if (!entryIsOpen(date, todayKey, settings.timezone, new Date())) {
    return fail("This entry can no longer be changed.", 409);
  }

  // Private: there is no public URL. The photo is only readable through
  // /api/journal/photo/[id], which checks that the entry belongs to the viewer.
  const blob = await put(`journal/${user.id}/${date}.jpg`, file, {
    access: "private",
    contentType: "image/jpeg",
    addRandomSuffix: true,
  });

  const takenOn = /^\d{4}-\d{2}-\d{2}$/.test(takenOnRaw) ? takenOnRaw : null;
  const { id, previousPath } = await attachPhoto(user.id, date, blob.pathname, takenOn);
  if (previousPath) await del(previousPath).catch(() => {});
  return Response.json({ ok: true, id }, { headers: NO_STORE });
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Every Server Component/Action that touches the database calls this first
// so there's one place that gets "who is the current user" right, instead
// of each of the ~30 call sites re-deriving it. Middleware already redirects
// unauthenticated requests to /login, so hitting the fallback here would
// mean the session expired between the middleware check and this call.
export async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user.id;
}

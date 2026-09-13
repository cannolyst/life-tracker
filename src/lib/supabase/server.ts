import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// A Supabase client for use in Server Components, Server Actions, and Route
// Handlers. Server Components can only read cookies (not set them), so the
// setAll call there is a guarded no-op — session refresh only actually
// persists when this is called from middleware, a Server Action, or a
// Route Handler, matching Supabase's standard Next.js App Router pattern.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — no-op, session refresh
            // happens in middleware instead.
          }
        },
      },
    },
  );
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }

  // Start from a response tied to the incoming request so refreshed
  // session cookies actually persist — building a fresh NextResponse after
  // mutating cookies (instead of mutating this same object) is a common
  // footgun that silently drops the refresh.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() revalidates against Supabase rather than trusting the cookie
  // outright, unlike getSession().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // First-time users pick which tabs they want before seeing the app.
  // user_metadata comes free on the already-fetched user object, so this
  // adds no extra request — a real DB check here would need the Node.js
  // runtime, which this Edge middleware doesn't run under.
  if (!pathname.startsWith("/onboarding") && user.user_metadata?.onboarded !== true) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/agent", "/connections", "/activity", "/settings"];

/**
 * Runs on every request (see the matcher in /middleware.ts):
 *  1. Refreshes the Supabase session and re-writes its cookies.
 *  2. Redirects signed-out visitors away from protected pages, and
 *     signed-in visitors away from /login.
 *
 * This is the real access boundary for Phase 2 — pages additionally
 * check the session themselves for defense in depth, but this is what
 * actually stops an unauthenticated request from reaching /agent,
 * /connections, /activity, or /settings.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));

  if (isProtected && !isSignedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && isSignedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/agent";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

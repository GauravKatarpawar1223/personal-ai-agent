import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase OAuth (e.g. "Continue with Google") redirects here with a
 * `code` query param after the provider confirms sign-in. Exchanging it
 * sets the session cookie; from there the user is genuinely signed in —
 * there's no separate "pretend" success path.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") || "/agent";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  const failureUrl = new URL("/login", origin);
  failureUrl.searchParams.set("error", "Sign-in didn't complete. Please try again.");
  return NextResponse.redirect(failureUrl);
}

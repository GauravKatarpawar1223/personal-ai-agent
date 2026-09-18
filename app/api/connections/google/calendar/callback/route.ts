import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createGoogleOAuthClient, GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/connectors/google/oauth-client";
import { saveGoogleCredentials } from "@/lib/data/google-credentials";

function redirectWithError(origin: string, reason: string) {
  const url = new URL("/connections", origin);
  url.searchParams.set("google_calendar", "error");
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);

  const oauthError = searchParams.get("error");
  if (oauthError) {
    // e.g. "access_denied" when the user declines on Google's screen.
    return redirectWithError(origin, oauthError === "access_denied" ? "denied" : "oauth_error");
  }

  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  if (!code || !returnedState) {
    return redirectWithError(origin, "missing_code");
  }

  const cookieStore = request.headers.get("cookie") ?? "";
  const expectedState = readCookie(cookieStore, GOOGLE_OAUTH_STATE_COOKIE);
  if (!expectedState || expectedState !== returnedState) {
    return redirectWithError(origin, "state_mismatch");
  }

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub as string | undefined;
  if (authError || !userId) {
    return NextResponse.redirect(`${origin}/login?redirectTo=/connections`);
  }

  let oauthClient;
  try {
    oauthClient = createGoogleOAuthClient();
  } catch {
    return redirectWithError(origin, "not_configured");
  }

  let tokens;
  try {
    const result = await oauthClient.getToken(code);
    tokens = result.tokens;
  } catch (err) {
    console.error("Google token exchange failed:", err instanceof Error ? err.message : "unknown error");
    return redirectWithError(origin, "token_exchange_failed");
  }

  if (!tokens.access_token || !tokens.refresh_token) {
    // Missing refresh_token usually means the consent screen wasn't
    // shown (rare, since the authorize route always sends
    // prompt=consent) — without it we can't stay connected past the
    // first hour, so this is treated as a failure rather than a
    // half-working connection.
    return redirectWithError(origin, "missing_refresh_token");
  }

  try {
    await saveGoogleCredentials(supabase, userId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date ?? Date.now() + 3600_000,
      scopes: tokens.scope ? tokens.scope.split(" ") : [],
    });
  } catch (err) {
    console.error("Failed to store Google credentials:", err instanceof Error ? err.message : "unknown error");
    return redirectWithError(origin, "storage_failed");
  }

  const { error: upsertError } = await supabase.from("connections").upsert(
    {
      user_id: userId,
      provider_id: "google_calendar",
      status: "connected",
      scopes: tokens.scope ? tokens.scope.split(" ") : [],
      connected_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider_id" }
  );
  if (upsertError) {
    console.error("Failed to update connections row:", upsertError.message);
    return redirectWithError(origin, "storage_failed");
  }

  const successUrl = new URL("/connections", origin);
  successUrl.searchParams.set("google_calendar", "connected");
  const response = NextResponse.redirect(successUrl);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}

function readCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

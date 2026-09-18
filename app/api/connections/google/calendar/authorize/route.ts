import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import {
  createGoogleOAuthClient,
  GOOGLE_CALENDAR_SCOPES,
  GOOGLE_OAUTH_STATE_COOKIE,
  isGoogleOAuthConfigured,
} from "@/lib/connectors/google/oauth-client";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return NextResponse.redirect(`${origin}/login?redirectTo=/connections`);
  }

  if (!isGoogleOAuthConfigured()) {
    const url = new URL("/connections", origin);
    url.searchParams.set("google_calendar", "error");
    url.searchParams.set("reason", "not_configured");
    return NextResponse.redirect(url);
  }

  const oauthClient = createGoogleOAuthClient();
  const state = randomBytes(24).toString("hex");

  const authUrl = oauthClient.generateAuthUrl({
    access_type: "offline",
    // Forces Google to re-issue a refresh_token even if this user
    // authorized before — without this, reconnecting after a token
    // problem could silently fail to grant one.
    prompt: "consent",
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
  });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutes — plenty for a consent-screen round trip
    path: "/",
  });
  return response;
}

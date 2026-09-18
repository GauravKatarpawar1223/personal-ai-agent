import { google } from "googleapis";

export const GOOGLE_CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar"];

/** Name of the short-lived, httpOnly cookie used to guard the OAuth
 *  callback against CSRF — set by the authorize route, checked and
 *  cleared by the callback route. */
export const GOOGLE_OAUTH_STATE_COOKIE = "google_calendar_oauth_state";

/**
 * Server-only. Reads GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET /
 * GOOGLE_REDIRECT_URI from the environment — none of these are
 * NEXT_PUBLIC_*, so they never reach the browser bundle. Throws a
 * plain, secret-free error if any are missing, so callers can turn
 * that into an honest "not configured" response instead of a crash.
 */
export function createGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google Calendar isn't configured on the server (missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REDIRECT_URI)."
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI
  );
}

import type { createClient } from "@/lib/supabase/server";
import { encryptToken, decryptToken } from "@/lib/security/token-encryption";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  /** Milliseconds since epoch. */
  expiresAt: number;
  scopes: string[];
}

/** Returns the signed-in user's stored Google credentials, decrypted
 *  in memory only — never logged, never returned to the client. RLS
 *  means this can only ever read the caller's own row. Returns null if
 *  the user has never connected Google Calendar. */
export async function getGoogleCredentials(
  supabase: SupabaseServerClient,
  userId: string
): Promise<GoogleTokens | null> {
  const { data, error } = await supabase
    .from("google_oauth_credentials")
    .select("access_token_encrypted, refresh_token_encrypted, access_token_expires_at, scopes")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  try {
    return {
      accessToken: decryptToken(data.access_token_encrypted as string),
      refreshToken: decryptToken(data.refresh_token_encrypted as string),
      expiresAt: new Date(data.access_token_expires_at as string).getTime(),
      scopes: (data.scopes as string[] | null) ?? [],
    };
  } catch (err) {
    // Decryption failure (e.g. GOOGLE_TOKEN_ENCRYPTION_KEY rotated
    // without re-auth) — treat as "not connected" rather than crash.
    console.error("Failed to decrypt stored Google credentials:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Encrypts and upserts the user's Google credentials. Called once
 *  after the OAuth callback exchanges a code for tokens, and again
 *  whenever googleapis silently refreshes the access token. */
export async function saveGoogleCredentials(
  supabase: SupabaseServerClient,
  userId: string,
  tokens: GoogleTokens
): Promise<void> {
  const { error } = await supabase.from("google_oauth_credentials").upsert({
    user_id: userId,
    access_token_encrypted: encryptToken(tokens.accessToken),
    refresh_token_encrypted: encryptToken(tokens.refreshToken),
    access_token_expires_at: new Date(tokens.expiresAt).toISOString(),
    scopes: tokens.scopes,
  });
  if (error) {
    throw new Error("Could not save the Google connection: " + error.message);
  }
}

import { createClient } from "@/lib/supabase/server";
import type { User } from "@/lib/types";

/**
 * Real session lookup, backed by Supabase Auth + the `profiles` table.
 * Server-only (uses the server Supabase client, which reads cookies via
 * next/headers) — call this from Server Components, Server Actions, and
 * Route Handlers, not from the browser.
 *
 * Uses getClaims() rather than getSession() to verify identity, per
 * Supabase's current guidance: getClaims() validates the JWT signature
 * every time, where getSession() trusts storage that could be spoofed.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims as { sub?: string; email?: string } | undefined;

  if (error || !claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, avatar_url, created_at")
    .eq("id", claims.sub)
    .maybeSingle();

  const email = claims.email ?? "";
  return {
    id: claims.sub,
    name: profile?.name || email.split("@")[0] || "You",
    email,
    avatarUrl: profile?.avatar_url ?? undefined,
    createdAt: profile?.created_at ?? new Date().toISOString(),
  };
}

import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

/**
 * For the Android device-agent endpoints only (/api/agent/device/*).
 * Mobile apps don't carry the browser's session cookie, so they send
 * their Supabase access token as a normal `Authorization: Bearer <jwt>`
 * header instead. This file is intentionally separate from
 * lib/supabase/server.ts (cookie-based, used by every web page/route) —
 * it changes nothing about how the web app authenticates.
 *
 * The returned client's Postgrest requests carry the same Authorization
 * header, so Row Level Security's auth.uid() resolves exactly the way
 * it does for a cookie-based web session — no RLS policy anywhere
 * needed to change, and no service-role key is used here.
 */
export function createBearerClient(accessToken: string) {
  return createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!.trim(),
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

/** Extracts and validates the bearer token from a device request.
 *  Returns the authenticated user id, or null if missing/invalid. */
export async function authenticateDeviceRequest(
  request: Request
): Promise<{ userId: string; supabase: ReturnType<typeof createBearerClient> } | null> {
  const authHeader = request.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const accessToken = match[1];
  if (!accessToken) return null;

  const supabase = createBearerClient(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return null;

  return { userId: data.user.id, supabase };
}

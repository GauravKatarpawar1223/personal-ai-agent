import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in Client Components (the browser). Uses the
 * publishable key only — safe to ship to the browser, and the only key
 * this file ever touches.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!.trim()
  );
}

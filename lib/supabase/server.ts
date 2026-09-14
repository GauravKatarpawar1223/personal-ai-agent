import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for use on the server — Server Components, Server
 * Actions, and Route Handlers. Reads/writes the session via cookies, and
 * still only uses the publishable key: every query made with this client
 * runs as the signed-in user and is scoped by Row Level Security, not by
 * an elevated key. (A secret-key/service-role client, if this project
 * ever needs one, would live in its own file and never be imported into
 * anything that also renders UI.)
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore because
            // middleware (lib/supabase/middleware.ts) refreshes the
            // session on every request.
          }
        },
      },
    }
  );
}

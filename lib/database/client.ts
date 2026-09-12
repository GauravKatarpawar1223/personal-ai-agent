/**
 * Database scaffold
 * ------------------
 * No database is connected in Phase 1 — all data comes from
 * /lib/demo-data.ts. When Supabase is introduced, this file becomes the
 * single place that constructs the Supabase client(s):
 *
 *   - a browser client using NEXT_PUBLIC_SUPABASE_URL /
 *     NEXT_PUBLIC_SUPABASE_ANON_KEY for reads gated by row-level security
 *   - a server-only client using SUPABASE_SERVICE_ROLE_KEY for privileged
 *     operations, constructed only inside server actions / route handlers
 *
 * Keeping construction centralized here means the service role key can
 * never accidentally end up in a client component's bundle: nothing
 * outside this file (and files that are explicitly server-only) should
 * ever read `process.env.SUPABASE_SERVICE_ROLE_KEY`.
 */
export {};

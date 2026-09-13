import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { createClient } from "@/lib/supabase/server";
import { listConversations } from "@/lib/data/conversations";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Server Component: fetches the signed-in user and their conversation
 * list once, then renders the (client) Sidebar/MobileNav around whatever
 * page-specific content is passed in. Pages that use this must be Server
 * Components themselves — see app/agent/page.tsx for the pattern of a
 * Server Component page handing fetched data to a Client Component for
 * the interactive parts.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()]);
  const conversations = user ? await listConversations(supabase) : [];

  return (
    <div className="min-h-screen md:flex bg-paper text-ink">
      <Sidebar conversations={conversations} userEmail={user?.email} />
      <div className="flex-1 min-w-0 pb-16 md:pb-0">{children}</div>
      <MobileNav />
    </div>
  );
}

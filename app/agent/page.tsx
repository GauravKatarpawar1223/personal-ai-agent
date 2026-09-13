import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AgentWorkspace } from "@/components/agent/AgentWorkspace";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listMessages } from "@/lib/data/conversations";

export default async function AgentPage({
  searchParams,
}: {
  searchParams: { c?: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirectTo=/agent");
  }

  const conversationId = searchParams.c;
  const messages = conversationId
    ? await listMessages(await createClient(), conversationId)
    : [];

  return (
    <AppShell>
      <AgentWorkspace initialConversationId={conversationId} initialMessages={messages} />
    </AppShell>
  );
}

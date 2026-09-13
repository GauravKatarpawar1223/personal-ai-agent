import type { createClient } from "@/lib/supabase/server";
import type { ActivityLog, ActivityStatus } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface ActivityRow {
  id: string;
  action: string;
  tool: string;
  status: ActivityStatus;
  created_at: string;
}

export async function listActivity(supabase: SupabaseServerClient, limit = 50): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, action, tool, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as ActivityRow[]).map((row) => ({
    id: row.id,
    action: row.action,
    tool: row.tool,
    status: row.status,
    timestamp: row.created_at,
    isDemo: false,
  }));
}

export async function logActivity(
  supabase: SupabaseServerClient,
  params: { userId: string; action: string; tool: string; status: ActivityStatus; conversationId?: string }
): Promise<void> {
  // Best-effort: a logging failure shouldn't take down the request that
  // triggered it, but it also shouldn't be silent — surface it server-side.
  const { error } = await supabase.from("activity_log").insert({
    user_id: params.userId,
    conversation_id: params.conversationId ?? null,
    action: params.action,
    tool: params.tool,
    status: params.status,
  });

  if (error) {
    console.error("Failed to write activity log entry:", error.message);
  }
}

import type { createClient } from "@/lib/supabase/server";
import type { ToolExecutionStatus } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function recordToolExecution(
  supabase: SupabaseServerClient,
  params: {
    userId: string;
    conversationId?: string;
    toolId: string;
    toolName: string;
    status: ToolExecutionStatus;
    summary: string;
    completed?: boolean;
  }
): Promise<void> {
  const { error } = await supabase.from("tool_executions").insert({
    user_id: params.userId,
    conversation_id: params.conversationId ?? null,
    tool_id: params.toolId,
    tool_name: params.toolName,
    status: params.status,
    summary: params.summary,
    completed_at: params.completed ? new Date().toISOString() : null,
  });
  if (error) {
    console.error("Failed to record tool execution:", error.message);
  }
}

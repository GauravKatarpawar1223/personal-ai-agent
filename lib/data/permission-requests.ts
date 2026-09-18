import type { createClient } from "@/lib/supabase/server";
import type { PermissionRequestImpact } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** What's actually stored in the `details` jsonb column: the
 *  human-readable fields ConfirmationCard shows, plus enough structured
 *  data (toolId + input) for /api/agent/confirm to run the real tool
 *  later without re-parsing the original message. */
export interface PermissionRequestDetails {
  display: Record<string, string>;
  toolId: string;
  input: Record<string, string>;
}

export interface PermissionRequestRow {
  id: string;
  conversationId: string | null;
  title: string;
  description: string;
  impact: PermissionRequestImpact;
  details: PermissionRequestDetails;
  resolved: boolean;
  approved: boolean | null;
}

export async function createPermissionRequest(
  supabase: SupabaseServerClient,
  params: {
    userId: string;
    conversationId?: string;
    title: string;
    description: string;
    impact: PermissionRequestImpact;
    details: PermissionRequestDetails;
  }
): Promise<PermissionRequestRow> {
  const { data, error } = await supabase
    .from("permission_requests")
    .insert({
      user_id: params.userId,
      conversation_id: params.conversationId ?? null,
      title: params.title,
      description: params.description,
      impact: params.impact,
      details: params.details,
    })
    .select("id, conversation_id, title, description, impact, details, resolved, approved")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create the permission request.");
  }
  return rowFromDb(data);
}

/** RLS scopes this to the signed-in user, so a request id belonging to
 *  someone else simply won't be found. */
export async function getPermissionRequest(
  supabase: SupabaseServerClient,
  id: string
): Promise<PermissionRequestRow | null> {
  const { data, error } = await supabase
    .from("permission_requests")
    .select("id, conversation_id, title, description, impact, details, resolved, approved")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return rowFromDb(data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowFromDb(data: any): PermissionRequestRow {
  return {
    id: data.id,
    conversationId: data.conversation_id ?? null,
    title: data.title,
    description: data.description,
    impact: data.impact,
    details: data.details,
    resolved: data.resolved,
    approved: data.approved,
  };
}

export async function resolvePermissionRequest(
  supabase: SupabaseServerClient,
  id: string,
  approved: boolean
): Promise<void> {
  const { error } = await supabase
    .from("permission_requests")
    .update({ resolved: true, approved })
    .eq("id", id);
  if (error) {
    console.error("Failed to resolve permission request:", error.message);
  }
}

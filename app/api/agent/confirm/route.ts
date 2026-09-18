import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { insertMessage } from "@/lib/data/conversations";
import { logActivity } from "@/lib/data/activity";
import { recordToolExecution } from "@/lib/data/tool-executions";
import { getPermissionRequest, resolvePermissionRequest } from "@/lib/data/permission-requests";
import { executeCalendarWrite, executeMessageSend } from "@/lib/agent/executors";

interface ConfirmRequestBody {
  permissionRequestId?: string;
  approved?: boolean;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub as string | undefined;

  if (authError || !userId) {
    return NextResponse.json({ error: "You're signed out. Refresh and sign in again." }, { status: 401 });
  }

  let body: ConfirmRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.permissionRequestId || typeof body.approved !== "boolean") {
    return NextResponse.json({ error: "Missing permissionRequestId or approved." }, { status: 400 });
  }

  // RLS scopes this lookup to the signed-in user — a foreign or
  // already-resolved id is treated the same as "not found"/"invalid".
  const permissionRequest = await getPermissionRequest(supabase, body.permissionRequestId);
  if (!permissionRequest) {
    return NextResponse.json({ error: "That request no longer exists." }, { status: 404 });
  }
  if (permissionRequest.resolved) {
    return NextResponse.json({ error: "That request was already resolved." }, { status: 409 });
  }

  const conversationId = permissionRequest.conversationId ?? undefined;
  await resolvePermissionRequest(supabase, permissionRequest.id, body.approved);

  if (!body.approved) {
    await logActivity(supabase, {
      userId,
      conversationId,
      action: `Cancelled: ${permissionRequest.description}`,
      tool: "Personal AI",
      status: "failed",
    });
    await recordToolExecution(supabase, {
      userId,
      conversationId,
      toolId: permissionRequest.details.toolId,
      toolName: permissionRequest.title,
      status: "cancelled",
      summary: "Cancelled by user",
      completed: true,
    });

    let agentMessage;
    if (conversationId) {
      agentMessage = await insertMessage(supabase, {
        conversationId,
        userId,
        role: "agent",
        content: "Cancelled — no action was taken.",
      });
    }
    return NextResponse.json({
      conversationId,
      message: agentMessage,
      outcome: { approved: false, resultMessage: "Cancelled — no action was taken." },
    });
  }

  // Approved: actually run the tool. Never report success unless the
  // tool itself reports completed.
  const { toolId, input } = permissionRequest.details;
  const result =
    toolId === "calendar.create"
      ? executeCalendarWrite("create", input.title ?? "the event")
      : toolId === "calendar.update"
      ? executeCalendarWrite("update", input.request ?? "the event")
      : toolId === "calendar.delete"
      ? executeCalendarWrite("delete", input.request ?? "the event")
      : toolId === "message.send"
      ? executeMessageSend(input.to ?? "the recipient")
      : { status: "failed" as const, message: "Unknown tool — nothing was executed.", toolName: "Personal AI" };

  await logActivity(supabase, {
    userId,
    conversationId,
    action: result.message,
    tool: result.toolName,
    status: result.status,
  });
  await recordToolExecution(supabase, {
    userId,
    conversationId,
    toolId,
    toolName: result.toolName,
    status: result.status === "completed" ? "completed" : "failed",
    summary: result.message,
    completed: true,
  });

  let agentMessage;
  if (conversationId) {
    agentMessage = await insertMessage(supabase, {
      conversationId,
      userId,
      role: "agent",
      content: result.message,
    });
  }

  return NextResponse.json({
    conversationId,
    message: agentMessage,
    outcome: { approved: true, resultMessage: result.message },
  });
}

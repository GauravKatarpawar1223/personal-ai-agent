import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createConversation, getConversation, insertMessage } from "@/lib/data/conversations";
import { logActivity } from "@/lib/data/activity";
import { recordToolExecution } from "@/lib/data/tool-executions";
import { createPermissionRequest } from "@/lib/data/permission-requests";
import { parseCommand } from "@/lib/agent/parser";
import { executeCalendarSearch, executeCalculator, executeDateTime } from "@/lib/agent/executors";
import { checkAvailability } from "@/lib/connectors/google/calendar";
import type { PermissionRequestImpact } from "@/lib/types";

const UNKNOWN_COMMAND_REPLY =
  "मैं अभी इस command ko execute nahi kar sakta. Try a supported command such as checking your calendar, creating an event, or using the calculator.";

interface CommandRequestBody {
  conversationId?: string;
  message?: string;
}

interface ConfirmationPayload {
  permissionRequestId: string;
  title: string;
  description: string;
  impact: PermissionRequestImpact;
  details: Record<string, string>;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub as string | undefined;

  if (authError || !userId) {
    return NextResponse.json({ error: "You're signed out. Refresh and sign in again." }, { status: 401 });
  }

  let body: CommandRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const userMessage = (body.message ?? "").trim();
  if (!userMessage) {
    return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  }

  // Resolve the conversation: reuse an existing one the user owns, or
  // create a new one titled from the first message.
  let conversationId = body.conversationId;
  if (conversationId) {
    const existing = await getConversation(supabase, conversationId);
    if (!existing) {
      return NextResponse.json({ error: "That conversation doesn't exist." }, { status: 404 });
    }
  } else {
    const conversation = await createConversation(supabase, userId, userMessage.slice(0, 60));
    conversationId = conversation.id;
  }

  try {
    await insertMessage(supabase, { conversationId, userId, role: "user", content: userMessage });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save your message." },
      { status: 500 }
    );
  }

  const command = parseCommand(userMessage, new Date());

  // ---- Unrecognized command: honest, graceful fallback. No LLM fallback. ----
  if (!command) {
    const agentMessage = await insertMessage(supabase, {
      conversationId,
      userId,
      role: "agent",
      content: UNKNOWN_COMMAND_REPLY,
    });
    await logActivity(supabase, {
      userId,
      conversationId,
      action: "Couldn't understand the command",
      tool: "Command Parser",
      status: "failed",
    });
    return NextResponse.json({ conversationId, message: agentMessage });
  }

  // ---- READ-level commands: execute immediately, no confirmation. ----
  if (command.intent === "calendar.search") {
    const result = await executeCalendarSearch(supabase, userId, command.date, command.dateLabel);
    return await respondImmediately(supabase, {
      userId,
      conversationId,
      toolId: "calendar.search",
      resultMessage: result.message,
      resultStatus: result.status,
      toolName: result.toolName,
    });
  }

  if (command.intent === "calculator") {
    const result = executeCalculator(command.expression);
    return await respondImmediately(supabase, {
      userId,
      conversationId,
      toolId: "calculator",
      resultMessage: result.message,
      resultStatus: result.status,
      toolName: result.toolName,
    });
  }

  if (command.intent === "date_time") {
    const result = executeDateTime();
    return await respondImmediately(supabase, {
      userId,
      conversationId,
      toolId: "date_time",
      resultMessage: result.message,
      resultStatus: result.status,
      toolName: result.toolName,
    });
  }

  // ---- Multi-step: check real availability first (if Calendar is
  // connected), then only prepare the event if the slot is actually
  // free. Never guesses when it can't check. ----
  if (command.intent === "calendar.conditional_create") {
    const availability = await checkAvailability(
      supabase,
      userId,
      command.date,
      command.hours,
      command.minutes,
      command.dateLabel
    );

    if (!availability.connected) {
      const reply =
        `I checked ${command.dateLabel} first before adding "${command.title}" at ${command.time}, but Google Calendar connection required. ` +
        `I won't add the event without being able to check your availability — connect Google Calendar, or ask me to add it directly.`;
      return await respondImmediately(supabase, {
        userId,
        conversationId,
        toolId: "calendar.conditional_create",
        resultMessage: reply,
        resultStatus: "failed",
        toolName: "Google Calendar",
      });
    }

    if (availability.free === null) {
      return await respondImmediately(supabase, {
        userId,
        conversationId,
        toolId: "calendar.conditional_create",
        resultMessage: availability.message ?? "Google Calendar returned an error while checking your availability.",
        resultStatus: "failed",
        toolName: "Google Calendar",
      });
    }

    if (!availability.free) {
      return await respondImmediately(supabase, {
        userId,
        conversationId,
        toolId: "calendar.conditional_create",
        resultMessage: `You're not free at ${command.time} on ${command.dateLabel} ("${availability.conflictSummary}" is already on your calendar), so I didn't add "${command.title}".`,
        resultStatus: "completed",
        toolName: "Google Calendar",
      });
    }

    // Free — prepare the event exactly like a normal calendar.create,
    // still requiring explicit confirmation before it's actually added.
    const display = { date: command.dateLabel, time: command.time, title: command.title };
    return await respondWithConfirmation(supabase, {
      userId,
      conversationId,
      toolId: "calendar.create",
      toolInput: {
        ...display,
        dateIso: command.date,
        hours: String(command.hours),
        minutes: String(command.minutes),
      },
      display,
      title: "Confirm calendar event",
      description: `You're free at ${command.time} on ${command.dateLabel}. Add "${command.title}"?`,
      impact: "booking",
      replyPrefix: `Good news — you're free then. I've prepared this calendar event:`,
    });
  }

  // ---- EXECUTE-level commands: prepare + require confirmation. ----
  if (command.intent === "calendar.create") {
    const display = { date: command.dateLabel, time: command.time, title: command.title };
    return await respondWithConfirmation(supabase, {
      userId,
      conversationId,
      toolId: "calendar.create",
      toolInput: {
        ...display,
        dateIso: command.date,
        hours: String(command.hours),
        minutes: String(command.minutes),
      },
      display,
      title: "Confirm calendar event",
      description: `Add "${command.title}" on ${command.dateLabel} at ${command.time}?`,
      impact: "booking",
      replyPrefix: "I've prepared this calendar event:",
    });
  }

  if (command.intent === "calendar.update" || command.intent === "calendar.delete") {
    const display = { date: command.dateLabel, request: command.raw };
    const verb = command.intent === "calendar.update" ? "update" : "delete";
    return await respondWithConfirmation(supabase, {
      userId,
      conversationId,
      toolId: command.intent,
      toolInput: { ...display, dateIso: command.date },
      display,
      title: `Confirm calendar ${verb}`,
      description: `${verb === "update" ? "Update" : "Delete"} an event on ${command.dateLabel}?`,
      impact: verb === "delete" ? "delete_data" : "booking",
      replyPrefix: `I've prepared this calendar ${verb}:`,
    });
  }

  if (command.intent === "message.prepare") {
    const display = { to: command.recipient, message: command.body };
    return await respondWithConfirmation(supabase, {
      userId,
      conversationId,
      toolId: "message.send",
      toolInput: display,
      display,
      title: "Confirm message",
      description: `Send this message to ${command.recipient}?`,
      impact: "send_message",
      replyPrefix: "I've prepared this message:",
    });
  }

  // Exhaustiveness guard — every ParsedCommand variant is handled above.
  return NextResponse.json({ error: "Unhandled command type." }, { status: 500 });
}

async function respondImmediately(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    userId: string;
    conversationId: string;
    toolId: string;
    resultMessage: string;
    resultStatus: "completed" | "failed";
    toolName: string;
  }
) {
  const agentMessage = await insertMessage(supabase, {
    conversationId: params.conversationId,
    userId: params.userId,
    role: "agent",
    content: params.resultMessage,
  });
  await logActivity(supabase, {
    userId: params.userId,
    conversationId: params.conversationId,
    action: params.resultMessage,
    tool: params.toolName,
    status: params.resultStatus,
  });
  await recordToolExecution(supabase, {
    userId: params.userId,
    conversationId: params.conversationId,
    toolId: params.toolId,
    toolName: params.toolName,
    status: params.resultStatus === "completed" ? "completed" : "failed",
    summary: params.resultMessage,
    completed: true,
  });
  return NextResponse.json({ conversationId: params.conversationId, message: agentMessage });
}

async function respondWithConfirmation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    userId: string;
    conversationId: string;
    toolId: string;
    toolInput: Record<string, string>;
    display: Record<string, string>;
    title: string;
    description: string;
    impact: PermissionRequestImpact;
    replyPrefix: string;
  }
) {
  const permissionRequest = await createPermissionRequest(supabase, {
    userId: params.userId,
    conversationId: params.conversationId,
    title: params.title,
    description: params.description,
    impact: params.impact,
    details: { display: params.display, toolId: params.toolId, input: params.toolInput },
  });

  const detailLines = Object.entries(params.display)
    .map(([k, v]) => `${k.charAt(0).toUpperCase()}${k.slice(1)}: ${v}`)
    .join("\n");
  const replyText = `${params.replyPrefix}\n${detailLines}`;

  const agentMessage = await insertMessage(supabase, {
    conversationId: params.conversationId,
    userId: params.userId,
    role: "agent",
    content: replyText,
  });

  await logActivity(supabase, {
    userId: params.userId,
    conversationId: params.conversationId,
    action: params.description,
    tool: "Personal AI",
    status: "waiting_for_approval",
  });
  await recordToolExecution(supabase, {
    userId: params.userId,
    conversationId: params.conversationId,
    toolId: params.toolId,
    toolName: params.title,
    status: "pending_approval",
    summary: params.description,
  });

  const confirmation: ConfirmationPayload = {
    permissionRequestId: permissionRequest.id,
    title: params.title,
    description: params.description,
    impact: params.impact,
    details: params.display,
  };

  return NextResponse.json({ conversationId: params.conversationId, message: agentMessage, confirmation });
}

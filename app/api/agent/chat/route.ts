import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createConversation,
  getConversation,
  insertMessage,
  listMessages,
} from "@/lib/data/conversations";
import { logActivity } from "@/lib/data/activity";
import { getActiveProvider } from "@/lib/ai";
import { AiProviderError } from "@/lib/ai/types";

const HISTORY_LIMIT = 20;
const SYSTEM_PROMPT =
  "You are the Personal AI Agent, a helpful assistant inside a personal AI workspace. Be concise and direct. The only connected tool you have is web search. If the user asks you to send an email, manage a calendar, or take another real-world action, say plainly that the relevant connector isn't connected yet and point them to the Connections page — never claim to have done it.";

interface ChatRequestBody {
  conversationId?: string;
  message?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub as string | undefined;

  if (authError || !userId) {
    return NextResponse.json(
      { error: "You're signed out. Refresh and sign in again." },
      { status: 401 }
    );
  }

  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const userMessage = (body.message ?? "").trim();
  if (!userMessage) {
    return NextResponse.json(
      { error: "Message can't be empty." },
      { status: 400 }
    );
  }

  const provider = getActiveProvider();

  if (!provider.isConfigured()) {
    return NextResponse.json(
      {
        error: `The AI provider isn't configured yet. Set up ${provider.displayName} on the server and redeploy.`,
      },
      { status: 501 }
    );
  }

  // Resolve the conversation: reuse an existing one the user owns, or
  // create a new one titled from the first message.
  let conversationId = body.conversationId;

  if (conversationId) {
    const existing = await getConversation(supabase, conversationId);

    if (!existing) {
      return NextResponse.json(
        { error: "That conversation doesn't exist." },
        { status: 404 }
      );
    }
  } else {
    const conversation = await createConversation(
      supabase,
      userId,
      userMessage.slice(0, 60)
    );

    conversationId = conversation.id;
  }

  try {
    await insertMessage(supabase, {
      conversationId,
      userId,
      role: "user",
      content: userMessage,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not save your message.",
      },
      { status: 500 }
    );
  }

  const history = await listMessages(
    supabase,
    conversationId,
    HISTORY_LIMIT
  );

  let reply;

  try {
    reply = await provider.generateReply({
      systemPrompt: SYSTEM_PROMPT,
      history: history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });
  } catch (err) {
    const providerError =
      err instanceof AiProviderError
        ? err
        : new AiProviderError(
            "The AI provider failed unexpectedly.",
            502
          );

    await logActivity(supabase, {
      userId,
      conversationId,
      action: `${provider.displayName} returned an error (${providerError.status})`,
      tool: "Personal AI",
      status: "failed",
    });

    return NextResponse.json(
      { error: providerError.message },
      { status: providerError.status }
    );
  }

  let agentMessage;

  try {
    agentMessage = await insertMessage(supabase, {
      conversationId,
      userId,
      role: "agent",
      content: reply.text,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not save the response.",
      },
      { status: 500 }
    );
  }

  await logActivity(supabase, {
    userId,
    conversationId,
    action: reply.usedWebSearch
      ? "Researched a question using web search"
      : "Answered a question",
    tool: reply.usedWebSearch ? "Web Browser" : "Personal AI",
    status: "completed",
  });

  return NextResponse.json({
    conversationId,
    message: agentMessage,
    usedWebSearch: reply.usedWebSearch,
  });
}

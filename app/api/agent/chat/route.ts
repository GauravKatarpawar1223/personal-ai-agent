import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createConversation,
  getConversation,
  insertMessage,
  listMessages,
} from "@/lib/data/conversations";
import { logActivity } from "@/lib/data/activity";

// Check https://ai.google.dev/gemini-api/docs for the current model list
// and the current Google Search grounding tool shape before relying on
// these in production — model names are dated identifiers Google revises
// over time.
const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GOOGLE_SEARCH_TOOL = { google_search: {} };
const HISTORY_LIMIT = 20;

interface GeminiPart {
  text?: string;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  groundingMetadata?: { webSearchQueries?: string[] };
}

interface ChatRequestBody {
  conversationId?: string;
  message?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub as string | undefined;

  if (authError || !userId) {
    return NextResponse.json({ error: "You're signed out. Refresh and sign in again." }, { status: 401 });
  }

  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const userMessage = (body.message ?? "").trim();
  if (!userMessage) {
    return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "The AI provider isn't configured yet. Set GEMINI_API_KEY on the server and redeploy.",
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
      return NextResponse.json({ error: "That conversation doesn't exist." }, { status: 404 });
    }
  } else {
    const conversation = await createConversation(supabase, userId, userMessage.slice(0, 60));
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
      { error: err instanceof Error ? err.message : "Could not save your message." },
      { status: 500 }
    );
  }

  const history = await listMessages(supabase, conversationId, HISTORY_LIMIT);
  const geminiContents = history.map((m) => ({
    role: m.role === "agent" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  let aiResponse: Response;
  try {
    aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: geminiContents,
          systemInstruction: {
            parts: [
              {
                text: "You are the Personal AI Agent, a helpful assistant inside a personal AI workspace. Be concise and direct. The only connected tool you have is web search. If the user asks you to send an email, manage a calendar, or take another real-world action, say plainly that the relevant connector isn't connected yet and point them to the Connections page — never claim to have done it.",
              },
            ],
          },
          tools: [GOOGLE_SEARCH_TOOL],
          generationConfig: { maxOutputTokens: 1024 },
        }),
      }
    );
  } catch {
    await logActivity(supabase, {
      userId,
      conversationId,
      action: "Couldn't reach the AI provider",
      tool: "Personal AI",
      status: "failed",
    });
    return NextResponse.json(
      { error: "Couldn't reach the AI provider. Check your connection and try again." },
      { status: 502 }
    );
  }

if (!aiResponse.ok) {
  await logActivity(supabase, {
    userId,
    conversationId,
    action: `AI provider returned an error (${aiResponse.status})`,
    tool: "Personal AI",
    status: "failed",
  });
  const rawDetail = await aiResponse.text().catch(() => "");
let geminiMessage = "";

try {
  const parsed = JSON.parse(rawDetail) as {
    error?: { message?: string };
  };
  geminiMessage = parsed.error?.message ?? "";
} catch {
  // Not JSON — fall back to the raw body below.
}

return NextResponse.json(
  {
    error: `The AI provider returned an error (${aiResponse.status}): ${
      geminiMessage || rawDetail.slice(0, 300) || "no further detail"
    }`,
  },
  { status: 502 }
);
}

  const data = (await aiResponse.json()) as { candidates?: GeminiCandidate[] };
  const candidate = data.candidates?.[0];
  const replyText = (candidate?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  const usedWebSearch = Boolean(candidate?.groundingMetadata?.webSearchQueries?.length);

  if (!replyText) {
    await logActivity(supabase, {
      userId,
      conversationId,
      action: "AI returned an empty response",
      tool: "Personal AI",
      status: "failed",
    });
    return NextResponse.json({ error: "The agent didn't return a response. Try rephrasing." }, { status: 502 });
  }

  let agentMessage;
  try {
    agentMessage = await insertMessage(supabase, {
      conversationId,
      userId,
      role: "agent",
      content: replyText,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save the response." },
      { status: 500 }
    );
  }

  await logActivity(supabase, {
    userId,
    conversationId,
    action: usedWebSearch ? "Researched a question using web search" : "Answered a question",
    tool: usedWebSearch ? "Web Browser" : "Personal AI",
    status: "completed",
  });

  return NextResponse.json({
    conversationId,
    message: agentMessage,
    usedWebSearch,
  });
}

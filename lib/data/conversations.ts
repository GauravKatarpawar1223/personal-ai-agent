import type { createClient } from "@/lib/supabase/server";
import type { Conversation, Message, MessageRole } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface ConversationRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

/** Conversations for the sidebar, most recently active first. RLS scopes
 *  this to the signed-in user automatically. */
export async function listConversations(supabase: SupabaseServerClient): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error || !data) return [];

  return (data as ConversationRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messageCount: 0, // not needed for the sidebar; avoided an extra count query per row
  }));
}

export async function getConversation(
  supabase: SupabaseServerClient,
  conversationId: string
): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as ConversationRow;
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messageCount: 0,
  };
}

export async function createConversation(
  supabase: SupabaseServerClient,
  userId: string,
  title: string
): Promise<Conversation> {
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: userId, title: title || "New conversation" })
    .select("id, title, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create the conversation.");
  }

  const row = data as ConversationRow;
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messageCount: 0,
  };
}

export async function listMessages(
  supabase: SupabaseServerClient,
  conversationId: string,
  limit = 50
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  return (data as MessageRow[]).map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }));
}

export async function insertMessage(
  supabase: SupabaseServerClient,
  params: { conversationId: string; userId: string; role: MessageRole; content: string }
): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: params.conversationId,
      user_id: params.userId,
      role: params.role,
      content: params.content,
    })
    .select("id, conversation_id, role, content, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not save the message.");
  }

  const row = data as MessageRow;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

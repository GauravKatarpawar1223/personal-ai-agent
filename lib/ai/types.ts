import type { MessageRole } from "@/lib/types";

/** One turn of conversation history, in the app's own role vocabulary
 *  ("user" | "agent" | "system") — providers translate this into
 *  whatever role names their own API expects. */
export interface AiHistoryMessage {
  role: MessageRole;
  content: string;
}

export interface AiReply {
  text: string;
  /** True if the provider used a web-search-style tool to answer. */
  usedWebSearch: boolean;
}

/**
 * Thrown by a provider when its API call fails. `message` is already
 * safe to show the user — providers must strip out API keys/secrets
 * before putting anything here. `status` is an HTTP-ish status the
 * route can log and map to a response code (e.g. 429 for a rate limit,
 * 502 for anything else).
 */
export class AiProviderError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "AiProviderError";
    this.status = status;
  }
}

/**
 * What the agent route needs from an AI provider. A provider is a thin
 * adapter around one model API — it doesn't know about Supabase,
 * conversations, or activity logging; the route handles all of that the
 * same way regardless of which provider answered.
 */
export interface AiProvider {
  /** Stable id, e.g. "gemini" — used for the AI_PROVIDER env var and by
   *  lib/data/connections.ts to report whether AI is configured. */
  readonly id: string;
  /** Human-readable name for error messages and activity log entries. */
  readonly displayName: string;
  /** True if this provider has what it needs (e.g. an API key) to run. */
  isConfigured(): boolean;
  /** Runs one turn: system prompt + full history in, a reply out.
   *  Throws AiProviderError on any failure — never returns a fake reply. */
  generateReply(params: { systemPrompt: string; history: AiHistoryMessage[] }): Promise<AiReply>;
}

import type { AiProvider } from "@/lib/ai/types";
import { geminiProvider } from "@/lib/ai/gemini-provider";

/**
 * Every provider the app knows how to run, keyed by id. Adding a second
 * provider later means writing a new file like gemini-provider.ts and
 * adding one line here — app/api/agent/chat/route.ts and
 * lib/data/connections.ts never need to change.
 */
const PROVIDERS: Record<string, AiProvider> = {
  [geminiProvider.id]: geminiProvider,
};

const DEFAULT_PROVIDER_ID = "gemini";

/** Which provider is active, chosen by the optional AI_PROVIDER env var
 *  (defaults to Gemini — the only one implemented so far). */
export function getActiveProvider(): AiProvider {
  const requestedId = process.env.AI_PROVIDER?.trim() || DEFAULT_PROVIDER_ID;
  return PROVIDERS[requestedId] ?? geminiProvider;
}

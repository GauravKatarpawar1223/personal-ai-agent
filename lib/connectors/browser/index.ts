import type { ConnectorDefinition } from "@/lib/connectors/types";

/**
 * Web Browser connector — read-only web search, implemented in Phase 2.
 *
 * Unlike the other connectors, this doesn't need per-user OAuth: it runs
 * through the model provider's own server-side web search tool (wired up
 * in app/api/agent/chat/route.ts) using the server-only GEMINI_API_KEY.
 * There is nothing for an individual user to "connect" — it's either
 * configured for the whole app or it isn't — so lib/data/connections.ts
 * treats this one specially instead of looking for a per-user row.
 *
 * Future write access (form filling, navigation) would still need its
 * own guarded PREPARE/EXECUTE flow before this connector could do more
 * than read.
 */
export const browserConnector: ConnectorDefinition = {
  id: "browser",
  name: "Web Browser",
  category: "Browser",
  description: "Search and read pages on the web, used automatically when the agent needs current information.",
  implemented: true,
};

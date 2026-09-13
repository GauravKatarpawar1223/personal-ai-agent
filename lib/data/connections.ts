import { CONNECTOR_CATALOG } from "@/lib/connectors/catalog";
import type { Connection } from "@/lib/types";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Real connection status for the current user: the catalog defines what
 * *could* be connected, and the `connections` table (RLS-scoped to
 * auth.uid()) says what actually is. A provider with no row is
 * "not_connected" if its connector is implemented, or "coming_soon" if
 * it isn't — there is no "fake connected" state.
 */
export async function getConnectionsForUser(
  supabase: SupabaseServerClient
): Promise<Connection[]> {
  const { data: rows, error } = await supabase
    .from("connections")
    .select("id, provider_id, connected_at, scopes");

  if (error) {
    // Fail closed: if we can't confirm what's connected, show nothing as
    // connected rather than guessing.
    return buildFromCatalog(new Map<string, ConnectedInfo>());
  }

  const connectedByProvider = new Map<string, ConnectedInfo>(
    (rows ?? []).map((row) => [
      row.provider_id as string,
      { connectedAt: row.connected_at as string, scopes: (row.scopes as string[] | null) ?? undefined },
    ])
  );

  return buildFromCatalog(connectedByProvider);
}

interface ConnectedInfo {
  connectedAt: string;
  scopes?: string[];
}

function buildFromCatalog(connectedByProvider: Map<string, ConnectedInfo>): Connection[] {
  return CONNECTOR_CATALOG.map((entry) => {
    // The browser/web-search tool has no per-user OAuth step — it's
    // configured at the app level (GEMINI_API_KEY) or not at all.
    if (entry.providerId === "browser") {
      return {
        id: `conn_${entry.providerId}`,
        providerId: entry.providerId,
        name: entry.name,
        category: entry.category,
        description: entry.description,
        status: process.env.GEMINI_API_KEY ? "connected" : "not_connected",
      } satisfies Connection;
    }

    const connected = connectedByProvider.get(entry.providerId);
    return {
      id: `conn_${entry.providerId}`,
      providerId: entry.providerId,
      name: entry.name,
      category: entry.category,
      description: entry.description,
      status: connected ? "connected" : entry.connector.implemented ? "not_connected" : "coming_soon",
      connectedAt: connected?.connectedAt,
      scopes: connected?.scopes,
    } satisfies Connection;
  });
}

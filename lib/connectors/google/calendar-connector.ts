import type { ConnectorDefinition } from "@/lib/connectors/types";
import { GOOGLE_CALENDAR_SCOPES } from "@/lib/connectors/google/oauth-client";

/**
 * Google Calendar has its own real OAuth flow (see
 * /app/api/connections/google/calendar/{authorize,callback}) and its
 * own row in the `connections` table, independent of Gmail/Drive/Tasks
 * — which still share the generic, unimplemented `googleConnector` in
 * ./index.ts. Connecting Calendar must never mark those as connected;
 * see lib/connectors/catalog.ts, where each is wired to its own
 * connector object for exactly this reason.
 */
export const googleCalendarConnector: ConnectorDefinition = {
  id: "google_calendar",
  name: "Google Calendar",
  category: "Google Workspace",
  description: "Check availability and schedule events.",
  implemented: true,
  scopes: GOOGLE_CALENDAR_SCOPES,
};

import type { ConnectorDefinition } from "@/lib/connectors/types";

/**
 * Google Workspace connector — Gmail, Calendar, Drive, Tasks.
 *
 * Not implemented. This module intentionally exports no request logic,
 * no client construction, and no tokens. When this connector is built,
 * OAuth exchange and API calls must happen in server-side route handlers
 * or server actions — never in client components — using the
 * GOOGLE_OAUTH_* variables documented in .env.example.
 */
export const googleConnector: ConnectorDefinition = {
  id: "google_workspace",
  name: "Google Workspace",
  category: "Google Workspace",
  description: "Gmail, Calendar, Drive, and Tasks.",
  implemented: false,
  scopes: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/tasks",
  ],
};

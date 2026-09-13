import { googleConnector } from "@/lib/connectors/google";
import { githubConnector } from "@/lib/connectors/github";
import { browserConnector } from "@/lib/connectors/browser";
import type { ConnectorDefinition } from "@/lib/connectors/types";

/**
 * App-level metadata for every provider that could appear on the
 * Connections page — not user data, so it isn't stored in the database.
 * Whether a given user has actually connected one of these lives in the
 * `connections` table (see lib/data/connections.ts, which merges the two).
 *
 * Gmail, Calendar, Drive, and Tasks share one OAuth connector
 * (googleConnector) but are listed separately here because a user
 * connects/disconnects them individually in the UI.
 */
export interface CatalogEntry {
  providerId: string;
  name: string;
  category: "Google Workspace" | "Communication" | "Work" | "Browser";
  description: string;
  connector: ConnectorDefinition;
}

export const CONNECTOR_CATALOG: CatalogEntry[] = [
  {
    providerId: "gmail",
    name: "Gmail",
    category: "Google Workspace",
    description: "Read, draft, and send email on your behalf.",
    connector: googleConnector,
  },
  {
    providerId: "google_calendar",
    name: "Google Calendar",
    category: "Google Workspace",
    description: "Check availability and schedule events.",
    connector: googleConnector,
  },
  {
    providerId: "google_drive",
    name: "Google Drive",
    category: "Google Workspace",
    description: "Find and work with your files.",
    connector: googleConnector,
  },
  {
    providerId: "google_tasks",
    name: "Google Tasks",
    category: "Google Workspace",
    description: "Create and track tasks and to-dos.",
    connector: googleConnector,
  },
  {
    providerId: "whatsapp",
    name: "WhatsApp",
    category: "Communication",
    description: "Send and read messages on your behalf.",
    connector: { id: "whatsapp", name: "WhatsApp", category: "Communication", description: "", implemented: false },
  },
  {
    providerId: "telegram",
    name: "Telegram",
    category: "Communication",
    description: "Send and read messages on your behalf.",
    connector: { id: "telegram", name: "Telegram", category: "Communication", description: "", implemented: false },
  },
  {
    providerId: "github",
    name: "GitHub",
    category: "Work",
    description: "Work with repositories, issues, and pull requests.",
    connector: githubConnector,
  },
  {
    providerId: "vercel",
    name: "Vercel",
    category: "Work",
    description: "Check deployments and project status.",
    connector: { id: "vercel", name: "Vercel", category: "Work", description: "", implemented: false },
  },
  {
    providerId: "browser",
    name: "Web Browser",
    category: "Browser",
    description: "Search and read pages on the web (used automatically by the agent — see Activity).",
    connector: browserConnector,
  },
];

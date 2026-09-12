import type { ActivityLog, Connection, Conversation } from "@/lib/types";

/**
 * Static demo data for Phase 1. Shaped exactly like the rows these
 * features will read from Supabase later (see lib/types.ts), so the
 * components consuming this data don't need to change — only the
 * fetching layer does.
 */

export const DEMO_CONNECTIONS: Connection[] = [
  {
    id: "conn_gmail",
    providerId: "gmail",
    name: "Gmail",
    category: "Google Workspace",
    description: "Read, draft, and send email on your behalf.",
    status: "not_connected",
  },
  {
    id: "conn_calendar",
    providerId: "google_calendar",
    name: "Google Calendar",
    category: "Google Workspace",
    description: "Check availability and schedule events.",
    status: "not_connected",
  },
  {
    id: "conn_drive",
    providerId: "google_drive",
    name: "Google Drive",
    category: "Google Workspace",
    description: "Find and work with your files.",
    status: "not_connected",
  },
  {
    id: "conn_tasks",
    providerId: "google_tasks",
    name: "Google Tasks",
    category: "Google Workspace",
    description: "Create and track tasks and to-dos.",
    status: "not_connected",
  },
  {
    id: "conn_whatsapp",
    providerId: "whatsapp",
    name: "WhatsApp",
    category: "Communication",
    description: "Send and read messages on your behalf.",
    status: "coming_soon",
  },
  {
    id: "conn_telegram",
    providerId: "telegram",
    name: "Telegram",
    category: "Communication",
    description: "Send and read messages on your behalf.",
    status: "coming_soon",
  },
  {
    id: "conn_github",
    providerId: "github",
    name: "GitHub",
    category: "Work",
    description: "Work with repositories, issues, and pull requests.",
    status: "coming_soon",
  },
  {
    id: "conn_vercel",
    providerId: "vercel",
    name: "Vercel",
    category: "Work",
    description: "Check deployments and project status.",
    status: "coming_soon",
  },
  {
    id: "conn_browser",
    providerId: "browser",
    name: "Web Browser",
    category: "Browser",
    description: "Search and read pages on the web.",
    status: "coming_soon",
  },
];

export const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: "conv_1",
    title: "Planning next week's travel",
    createdAt: "2026-09-08T09:12:00.000Z",
    updatedAt: "2026-09-08T09:20:00.000Z",
    messageCount: 6,
  },
  {
    id: "conv_2",
    title: "Researching standing desks",
    createdAt: "2026-09-07T18:40:00.000Z",
    updatedAt: "2026-09-07T18:52:00.000Z",
    messageCount: 4,
  },
  {
    id: "conv_3",
    title: "Weekly task cleanup",
    createdAt: "2026-09-05T08:05:00.000Z",
    updatedAt: "2026-09-05T08:11:00.000Z",
    messageCount: 3,
  },
];

export const DEMO_ACTIVITY: ActivityLog[] = [
  {
    id: "act_1",
    action: "Researched standing desks under $400",
    tool: "Web Browser",
    status: "completed",
    timestamp: "2026-09-07T18:52:00.000Z",
    isDemo: true,
  },
  {
    id: "act_2",
    action: "Prepared an email to the design team",
    tool: "Gmail",
    status: "waiting_for_approval",
    timestamp: "2026-09-07T14:10:00.000Z",
    isDemo: true,
  },
  {
    id: "act_3",
    action: "Created a task: Renew passport",
    tool: "Google Tasks",
    status: "completed",
    timestamp: "2026-09-06T11:32:00.000Z",
    isDemo: true,
  },
  {
    id: "act_4",
    action: "Checked calendar for open time Thursday",
    tool: "Google Calendar",
    status: "completed",
    timestamp: "2026-09-05T08:11:00.000Z",
    isDemo: true,
  },
  {
    id: "act_5",
    action: "Looked up flight options for Lisbon",
    tool: "Web Browser",
    status: "failed",
    timestamp: "2026-09-04T20:03:00.000Z",
    isDemo: true,
  },
  {
    id: "act_6",
    action: "Drafting a summary of quarterly notes",
    tool: "Google Drive",
    status: "in_progress",
    timestamp: "2026-09-08T09:20:00.000Z",
    isDemo: true,
  },
];

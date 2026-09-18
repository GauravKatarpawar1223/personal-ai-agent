import type { Tool } from "@/lib/types";

/**
 * Tool registry
 * -------------
 * Each tool declares what it needs (inputSchema), how sensitive it is
 * (permissionLevel), and which connector provides it (connectorId).
 * `available: true` means the tool has a real execute function wired up
 * (see /lib/agent/executors.ts and /app/api/agent/command/route.ts) —
 * it does NOT mean every dependency it needs is connected. The
 * calendar.* tools, for example, are real and deterministic, but
 * honestly report "Google Calendar connection required" until that
 * connector (/lib/connectors/google) actually exists.
 */
export const TOOL_REGISTRY: Tool[] = [
  {
    id: "calendar.search",
    name: "Check calendar",
    description: "Look up what's on your calendar for a given date.",
    connectorId: "google_calendar",
    permissionLevel: "read",
    inputSchema: { date: "string" },
    available: true,
  },
  {
    id: "calendar.create",
    name: "Create calendar event",
    description: "Add a new event to your calendar.",
    connectorId: "google_calendar",
    permissionLevel: "execute",
    inputSchema: { date: "string", time: "string", title: "string" },
    available: true,
  },
  {
    id: "calendar.update",
    name: "Update calendar event",
    description: "Change an existing calendar event.",
    connectorId: "google_calendar",
    permissionLevel: "execute",
    inputSchema: { date: "string", request: "string" },
    available: true,
  },
  {
    id: "calendar.delete",
    name: "Delete calendar event",
    description: "Remove an event from your calendar.",
    connectorId: "google_calendar",
    permissionLevel: "execute",
    inputSchema: { date: "string", request: "string" },
    available: true,
  },
  {
    id: "calculator",
    name: "Calculator",
    description: "Evaluate an arithmetic expression.",
    connectorId: "browser",
    permissionLevel: "read",
    inputSchema: { expression: "string" },
    available: true,
  },
  {
    id: "date_time",
    name: "Current date & time",
    description: "Look up the current server date and time.",
    connectorId: "browser",
    permissionLevel: "read",
    inputSchema: {},
    available: true,
  },
  {
    id: "gmail.draft_email",
    name: "Draft an email",
    description: "Prepare an email for your review.",
    connectorId: "gmail",
    permissionLevel: "prepare",
    inputSchema: { to: "string", subject: "string", body: "string" },
    available: false,
  },
  {
    id: "gmail.send_email",
    name: "Send an email",
    description: "Send an email on your behalf.",
    connectorId: "gmail",
    permissionLevel: "execute",
    inputSchema: { to: "string", subject: "string", body: "string" },
    available: false,
  },
  {
    id: "tasks.create_task",
    name: "Create a task",
    description: "Add an item to your task list.",
    connectorId: "google_tasks",
    permissionLevel: "prepare",
    inputSchema: { title: "string", due: "string" },
    available: false,
  },
  {
    id: "message.prepare",
    name: "Prepare a message",
    description: "Draft a message to someone, ready for your approval.",
    connectorId: "whatsapp",
    permissionLevel: "prepare",
    inputSchema: { recipient: "string", body: "string" },
    available: true,
  },
  {
    id: "message.send",
    name: "Send a message",
    description: "Send a prepared message on your behalf.",
    connectorId: "whatsapp",
    permissionLevel: "execute",
    inputSchema: { recipient: "string", body: "string" },
    available: true,
  },
  {
    id: "web.research",
    name: "Research a topic",
    description: "Search and summarize information from the web.",
    connectorId: "browser",
    permissionLevel: "read",
    inputSchema: { query: "string" },
    // Real when the AI provider is active (see /lib/ai) — invoked
    // automatically by the model's own web search tool inside
    // /app/api/agent/chat/route.ts. Phase 3's deterministic command
    // route does not call this.
    available: true,
  },
];

export function getToolById(id: string): Tool | undefined {
  return TOOL_REGISTRY.find((tool) => tool.id === id);
}

import type { Tool } from "@/lib/types";

/**
 * Tool registry
 * -------------
 * This is the shape future tools will be registered in. Each tool
 * declares what it needs (inputSchema), how sensitive it is
 * (permissionLevel), and which connector provides it (connectorId).
 *
 * None of these tools are wired to a real `execute` function yet —
 * that arrives with each connector in /lib/connectors. Phase 1 only
 * needs the catalog shape so the UI (quick actions, AgentAction,
 * ConfirmationCard) has something real to render against.
 */
export const TOOL_REGISTRY: Tool[] = [
  {
    id: "calendar.find_time",
    name: "Find available time",
    description: "Look through your calendar for open slots.",
    connectorId: "google_calendar",
    permissionLevel: "read",
    inputSchema: { rangeStart: "string", rangeEnd: "string", durationMinutes: "number" },
    available: false,
  },
  {
    id: "calendar.create_event",
    name: "Create calendar event",
    description: "Add a new event to your calendar.",
    connectorId: "google_calendar",
    permissionLevel: "execute",
    inputSchema: { title: "string", start: "string", end: "string" },
    available: false,
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
    id: "web.research",
    name: "Research a topic",
    description: "Search and summarize information from the web.",
    connectorId: "browser",
    permissionLevel: "read",
    inputSchema: { query: "string" },
    available: false,
  },
];

export function getToolById(id: string): Tool | undefined {
  return TOOL_REGISTRY.find((tool) => tool.id === id);
}

/**
 * Core data model for Personal AI Agent.
 *
 * These types describe the shape of the product's data whether it is
 * currently backed by in-memory demo state (Phase 1) or, later, by
 * Supabase tables. Keep this file the single source of truth for shape —
 * UI components and the demo data in lib/demo-data.ts both import from here
 * so the eventual swap to real persistence only touches data-fetching code,
 * never component code.
 */

export type ID = string;

export type ThemePreference = "light" | "dark" | "system";

export type ResponseStyle = "concise" | "balanced" | "detailed";

/** Coarse-grained capability level a tool can request. UI uses this to
 *  decide whether an action can run silently or needs a ConfirmationCard. */
export type PermissionLevel = "read" | "prepare" | "execute";

export interface User {
  id: ID;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
}

export type ConnectionStatus = "connected" | "not_connected" | "coming_soon";

export interface Connection {
  id: ID;
  providerId: string;
  name: string;
  category: "Google Workspace" | "Communication" | "Work" | "Browser";
  description: string;
  status: ConnectionStatus;
  connectedAt?: string;
  scopes?: string[];
}

/** Describes a callable capability an agent could use. Phase 1 defines the
 *  shape only — `execute` is intentionally left unimplemented until a real
 *  connector is wired up server-side. */
export interface Tool {
  id: ID;
  name: string;
  description: string;
  connectorId: string;
  permissionLevel: PermissionLevel;
  inputSchema: Record<string, unknown>;
  available: boolean;
}

export type ToolExecutionStatus =
  | "pending_approval"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled";

export interface ToolExecution {
  id: ID;
  toolId: ID;
  toolName: string;
  status: ToolExecutionStatus;
  startedAt: string;
  completedAt?: string;
  summary: string;
}

export type MessageRole = "user" | "agent" | "system";

export interface Message {
  id: ID;
  conversationId: ID;
  role: MessageRole;
  content: string;
  createdAt: string;
  actions?: AgentActionStep[];
}

export interface Conversation {
  id: ID;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export type AgentActionStepStatus = "pending" | "active" | "done" | "failed";

export interface AgentActionStep {
  id: ID;
  label: string;
  status: AgentActionStepStatus;
}

export type AgentRunStatus =
  | "understanding"
  | "planning"
  | "using_tool"
  | "waiting_for_approval"
  | "completed"
  | "failed";

export interface AgentRun {
  id: ID;
  conversationId: ID;
  status: AgentRunStatus;
  steps: AgentActionStep[];
  isDemo: boolean;
}

export type ActivityStatus =
  | "completed"
  | "waiting_for_approval"
  | "failed"
  | "in_progress";

export interface ActivityLog {
  id: ID;
  action: string;
  tool: string;
  status: ActivityStatus;
  timestamp: string;
  isDemo: boolean;
}

export type PermissionRequestImpact =
  | "send_message"
  | "purchase"
  | "booking"
  | "delete_data"
  | "account_change"
  | "other";

export interface PermissionRequest {
  id: ID;
  title: string;
  description: string;
  impact: PermissionRequestImpact;
  details: Record<string, string>;
  createdAt: string;
  resolved: boolean;
  approved?: boolean;
}

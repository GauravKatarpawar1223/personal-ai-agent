/**
 * Contract every connector module implements. Each connector lives in its
 * own folder (e.g. /lib/connectors/google) and independently exports a
 * ConnectorDefinition plus whatever server-side auth/request helpers it
 * needs. Nothing in this file talks to a network — it just standardizes
 * the shape so the Connections page and the agent's tool registry can
 * treat every provider the same way.
 */
export interface ConnectorDefinition {
  id: string;
  name: string;
  category: "Google Workspace" | "Communication" | "Work" | "Browser";
  description: string;
  /** Whether this connector has a real implementation behind it yet. */
  implemented: boolean;
  /** OAuth scopes this connector will request once implemented. */
  scopes?: string[];
}

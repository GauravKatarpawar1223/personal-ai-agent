import type { ConnectorDefinition } from "@/lib/connectors/types";

/** GitHub connector — not implemented yet. See google/index.ts for the
 *  pattern every connector follows once it's built. */
export const githubConnector: ConnectorDefinition = {
  id: "github",
  name: "GitHub",
  category: "Work",
  description: "Repositories, issues, and pull requests.",
  implemented: false,
  scopes: ["repo", "read:org"],
};

import type { ConnectorDefinition } from "@/lib/connectors/types";

/** Web Browser connector — not implemented yet. Will eventually give the
 *  agent read access to pages for research, and later, guarded write
 *  access (form filling, navigation) once PREPARE/EXECUTE flows exist. */
export const browserConnector: ConnectorDefinition = {
  id: "browser",
  name: "Web Browser",
  category: "Browser",
  description: "Search and read pages on the web.",
  implemented: false,
};

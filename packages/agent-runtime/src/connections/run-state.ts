/**
 * Per-run state for Eve-style progressive disclosure: which qualified MCP
 * tools are callable and which installation scopes them.
 */
export class ConnectionRunState {
  readonly activatedQualifiedTools = new Set<string>();
  /** connection id → installation id chosen by the latest connection_search. */
  readonly installationByConnection = new Map<string, string>();

  activateFromSearch(
    tools: Array<{
      qualifiedName: string;
      connection: string;
      installationId: string | null;
    }>,
  ): void {
    for (const hit of tools) {
      this.activatedQualifiedTools.add(hit.qualifiedName);
      if (hit.installationId) {
        this.installationByConnection.set(hit.connection, hit.installationId);
      }
    }
  }

  getInstallationId(connectionId: string): string | null {
    return this.installationByConnection.get(connectionId) ?? null;
  }
}

export const CONNECTION_SEARCH_TOOL = "connection_search";
export const REQUEST_CONNECTION_TOOL = "request_connection";

/** SSOTA in-process tools always available alongside connection_search. */
export const ALWAYS_ACTIVE_TOOL_NAMES = [
  "query_nodes",
  "get_node",
  "create_node",
  "update_node",
  "create_edge",
  "traverse_edges",
  "get_task",
  "query_tasks",
  "spawn_task",
  "complete_task",
  "block_task",
  "request_approval",
  "read_page_definition",
  "write_page_definition",
  CONNECTION_SEARCH_TOOL,
  REQUEST_CONNECTION_TOOL,
] as const;

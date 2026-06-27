/**
 * Per-run state for MCP connection tools: installation scope chosen by search.
 */
import type { CompactArgsSchema } from "./mcp-tool-schema.js";

/**
 * Plain, JSON-serializable form of {@link ConnectionRunState}. WorkflowAgent
 * carries this in `runtimeContext` and re-hydrates a {@link ConnectionRunState}
 * inside each tool step (live `Map`s cannot cross workflow step boundaries);
 * `prepareStep` merges new `connection_search` hits back into the snapshot.
 */
export interface ConnectionRunStateSnapshot {
  installationByConnection: Record<string, string>;
  argsSchemaByQualifiedName: Record<string, CompactArgsSchema>;
}

export class ConnectionRunState {
  /** connection id → installation id chosen by the latest connection_search. */
  readonly installationByConnection = new Map<string, string>();
  /** qualified tool name → compact args schema from the latest connection_search. */
  readonly argsSchemaByQualifiedName = new Map<string, CompactArgsSchema>();

  /** Rebuild a run state from its serializable snapshot (WorkflowAgent steps). */
  static fromSnapshot(
    snapshot: ConnectionRunStateSnapshot | undefined,
  ): ConnectionRunState {
    const state = new ConnectionRunState();
    if (!snapshot) return state;
    for (const [conn, inst] of Object.entries(
      snapshot.installationByConnection,
    )) {
      state.installationByConnection.set(conn, inst);
    }
    for (const [name, schema] of Object.entries(
      snapshot.argsSchemaByQualifiedName,
    )) {
      state.argsSchemaByQualifiedName.set(name, schema);
    }
    return state;
  }

  /** Serializable view for `runtimeContext` / `toolsContext` transport. */
  toSnapshot(): ConnectionRunStateSnapshot {
    return {
      installationByConnection: Object.fromEntries(
        this.installationByConnection,
      ),
      argsSchemaByQualifiedName: Object.fromEntries(
        this.argsSchemaByQualifiedName,
      ),
    };
  }

  recordInstallations(
    hits: Array<{
      connection: string;
      installationId: string | null;
      qualifiedName?: string;
      argsSchema?: CompactArgsSchema;
    }>,
  ): void {
    for (const hit of hits) {
      if (hit.installationId) {
        this.installationByConnection.set(hit.connection, hit.installationId);
      }
      if (hit.qualifiedName && hit.argsSchema) {
        this.argsSchemaByQualifiedName.set(hit.qualifiedName, hit.argsSchema);
      }
    }
  }

  getInstallationId(connectionId: string): string | null {
    return this.installationByConnection.get(connectionId) ?? null;
  }

  getArgsSchema(qualifiedName: string): CompactArgsSchema | undefined {
    return this.argsSchemaByQualifiedName.get(qualifiedName);
  }
}

export const CONNECTION_SEARCH_TOOL = "connection_search";
export const CONNECTION_CALL_TOOL = "connection_call";
export const REQUEST_CONNECTION_TOOL = "request_connection";

/** SSOTA in-process tools always available alongside connection facade tools. */
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
  CONNECTION_CALL_TOOL,
  REQUEST_CONNECTION_TOOL,
] as const;

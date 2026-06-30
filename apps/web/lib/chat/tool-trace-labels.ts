/** i18n keys under `chat.toolTrace.labels.*` for minimal agent trace rows. */
export const TOOL_TRACE_LABEL_KEYS = {
  list_node_types: "listNodeTypes",
  list_edge_types: "listEdgeTypes",
  search_catalog: "searchCatalog",
  get_node_type: "getNodeType",
  get_edge_type: "getEdgeType",
  query_nodes: "queryNodes",
  get_node: "getNode",
  traverse_edges: "traverseEdges",
  create_node: "createNode",
  update_node: "updateNode",
  create_edge: "createEdge",
  get_task: "getTask",
  query_tasks: "queryTasks",
  spawn_task: "spawnTask",
  update_task: "updateTask",
  complete_task: "completeTask",
  block_task: "blockTask",
  request_approval: "requestApproval",
  list_page_components: "listPageComponents",
  get_page_component: "getPageComponent",
  create_page: "createPage",
  update_page: "updatePage",
  read_page: "readPage",
  list_pages: "listPages",
  list_agent_definitions: "listAgentDefinitions",
  get_agent_instruction: "getAgentInstruction",
  write_agent_definition: "writeAgentDefinition",
  delegate: "delegate",
  list_script_tools: "listScriptTools",
  describe_script_tool: "describeScriptTool",
  run_script_tool: "runScriptTool",
  sandbox_exec: "sandboxExec",
  sandbox_write_file: "sandboxWriteFile",
  sandbox_read_file: "sandboxReadFile",
  COMPOSIO_SEARCH_TOOLS: "composioSearchTools",
  COMPOSIO_GET_TOOL_SCHEMAS: "composioGetToolSchemas",
  COMPOSIO_MULTI_EXECUTE_TOOL: "composioMultiExecuteTool",
  COMPOSIO_MANAGE_CONNECTIONS: "composioManageConnections",
  connection_search: "connectionSearch",
  connection_call: "connectionCall",
} as const satisfies Record<string, string>;

export type ToolTraceLabelKey =
  (typeof TOOL_TRACE_LABEL_KEYS)[keyof typeof TOOL_TRACE_LABEL_KEYS];

const LABEL_KEY_BY_TOOL = TOOL_TRACE_LABEL_KEYS;

export function getToolTraceLabelKey(toolName: string): string | null {
  return LABEL_KEY_BY_TOOL[toolName as keyof typeof LABEL_KEY_BY_TOOL] ?? null;
}

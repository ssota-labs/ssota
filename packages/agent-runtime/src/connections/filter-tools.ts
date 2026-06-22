import type { McpConnectionToolFilter } from "./define-mcp-connection.js";

export interface McpToolListing {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

export function filterMcpTools(
  tools: McpToolListing[],
  filter?: McpConnectionToolFilter,
): McpToolListing[] {
  if (!filter) return tools;
  let result = tools;
  if (filter.allow && filter.allow.length > 0) {
    const allowed = new Set(filter.allow);
    result = result.filter((t) => allowed.has(t.name));
  }
  if (filter.block && filter.block.length > 0) {
    const blocked = new Set(filter.block);
    result = result.filter((t) => !blocked.has(t.name));
  }
  return result;
}

import type { McpConnectionDef } from "./define-mcp-connection.js";
import { filterMcpTools, type McpToolListing } from "./filter-tools.js";

/** Static tool surface per connection — used to register qualified tools without MCP at run start. */
const KNOWN_TOOLS_BY_CONNECTION: Record<string, McpToolListing[]> = {
  linear: [
    {
      name: "search_issues",
      description: "Search issues in the connected Linear workspace.",
    },
    {
      name: "get_issue",
      description: "Get a Linear issue by id or identifier.",
    },
    {
      name: "create_issue",
      description: "Create a new Linear issue.",
    },
  ],
  slack: [
    {
      name: "search_messages",
      description: "Search messages across the Slack workspace.",
    },
    {
      name: "post_message",
      description: "Post a message to a Slack channel.",
    },
  ],
  github: [
    {
      name: "search_repositories",
      description: "Search GitHub repositories.",
    },
    {
      name: "list_issues",
      description: "List issues in a GitHub repository.",
    },
    {
      name: "get_file_contents",
      description: "Read a file from a GitHub repository.",
    },
    {
      name: "issue_read",
      description: "Read a GitHub issue.",
    },
    {
      name: "list_pull_requests",
      description: "List pull requests in a GitHub repository.",
    },
    {
      name: "pull_request_read",
      description: "Read a GitHub pull request.",
    },
    {
      name: "search_code",
      description: "Search code in GitHub repositories.",
    },
    {
      name: "search_issues",
      description: "Search issues in GitHub repositories.",
    },
  ],
  notion: [
    {
      name: "search",
      description: "Search Notion pages and databases.",
    },
  ],
};

export function getKnownToolsForConnection(
  connection: McpConnectionDef,
): McpToolListing[] {
  const catalog = KNOWN_TOOLS_BY_CONNECTION[connection.id] ?? [];
  return filterMcpTools(catalog, connection.tools);
}

/** For MCP_STUB listTools — same catalog as production registration. */
export function getStubToolsForConnection(
  connectionId: string,
): McpToolListing[] {
  return KNOWN_TOOLS_BY_CONNECTION[connectionId] ?? [];
}

const CONNECTION_ALIASES: Record<string, string> = {
  slack: "slack",
  슬랙: "slack",
  linear: "linear",
  리니어: "linear",
  github: "github",
  깃허브: "github",
  "깃 허브": "github",
  notion: "notion",
  노션: "notion",
  discord: "discord",
  디스코드: "discord",
};

/** Infer `connection` filter from user query when the model omits it. */
export function inferConnectionIdFromQuery(query: string): string | undefined {
  const normalized = query.trim().toLowerCase();
  for (const [alias, connectionId] of Object.entries(CONNECTION_ALIASES)) {
    if (normalized.includes(alias)) return connectionId;
  }
  return undefined;
}

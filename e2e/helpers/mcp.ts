import { createClient } from "@supabase/supabase-js";
import {
  SMOKE_EMAIL,
  SMOKE_PASSWORD,
} from "@ssota/adapter-postgres";
import { PROJECT_ID_HEADER } from "@ssota/contracts";

const supabaseUrl = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const defaultDatabaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

let cachedDefaultProjectId: string | null = null;

export const DEFAULT_MCP_ORG_SLUG = "ssota-labs";
export const DEFAULT_MCP_PROJECT_SLUG = "ssota-dev";

/** Minimal execution directive for E2E spawn_task calls. */
export const E2E_EXECUTION_DIRECTIVE = {
  goal: "Complete the E2E spawned task with verifiable output.",
  background: "Spawned from Playwright MCP E2E test fixture.",
  steps: ["Read task context", "Perform work", "Update task result"],
  constraints: [],
  contextRefs: { nodeIds: [], edgeIds: [], taskIds: [] },
};

const ACCOUNT_MCP_TOOLS = new Set([
  "list_organizations",
  "list_projects",
  "get_project",
]);

export async function getSmokeAccessToken(): Promise<string> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: SMOKE_EMAIL,
    password: SMOKE_PASSWORD,
  });
  if (error || !data.session?.access_token) {
    throw new Error(error?.message ?? "Failed to authenticate smoke user");
  }
  return data.session.access_token;
}

/** REST v1 tests still use X-SSOTA-Teamspace-Id header. */
export async function getDefaultProjectId(): Promise<string> {
  if (cachedDefaultProjectId) return cachedDefaultProjectId;

  const postgres = (await import("postgres")).default;
  const sql = postgres(defaultDatabaseUrl, { max: 1 });
  try {
    const rows = await sql<{ id: string }[]>`
      select ts.id
      from teamspaces ts
      join organizations o on o.id = ts.organization_id
      where o.slug = 'ssota-labs' and ts.slug = 'ssota-dev'
      limit 1
    `;
    const teamspaceId = rows[0]?.id;
    if (!teamspaceId) {
      throw new Error("Default project not found — run db:seed");
    }
    cachedDefaultProjectId = teamspaceId;
    return teamspaceId;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export function projectIdHeaders(teamspaceId: string): Record<string, string> {
  return { [PROJECT_ID_HEADER]: teamspaceId };
}

export function mcpEndpoint(mcpUrl: string): string {
  const base = mcpUrl.replace(/\/$/, "");
  return base.endsWith("/api/mcp") ? base : `${base}/api/mcp`;
}

/** @deprecated URL query scope — project scope is passed via tool args. */
export function projectScopedMcpUrl(
  mcpUrl: string,
  orgSlug = DEFAULT_MCP_ORG_SLUG,
  teamspaceSlug = DEFAULT_MCP_PROJECT_SLUG,
): string {
  const endpoint = mcpEndpoint(mcpUrl);
  const params = new URLSearchParams({ org: orgSlug, project: teamspaceSlug });
  return `${endpoint}?${params.toString()}`;
}

export async function mcpToolCall(
  request: {
    post: (
      url: string,
      options: {
        headers?: Record<string, string>;
        data?: unknown;
      },
    ) => Promise<{ ok: () => boolean; text: () => Promise<string> }>;
  },
  mcpUrl: string,
  token: string,
  toolName: string,
  args: Record<string, unknown> = {},
  options?: {
    orgSlug?: string;
    teamspaceSlug?: string;
  },
): Promise<unknown> {
  const endpoint = mcpEndpoint(mcpUrl);
  const toolArgs = { ...args };

  if (!ACCOUNT_MCP_TOOLS.has(toolName)) {
    toolArgs.orgSlug ??= options?.orgSlug ?? DEFAULT_MCP_ORG_SLUG;
    toolArgs.teamspaceSlug ??= options?.teamspaceSlug ?? DEFAULT_MCP_PROJECT_SLUG;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };

  const initRes = await request.post(endpoint, {
    headers,
    data: {
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "e2e", version: "1.0.0" },
      },
      id: 1,
    },
  });
  if (!initRes.ok()) {
    throw new Error("MCP initialize failed");
  }

  const callRes = await request.post(endpoint, {
    headers,
    data: {
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: toolName, arguments: toolArgs },
      id: 2,
    },
  });
  if (!callRes.ok()) {
    throw new Error(`MCP tools/call failed for ${toolName}`);
  }

  const body = parseJsonRpcResponse(await callRes.text()) as {
    result?: { content?: Array<{ text?: string }> };
  };
  const text = body.result?.content?.[0]?.text;
  return text ? JSON.parse(text) : body;
}

export async function mcpToolCallExpectError(
  request: Parameters<typeof mcpToolCall>[0],
  mcpUrl: string,
  token: string,
  toolName: string,
  args: Record<string, unknown> = {},
  options?: {
    orgSlug?: string;
    teamspaceSlug?: string;
  },
): Promise<string> {
  const endpoint = mcpEndpoint(mcpUrl);
  const toolArgs = { ...args };

  if (!ACCOUNT_MCP_TOOLS.has(toolName)) {
    toolArgs.orgSlug ??= options?.orgSlug ?? DEFAULT_MCP_ORG_SLUG;
    toolArgs.teamspaceSlug ??= options?.teamspaceSlug ?? DEFAULT_MCP_PROJECT_SLUG;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };

  const initRes = await request.post(endpoint, {
    headers,
    data: {
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "e2e", version: "1.0.0" },
      },
      id: 1,
    },
  });
  if (!initRes.ok()) {
    throw new Error("MCP initialize failed");
  }

  const callRes = await request.post(endpoint, {
    headers,
    data: {
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: toolName, arguments: toolArgs },
      id: 2,
    },
  });
  if (!callRes.ok()) {
    throw new Error(`MCP tools/call failed for ${toolName}`);
  }

  const body = parseJsonRpcResponse(await callRes.text()) as {
    result?: {
      isError?: boolean;
      content?: Array<{ text?: string }>;
    };
  };
  const text = body.result?.content?.[0]?.text ?? "";
  if (!body.result?.isError) {
    throw new Error(`Expected MCP tool error for ${toolName}, got: ${text}`);
  }
  return text;
}

function parseJsonRpcResponse(rawBody: string): unknown {
  const trimmed = rawBody.trim();
  if (!trimmed.startsWith("event:") && !trimmed.includes("\ndata:")) {
    return JSON.parse(trimmed);
  }

  const data = trimmed
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim())
    .join("\n");

  return JSON.parse(data);
}

import { createClient } from "@supabase/supabase-js";
import {
  SMOKE_EMAIL,
  SMOKE_PASSWORD,
} from "@ssota/adapter-supabase";
import { PROJECT_ID_HEADER } from "@ssota/contracts";

const supabaseUrl = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const defaultDatabaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

let cachedDefaultProjectId: string | null = null;

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

/** Resolves ssota-labs/ssota-dev project id from the graph DB (cached per process). */
export async function getDefaultProjectId(): Promise<string> {
  if (cachedDefaultProjectId) return cachedDefaultProjectId;

  const postgres = (await import("postgres")).default;
  const sql = postgres(defaultDatabaseUrl, { max: 1 });
  try {
    const rows = await sql<{ id: string }[]>`
      select p.id
      from projects p
      join organizations o on o.id = p.organization_id
      where o.slug = 'ssota-labs' and p.slug = 'ssota-dev'
      limit 1
    `;
    const projectId = rows[0]?.id;
    if (!projectId) {
      throw new Error("Default project not found — run db:seed");
    }
    cachedDefaultProjectId = projectId;
    return projectId;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export function projectIdHeaders(projectId: string): Record<string, string> {
  return { [PROJECT_ID_HEADER]: projectId };
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
  options?: { subjectId?: string; projectId?: string },
): Promise<unknown> {
  const projectId = options?.projectId ?? (await getDefaultProjectId());
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    ...projectIdHeaders(projectId),
  };
  if (options?.subjectId) {
    headers["X-SSOTA-Subject-Id"] = options.subjectId;
  }

  const initRes = await request.post(`${mcpUrl}/api/mcp`, {
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

  const callRes = await request.post(`${mcpUrl}/api/mcp`, {
    headers,
    data: {
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: toolName, arguments: args },
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

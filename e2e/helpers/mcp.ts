import { createClient } from "@supabase/supabase-js";
import {
  SMOKE_EMAIL,
  SMOKE_PASSWORD,
} from "@loopos/adapter-supabase";

const supabaseUrl = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

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

export async function mcpToolCall(
  request: {
    post: (
      url: string,
      options: {
        headers?: Record<string, string>;
        data?: unknown;
      },
    ) => Promise<{ ok: () => boolean; json: () => Promise<unknown> }>;
  },
  mcpUrl: string,
  token: string,
  toolName: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };

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

  const body = (await callRes.json()) as {
    result?: { content?: Array<{ text?: string }> };
  };
  const text = body.result?.content?.[0]?.text;
  return text ? JSON.parse(text) : body;
}

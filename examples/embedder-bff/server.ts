/**
 * 고객사 A BFF 예시 — embedder auth 이후 LoopOS MCP로 프록시.
 *
 * 흐름:
 *   [최종 사용자] → [A 앱 auth] → [이 BFF] → [LoopOS MCP + X-LoopOS-Subject-Id]
 *
 * 실행: LOOPOS_MCP_URL=http://127.0.0.1:3001 pnpm exec tsx examples/embedder-bff/server.ts
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const PORT = Number(process.env.EMBEDDER_BFF_PORT ?? 3200);
const LOOPOS_MCP_URL = process.env.LOOPOS_MCP_URL ?? "http://127.0.0.1:3001";
const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const LOOPOS_SERVICE_EMAIL =
  process.env.LOOPOS_SERVICE_EMAIL ?? "smoke@loopos.test";
const LOOPOS_SERVICE_PASSWORD =
  process.env.LOOPOS_SERVICE_PASSWORD ?? "smoke-test-password-123";

let cachedMcpToken: { token: string; expiresAt: number } | null = null;

async function getLoopOsMcpToken(): Promise<string> {
  if (cachedMcpToken && cachedMcpToken.expiresAt > Date.now() + 60_000) {
    return cachedMcpToken.token;
  }
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: LOOPOS_SERVICE_EMAIL,
      password: LOOPOS_SERVICE_PASSWORD,
    }),
  });
  if (!res.ok) {
    throw new Error(`LoopOS service login failed: ${res.status}`);
  }
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) {
    throw new Error("LoopOS service login returned no access_token");
  }
  cachedMcpToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

async function readJson<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw) as T;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

/**
 * Embedder가 이미 검증한 최종 사용자 id.
 * 프로덕션: A의 Supabase session / users.id
 * 로컬 데모: X-Embedder-User-Id 헤더
 */
function resolveEmbedderUserId(req: IncomingMessage): string | null {
  const header = req.headers["x-embedder-user-id"];
  if (typeof header === "string" && header.trim()) return header.trim();
  return null;
}

async function mcpExecuteAction(
  subjectId: string,
  actionType: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const token = await getLoopOsMcpToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "X-LoopOS-Subject-Id": subjectId,
  };

  const initRes = await fetch(`${LOOPOS_MCP_URL}/api/mcp`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "embedder-bff", version: "0.1.0" },
      },
      id: 1,
    }),
  });
  if (!initRes.ok) {
    throw new Error(`MCP initialize failed: ${initRes.status}`);
  }

  const callRes = await fetch(`${LOOPOS_MCP_URL}/api/mcp`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "execute_action",
        arguments: { actionType, input },
      },
      id: 2,
    }),
  });
  if (!callRes.ok) {
    throw new Error(`MCP execute_action failed: ${callRes.status}`);
  }

  const raw = await callRes.text();
  const parsed = parseJsonRpc(raw) as {
    result?: { content?: Array<{ text?: string }> };
  };
  const text = parsed.result?.content?.[0]?.text;
  return text ? JSON.parse(text) : parsed;
}

function parseJsonRpc(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed.includes("\ndata:")) return JSON.parse(trimmed);
  const data = trimmed
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim())
    .join("\n");
  return JSON.parse(data);
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && req.url === "/loopos/execute") {
    try {
      const subjectId = resolveEmbedderUserId(req);
      if (!subjectId) {
        sendJson(res, 401, {
          error: "Missing X-Embedder-User-Id (embedder auth must set this)",
        });
        return;
      }

      const body = await readJson<{
        actionType?: string;
        input?: Record<string, unknown>;
      }>(req);

      if (!body.actionType) {
        sendJson(res, 400, { error: "actionType is required" });
        return;
      }

      const result = await mcpExecuteAction(
        subjectId,
        body.actionType,
        body.input ?? {},
      );
      sendJson(res, 200, { subjectId, result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Proxy failed";
      sendJson(res, 502, { error: message });
    }
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Embedder BFF listening on http://127.0.0.1:${PORT}`);
  console.log(`  POST /loopos/execute  +  X-Embedder-User-Id: <A.users.id>`);
  console.log(`  Proxies to ${LOOPOS_MCP_URL}/api/mcp`);
});

import { test, expect } from "@playwright/test";
import { createClient } from "@loopos/client";
import { getSmokeAccessToken } from "../helpers/mcp";
import fs from "node:fs";
import path from "node:path";

const mcpUrl = process.env.MCP_URL ?? "http://127.0.0.1:3101";
const apiBase = `${mcpUrl}/api/v1`;

test.describe("LoopOS SDK → HTTP API v1", () => {
  test("401: Bearer 없이 API 거부", async ({ request }) => {
    const res = await request.get(`${apiBase}/catalog/node-types`);
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("UNAUTHORIZED");
  });

  test("거부: 카탈로그에 없는 actionType은 rejected (HTTP 200)", async () => {
    const token = await getSmokeAccessToken();
    const loopos = createClient({
      url: apiBase,
      auth: { accessToken: token },
    });

    const result = await loopos.actions.execute({
      actionType: "definitely_not_in_catalog_xyz",
      input: {},
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.code).toBe("CATALOG_NOT_FOUND");
    }
  });

  test("executorType 위조: 바디에 executorId/executorType 넣어도 서버가 무시", async ({
    request,
  }) => {
    const token = await getSmokeAccessToken();
    const res = await request.post(`${apiBase}/actions/execute`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: {
        actionType: "definitely_not_in_catalog_xyz",
        input: {},
        executorId: "spoofed-id",
        executorType: "System",
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("rejected");
  });

  test("smoke: SDK catalog 조회", async () => {
    const token = await getSmokeAccessToken();
    const loopos = createClient({
      url: apiBase,
      auth: { accessToken: token },
    });

    const nodeTypes = await loopos.catalog.listNodeTypes();
    expect(nodeTypes.length).toBeGreaterThan(0);
    expect(nodeTypes.some((e) => e.nodeType === "Note")).toBe(true);

    const log = await loopos.log.list({ limit: 5 });
    expect(Array.isArray(log)).toBe(true);
  });

  test("smoke: SDK execute → preview 플로우", async () => {
    const token = await getSmokeAccessToken();
    const loopos = createClient({
      url: apiBase,
      auth: { accessToken: token },
    });

    const preview = await loopos.actions.preview({
      actionType: "create_note",
      input: {
        title: "SDK e2e note",
        content: "created via @loopos/client",
      },
    });

    expect(preview.status).toBe("ok");
    if (preview.status === "ok") {
      expect(preview.effects.some((e) => e.kind === "create_node")).toBe(true);
    }
  });

  test("구조: 쓰기 엔드포인트는 actions/execute 하나뿐", async () => {
    const apiRoot = path.join(
      process.env.WORKSPACE_ROOT ?? `${process.cwd()}/..`,
      "apps/mcp/app/api/v1",
    );

    const writeRoutes: string[] = [];

    function walk(dir: string, prefix: string): void {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const segment = entry.name.startsWith("[")
            ? `:${entry.name.slice(1, -1)}`
            : entry.name;
          walk(full, `${prefix}/${segment}`);
        } else if (entry.name === "route.ts") {
          const source = fs.readFileSync(full, "utf8");
          if (/export\s+async\s+function\s+POST/.test(source)) {
            writeRoutes.push(prefix || "/");
          }
        }
      }
    }

    walk(apiRoot, "");

    const domainWriteRoutes = writeRoutes.filter(
      (route) =>
        !route.endsWith("/preview") && !route.endsWith("/submit"),
    );
    expect(domainWriteRoutes).toEqual(["/actions/execute"]);
  });
});

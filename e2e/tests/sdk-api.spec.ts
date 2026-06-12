import { test, expect } from "@playwright/test";
import { createClient } from "@ssota/client";
import { getDefaultProjectId, getSmokeAccessToken, projectIdHeaders } from "../helpers/mcp";
import fs from "node:fs";
import path from "node:path";

const mcpUrl = process.env.MCP_URL ?? "http://127.0.0.1:3101";
const apiBase = `${mcpUrl}/api/v1`;

async function authedClient(token: string) {
  const projectId = await getDefaultProjectId();
  return createClient({
    url: apiBase,
    auth: { accessToken: token },
    projectId,
  });
}

test.describe("SSOTA SDK → HTTP API v1", () => {
  test("401: Bearer 없이 API 거부", async ({ request }) => {
    const res = await request.get(`${apiBase}/catalog/node-types`);
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("UNAUTHORIZED");
  });

  test("거부: 카탈로그에 없는 actionType은 rejected (HTTP 200)", async () => {
    const token = await getSmokeAccessToken();
    const ssota = await authedClient(token);

    const result = await ssota.actions.execute({
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
    const projectId = await getDefaultProjectId();
    const res = await request.post(`${apiBase}/actions/execute`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...projectIdHeaders(projectId),
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

  test("smoke: SDK catalog 조회 + fetch", async () => {
    const token = await getSmokeAccessToken();
    const ssota = await authedClient(token);

    const nodeTypes = await ssota.catalog.listNodeTypes();
    expect(nodeTypes.length).toBeGreaterThan(0);
    expect(nodeTypes.some((e) => e.nodeType === "Note")).toBe(true);

    const noteType = await ssota.catalog.getNodeType("Note");
    expect(noteType?.nodeType).toBe("Note");

    const log = await ssota.log.list({ limit: 5 });
    expect(Array.isArray(log)).toBe(true);
  });

  test("smoke: SDK instructions find + get", async () => {
    const token = await getSmokeAccessToken();
    const ssota = await authedClient(token);

    const found = await ssota.instructions.find({
      query: "document",
      limit: 3,
    });
    expect(found.length).toBeGreaterThan(0);

    const instruction = await ssota.instructions.get(found[0]!.id);
    expect(instruction?.id).toBe(found[0]!.id);
  });

  test("smoke: SDK execute → preview 플로우", async () => {
    const token = await getSmokeAccessToken();
    const ssota = await authedClient(token);

    const preview = await ssota.actions.preview({
      actionType: "create_node",
      input: {
        nodeType: "Note",
        title: "SDK preview note",
        content: "created via @ssota/client",
      },
    });

    expect(preview.status).toBe("ok");
    if (preview.status === "ok") {
      expect(preview.effects.some((e) => e.kind === "create_node")).toBe(true);
    }
  });

  test("subjectId: X-SSOTA-Subject-Id 헤더가 API에 전달됨", async ({
    request,
  }) => {
    const token = await getSmokeAccessToken();
    const projectId = await getDefaultProjectId();
    const res = await request.get(`${apiBase}/catalog/node-types`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-SSOTA-Subject-Id": "e2e-subject-1",
        ...projectIdHeaders(projectId),
      },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("subjectId: SDK client가 헤더를 설정함", async ({ request }) => {
    const token = await getSmokeAccessToken();
    const projectId = await getDefaultProjectId();
    let sawSubjectHeader = false;

    const ssota = createClient({
      url: apiBase,
      auth: { accessToken: token },
      projectId,
      subjectId: "e2e-sdk-subject",
      fetch: async (input, init) => {
        const headers = init?.headers as Record<string, string>;
        if (headers["X-SSOTA-Subject-Id"] === "e2e-sdk-subject") {
          sawSubjectHeader = true;
        }
        return request.fetch(String(input), init ?? {});
      },
    });

    await ssota.catalog.listNodeTypes();
    expect(sawSubjectHeader).toBe(true);
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

  test("parity: MCP read 도구마다 HTTP v1 GET 라우트 존재", async () => {
    const apiRoot = path.join(
      process.env.WORKSPACE_ROOT ?? `${process.cwd()}/..`,
      "apps/mcp/app/api/v1",
    );

    const getRoutes = new Set<string>();

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
          if (/export\s+async\s+function\s+GET/.test(source)) {
            getRoutes.add(prefix || "/");
          }
        }
      }
    }

    walk(apiRoot, "");

    const expected = [
      "/catalog/node-types",
      "/catalog/node-types/:nodeType",
      "/catalog/edge-types",
      "/catalog/edge-types/:edgeType",
      "/catalog/properties",
      "/catalog/properties/:propertyKey",
      "/catalog/action-contracts",
      "/catalog/action-contracts/:actionType",
      "/catalog/archetypes",
      "/catalog/archetypes/:archetypeId",
      "/nodes",
      "/nodes/:nodeId",
      "/nodes/:nodeId/edges",
      "/nodes/:nodeId/neighbors",
      "/graph/traverse",
      "/instructions/search",
      "/instructions/:instructionId",
      "/gates",
      "/gates/pending",
      "/gates/:gateId",
      "/action-log",
      "/action-log/entry",
    ];

    for (const route of expected) {
      expect(getRoutes.has(route), `missing GET ${route}`).toBe(true);
    }
  });
});

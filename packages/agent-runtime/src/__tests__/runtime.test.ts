import { describe, expect, it } from "vitest";
import { createSsotaTools } from "../tools/index.js";
import { createSandboxTools } from "../tools/sandbox.js";
import {
  CONNECTION_SEARCH_TOOL,
  CONNECTION_CALL_TOOL,
  REQUEST_CONNECTION_TOOL,
  toQualifiedToolName,
} from "../connections/index.js";
import {
  connectUsesAppSubject,
  createEnvCredentialProvider,
  getConnectInstallation,
  isRecoverableConnectTokenError,
  normalizeConnectInstallationId,
  resolveConnectCallbackSubject,
  resolveConnectTokenSubject,
  startConnectAuthorization,
} from "../credentials/provider.js";
import { buildRunInstructions } from "../runtime-prompt.js";
import { DEFAULT_MODEL_ID } from "../models.js";

describe("createSsotaTools", () => {
  it("exposes the full graph + task tool set", () => {
    const tools = createSsotaTools();
    expect(Object.keys(tools).sort()).toEqual(
      [
        "block_task",
        "complete_task",
        "create_edge",
        "create_edge_type",
        "create_node",
        "create_node_type",
        "create_page",
        "delegate",
        "get_node",
        "get_page_component",
        "get_task",
        "get_workflow_instruction",
        "list_edge_types",
        "list_node_types",
        "list_page_components",
        "list_pages",
        "list_workflow_instructions",
        "query_nodes",
        "query_tasks",
        "read_page",
        "request_approval",
        "spawn_task",
        "traverse_edges",
        "update_node",
        "update_page",
        "update_task",
        "write_workflow_instruction",
      ].sort(),
    );
  });

  it("sandbox tools are a separate set (attached only for dev runs)", () => {
    const base = createSsotaTools();
    expect(base).not.toHaveProperty("sandbox_exec");
    const sandbox = createSandboxTools();
    expect(Object.keys(sandbox).sort()).toEqual([
      "sandbox_exec",
      "sandbox_read_file",
      "sandbox_write_file",
    ]);
  });

  it("connection tool names follow Eve conventions", () => {
    expect(CONNECTION_SEARCH_TOOL).toBe("connection_search");
    expect(CONNECTION_CALL_TOOL).toBe("connection_call");
    expect(REQUEST_CONNECTION_TOOL).toBe("request_connection");
    expect(toQualifiedToolName("linear", "search_issues")).toBe(
      "linear__search_issues",
    );
  });

  it("SSOTA tools do not include connection_search by default", () => {
    expect(createSsotaTools()).not.toHaveProperty("connection_search");
  });

  it("each tool has a description and input schema", () => {
    const tools = createSsotaTools();
    for (const [name, tool] of Object.entries(tools)) {
      expect(tool.description, `${name} description`).toBeTruthy();
      expect(tool.inputSchema, `${name} inputSchema`).toBeDefined();
    }
  });
});

describe("buildRunInstructions", () => {
  it("embeds task runtime scope and execution directive", () => {
    const prompt = buildRunInstructions({
      runtimeKind: "task",
      projectId: "22222222-2222-2222-2222-222222222222",
      taskPlaybook: {
        id: "33333333-3333-3333-3333-333333333333",
        projectId: "22222222-2222-2222-2222-222222222222",
        accountId: null,
        key: "work.write_document",
        name: "Write document",
        description: "",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Playbook body" }],
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      task: {
        id: "11111111-1111-1111-1111-111111111111",
        title: "Draft the onboarding PRD",
        acceptanceCriteria: ["Covers activation metric", "Lists open questions"],
        targetNodeId: null,
        executionDirective: {
          goal: "Write the PRD for onboarding.",
          background: "User asked in main chat.",
          steps: ["Outline", "Draft", "Review"],
          constraints: [],
          contextRefs: { nodeIds: [], edgeIds: [], taskIds: [] },
        },
      },
    });

    expect(prompt).toContain("Draft the onboarding PRD");
    expect(prompt).toContain("work.write_document");
    expect(prompt).toContain("connection_call");
    expect(prompt).toContain("connection_search");
    expect(prompt).toContain("Covers activation metric");
    expect(prompt).toContain("Write the PRD for onboarding.");
    expect(prompt).toContain("complete_task");
  });

  it("notes shared scope when no accountId is given", () => {
    const prompt = buildRunInstructions({
      runtimeKind: "main",
      projectId: "22222222-2222-2222-2222-222222222222",
      mainInstruction: null,
    });
    expect(prompt).toMatch(/persistent chat thread/i);
  });

  it("requires professional communication style for user-facing runtimes", () => {
    const main = buildRunInstructions({
      runtimeKind: "main",
      projectId: "22222222-2222-2222-2222-222222222222",
    });
    expect(main).toContain("professional workplace tone");
    expect(main).toContain("Do not use emojis");
    expect(main).toContain("합니다/습니다체");

    const task = buildRunInstructions({
      runtimeKind: "task",
      projectId: "22222222-2222-2222-2222-222222222222",
      task: {
        id: "11111111-1111-1111-1111-111111111111",
        title: "Example",
        acceptanceCriteria: [],
        targetNodeId: null,
        executionDirective: null,
      },
    });
    expect(task).toContain("professional workplace tone");
  });
});

describe("env credential provider", () => {
  it("resolves CONNECTOR_<NAME>_TOKEN and returns null otherwise", async () => {
    const provider = createEnvCredentialProvider();
    const scope = { projectId: "p" };
    process.env.CONNECTOR_TESTHUB_TOKEN = "tok-123";
    const found = await provider.getToken("testhub", scope);
    expect(found?.token).toBe("tok-123");
    delete process.env.CONNECTOR_TESTHUB_TOKEN;
    const missing = await provider.getToken("nope", scope);
    expect(missing).toBeNull();
  });
});

describe("connectUsesAppSubject", () => {
  it("uses app subject for slack, github, and discord connectors", () => {
    expect(connectUsesAppSubject("slack/dev")).toBe(true);
    expect(connectUsesAppSubject("github/acme")).toBe(true);
    expect(connectUsesAppSubject("discord/ssota-bot")).toBe(true);
  });

  it("uses user subject for oauth/* and linear/* connectors", () => {
    expect(connectUsesAppSubject("oauth/ssota-notion")).toBe(false);
    expect(connectUsesAppSubject("oauth/linear")).toBe(false);
    expect(connectUsesAppSubject("linear/mybot")).toBe(false);
  });
});

describe("isRecoverableConnectTokenError", () => {
  it("treats ConnectError unresolved_token as recoverable", () => {
    const error = Object.assign(new Error("Token unresolved"), {
      name: "ConnectError",
      code: "unresolved_token",
      status: 401,
    });
    expect(isRecoverableConnectTokenError(error)).toBe(true);
  });

  it("does not treat generic errors as recoverable", () => {
    expect(isRecoverableConnectTokenError(new Error("boom"))).toBe(false);
  });
});

describe("resolveConnectTokenSubject", () => {
  it("uses user subject for Slack MCP when userId is present", () => {
    expect(
      resolveConnectTokenSubject("slack/dev", {
        projectId: "p",
        userId: "user-42",
        installationId: "T0914DV7GA0",
      }),
    ).toEqual({ type: "user", id: "user-42" });
  });

  it("uses app subject for Slack when userId is absent (bot / server flows)", () => {
    expect(
      resolveConnectTokenSubject("slack/dev", {
        projectId: "p",
        installationId: "T0914DV7GA0",
      }),
    ).toEqual({ type: "app" });
  });
});

describe("resolveConnectCallbackSubject", () => {
  it("uses user subject when userId is present (post-authorize callback)", () => {
    expect(
      resolveConnectCallbackSubject("discord/ssota", {
        projectId: "p",
        userId: "user-42",
      }),
    ).toEqual({ type: "user", id: "user-42" });
    expect(
      resolveConnectCallbackSubject("slack/dev", {
        projectId: "p",
        userId: "user-42",
      }),
    ).toEqual({ type: "user", id: "user-42" });
  });

  it("falls back to runtime subject mapping when userId is absent", () => {
    expect(
      resolveConnectCallbackSubject("discord/ssota", { projectId: "p" }),
    ).toEqual({ type: "app" });
    expect(() =>
      resolveConnectCallbackSubject("oauth/notion", { projectId: "p" }),
    ).toThrow(/userId is required/);
  });
});

describe("normalizeConnectInstallationId", () => {
  it("drops Connect placeholder and blank ids", () => {
    expect(normalizeConnectInstallationId(undefined)).toBeUndefined();
    expect(normalizeConnectInstallationId(null)).toBeUndefined();
    expect(normalizeConnectInstallationId("")).toBeUndefined();
    expect(normalizeConnectInstallationId("   ")).toBeUndefined();
    expect(normalizeConnectInstallationId("EMPTY")).toBeUndefined();
    expect(normalizeConnectInstallationId("empty")).toBeUndefined();
  });

  it("keeps real installation ids", () => {
    expect(normalizeConnectInstallationId("T0914DV7GA0")).toBe("T0914DV7GA0");
    expect(normalizeConnectInstallationId(" 3a6919c1-ca19-4ced-b947-487ec85f87b4 ")).toBe(
      "3a6919c1-ca19-4ced-b947-487ec85f87b4",
    );
  });
});

describe("getConnectInstallation", () => {
  it("requires userId for oauth connectors outside CONNECT_STUB", async () => {
    await expect(
      getConnectInstallation("oauth/ssota-notion", { projectId: "p" }),
    ).rejects.toThrow(/userId is required/);
  });

  it("returns stub installation for oauth when CONNECT_STUB=1", async () => {
    process.env.CONNECT_STUB = "1";
    try {
      const installation = await getConnectInstallation("oauth/ssota-notion", {
        projectId: "p",
        userId: "user-42",
        installationId: "stub-oauth-notion-abc123",
      });
      expect(installation?.installationId).toBe("stub-oauth-notion-abc123");
      expect(installation?.name).toMatch(/oauth workspace/);
    } finally {
      delete process.env.CONNECT_STUB;
    }
  });
});

describe("startConnectAuthorization", () => {
  it("requires userId for the Connect authorization flow", async () => {
    await expect(
      startConnectAuthorization(
        "slack/dev",
        { projectId: "p", userId: "" },
        { callbackUrl: "http://localhost/api/connect/callback" },
      ),
    ).rejects.toThrow(/userId is required/);
  });

  it("returns a stub callback URL when CONNECT_STUB=1", async () => {
    process.env.CONNECT_STUB = "1";
    try {
      const url = await startConnectAuthorization(
        "slack/dev",
        { projectId: "p", accountId: "acc", userId: "user-1" },
        { callbackUrl: "http://localhost/api/connect/callback" },
      );
      const parsed = new URL(url);
      expect(parsed.pathname).toBe("/api/connect/callback");
      expect(parsed.searchParams.get("installation_id")).toMatch(/^stub-slack-dev-/);
    } finally {
      delete process.env.CONNECT_STUB;
    }
  });

  it("returns emulate slack OAuth URL when EMULATE_OAUTH=1", async () => {
    process.env.EMULATE_OAUTH = "1";
    process.env.EMULATE_ENABLED = "1";
    try {
      const url = await startConnectAuthorization(
        "slack/dev",
        { projectId: "p", accountId: "acc", userId: "user-1" },
        {
          callbackUrl: "http://localhost:3100/api/connect/callback",
          scopes: ["team:read"],
        },
      );
      expect(url).toContain("/oauth/v2/authorize");
      expect(url).toContain("client_id=12345.ssota-dev");
    } finally {
      delete process.env.EMULATE_OAUTH;
      delete process.env.EMULATE_ENABLED;
    }
  });
});

describe("model default", () => {
  it("defaults to a gateway provider/model id", () => {
    expect(DEFAULT_MODEL_ID).toMatch(/^[a-z]+\/.+/);
  });
});

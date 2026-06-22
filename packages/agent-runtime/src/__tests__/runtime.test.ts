import { describe, expect, it } from "vitest";
import { createSsotaTools } from "../tools/index.js";
import { createSandboxTools } from "../tools/sandbox.js";
import { createExternalTools } from "../tools/external.js";
import {
  connectUsesAppSubject,
  createEnvCredentialProvider,
  getConnectInstallation,
  resolveConnectCallbackSubject,
  startConnectAuthorization,
} from "../credentials/provider.js";
import { buildSystemPrompt } from "../system-prompt.js";
import { DEFAULT_MODEL_ID } from "../models.js";

describe("createSsotaTools", () => {
  it("exposes the full graph + task tool set", () => {
    const tools = createSsotaTools();
    expect(Object.keys(tools).sort()).toEqual(
      [
        "block_task",
        "complete_task",
        "create_edge",
        "create_node",
        "get_node",
        "get_task",
        "query_nodes",
        "query_tasks",
        "read_page_definition",
        "request_approval",
        "spawn_task",
        "traverse_edges",
        "update_node",
        "write_page_definition",
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

  it("external tools are a separate set (attached only with credentials)", () => {
    expect(createSsotaTools()).not.toHaveProperty("external_request");
    expect(Object.keys(createExternalTools())).toEqual([
      "external_request",
      "request_connection",
    ]);
  });

  it("each tool has a description and input schema", () => {
    const tools = createSsotaTools();
    for (const [name, tool] of Object.entries(tools)) {
      expect(tool.description, `${name} description`).toBeTruthy();
      expect(tool.inputSchema, `${name} inputSchema`).toBeDefined();
    }
  });
});

describe("buildSystemPrompt", () => {
  const task = {
    id: "11111111-1111-1111-1111-111111111111",
    title: "Draft the onboarding PRD",
    workflowKey: "work.write_document",
    acceptanceCriteria: ["Covers activation metric", "Lists open questions"],
    targetNodeId: null,
  };

  it("embeds the run scope, task, and finishing instructions", () => {
    const prompt = buildSystemPrompt({
      task,
      projectId: "22222222-2222-2222-2222-222222222222",
      accountId: undefined,
    });

    expect(prompt).toContain("Draft the onboarding PRD");
    expect(prompt).toContain("work.write_document");
    expect(prompt).toContain("22222222-2222-2222-2222-222222222222");
    expect(prompt).toContain("complete_task");
    expect(prompt).toContain("block_task");
    // acceptance criteria are enumerated
    expect(prompt).toContain("Covers activation metric");
  });

  it("notes shared scope when no accountId is given", () => {
    const prompt = buildSystemPrompt({
      task,
      projectId: "22222222-2222-2222-2222-222222222222",
    });
    expect(prompt).toMatch(/accountId: \(shared/);
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
});

describe("model default", () => {
  it("defaults to a gateway provider/model id", () => {
    expect(DEFAULT_MODEL_ID).toMatch(/^[a-z]+\/.+/);
  });
});

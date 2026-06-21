import { describe, expect, it } from "vitest";
import { createSsotaTools } from "../tools/index.js";
import { createSandboxTools } from "../tools/sandbox.js";
import { createExternalTools } from "../tools/external.js";
import { createEnvCredentialProvider, startConnectAuthorization } from "../credentials/provider.js";
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

import { describe, expect, it } from "vitest";
import { createSsotaTools } from "../tools/index.js";
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

describe("model default", () => {
  it("defaults to a gateway provider/model id", () => {
    expect(DEFAULT_MODEL_ID).toMatch(/^[a-z]+\/.+/);
  });
});

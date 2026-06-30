import { describe, expect, it } from "vitest";
import {
  SUBAGENT_REGISTRY,
  SUBAGENT_TYPES,
  buildSubagentSummaryLines,
} from "../subagents/registry.js";
import { readOnlyWorkspaceTools } from "../subagents/explorer.js";

describe("subagent registry", () => {
  it("registers the explorer subagent and advertises it", () => {
    expect(SUBAGENT_TYPES).toContain("explorer");
    expect(SUBAGENT_REGISTRY.explorer.shortDescription.length).toBeGreaterThan(20);
    expect(buildSubagentSummaryLines()).toContain("explorer");
  });
});

describe("explorer toolset is read-only", () => {
  const keys = Object.keys(readOnlyWorkspaceTools());

  it("includes the expected read tools", () => {
    for (const k of [
      "query_nodes",
      "get_node",
      "list_node_types",
      "list_pages",
      "list_page_components",
      "get_agent_instruction",
      "query_tasks",
    ]) {
      expect(keys).toContain(k);
    }
  });

  it("excludes every write/mutation/delegation tool", () => {
    for (const k of [
      "create_node",
      "update_node",
      "create_edge",
      "create_node_type",
      "create_edge_type",
      "create_page",
      "update_page",
      "write_agent_definition",
      "spawn_task",
      "update_task",
      "complete_task",
      "block_task",
      "request_approval",
      "delegate",
    ]) {
      expect(keys).not.toContain(k);
    }
  });
});

import { describe, it, expect } from "vitest";
import { createSsotaTools } from "../tools/index.js";
import {
  MAIN_WORKFLOW_TOOL_NAMES,
  MAIN_WORKFLOW_TOOL_SCHEMAS,
  buildMainWorkflowAgent,
} from "../workflow/main-agent.js";

describe("main workflow-agent tool surface", () => {
  it("every workflow tool name maps to a real SSOTA tool (no drift)", () => {
    const real = new Set(Object.keys(createSsotaTools()));
    const missing = MAIN_WORKFLOW_TOOL_NAMES.filter((n) => !real.has(n));
    expect(missing).toEqual([]);
  });

  it("each tool def carries a description and an inputSchema", () => {
    for (const name of MAIN_WORKFLOW_TOOL_NAMES) {
      const def = MAIN_WORKFLOW_TOOL_SCHEMAS[name];
      expect(typeof def.description).toBe("string");
      expect(def.description.length).toBeGreaterThan(0);
      expect(def.inputSchema).toBeDefined();
    }
  });

  it("builds a WorkflowAgent exposing exactly the declared tools", () => {
    const calls: string[] = [];
    const agent = buildMainWorkflowAgent({
      ssota: { projectId: "p", runId: "r" },
      dispatch: async (toolName) => {
        calls.push(toolName);
        return null;
      },
    });
    expect(Object.keys(agent.tools).sort()).toEqual(
      [...MAIN_WORKFLOW_TOOL_NAMES].sort(),
    );
  });
});

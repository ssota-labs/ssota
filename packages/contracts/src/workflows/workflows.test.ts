import { describe, expect, it } from "vitest";
import {
  WORKFLOW_KEYS,
  WORKFLOW_REGISTRY,
  getWorkflowByKey,
  isKnownWorkflowKey,
  listWorkflowKeys,
} from "./index.js";

describe("workflow registry SSOT", () => {
  it("defines pilot orchestrator and work workflows", () => {
    expect(WORKFLOW_KEYS.length).toBeGreaterThanOrEqual(8);
    expect(isKnownWorkflowKey("agent.main")).toBe(true);
    expect(isKnownWorkflowKey("orchestrator.daily")).toBe(true);
    expect(isKnownWorkflowKey("work.implement_feature")).toBe(true);
    expect(isKnownWorkflowKey("unknown.workflow")).toBe(false);
  });

  it("returns full instruction for agent.main", () => {
    const workflow = getWorkflowByKey("agent.main");
    expect(workflow).not.toBeNull();
    expect(workflow?.instruction).toContain("agent.main");
    expect(workflow?.instruction).toContain("get_workflow_instruction");
    expect(workflow?.cadenceHint).toBe("on_demand");
  });

  it("returns full instruction for orchestrator.daily", () => {
    const workflow = getWorkflowByKey("orchestrator.daily");
    expect(workflow).not.toBeNull();
    expect(workflow?.instruction).toContain("orchestrator.daily");
    expect(workflow?.instruction).toContain("query_tasks");
    expect(workflow?.cadenceHint).toBe("daily");
  });

  it("has unique workflow keys", () => {
    const keys = listWorkflowKeys();
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("loads non-empty instructions for every registry entry", () => {
    for (const key of WORKFLOW_KEYS) {
      const entry = WORKFLOW_REGISTRY[key]!;
      expect(entry.instruction.length).toBeGreaterThan(50);
      expect(entry.workflowKey).toBe(key);
    }
  });

  it("getWorkflowByKey returns null for unknown keys", () => {
    expect(getWorkflowByKey("not.a.workflow")).toBeNull();
  });
});

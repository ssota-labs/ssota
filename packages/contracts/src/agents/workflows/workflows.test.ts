import { describe, expect, it } from "vitest";
import {
  WORKFLOW_KEYS,
  WORKFLOW_REGISTRY,
  WORKFLOW_INSTRUCTION_SEEDS,
  getBuiltinWorkflowByKey,
  getWorkflowByKey,
  isKnownWorkflowKey,
  listBuiltinWorkflowIndex,
  listWorkflowKeys,
} from "./index.js";

describe("workflow registry SSOT", () => {
  it("defines pilot orchestrator and work workflows", () => {
    expect(WORKFLOW_KEYS.length).toBeGreaterThanOrEqual(8);
    expect(isKnownWorkflowKey("orchestrator.daily")).toBe(true);
    expect(isKnownWorkflowKey("work.implement_feature")).toBe(true);
    expect(isKnownWorkflowKey("unknown.workflow")).toBe(false);
  });

  it("no longer defines a reserved router workflow", () => {
    expect(isKnownWorkflowKey("agent.main")).toBe(false);
    expect(getWorkflowByKey("agent.main")).toBeNull();
  });

  it("every workflow carries a skill-style description for routing", () => {
    for (const key of WORKFLOW_KEYS) {
      const entry = WORKFLOW_REGISTRY[key]!;
      expect(entry.description.length).toBeGreaterThan(20);
    }
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

describe("built-in workflows (code-only, not seeded)", () => {
  it("has no built-in workflow entries", () => {
    expect(listBuiltinWorkflowIndex()).toHaveLength(0);
    expect(getBuiltinWorkflowByKey("agent.setup")).toBeNull();
    expect(getBuiltinWorkflowByKey("agent.guide.page_authoring")).toBeNull();
    expect(getBuiltinWorkflowByKey("agent.guide.workflow_authoring")).toBeNull();
  });

  it("keeps built-ins OUT of the seeded registry", () => {
    expect(isKnownWorkflowKey("agent.setup")).toBe(false);
    expect(getWorkflowByKey("agent.setup")).toBeNull();
  });
});

describe("workflow DB seeds", () => {
  it("seeds nothing — workflows are no longer seeded per project", () => {
    expect(WORKFLOW_INSTRUCTION_SEEDS).toHaveLength(0);
  });
});

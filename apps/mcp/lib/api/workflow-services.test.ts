import { describe, expect, it } from "vitest";
import {
  getWorkflowForMcp,
  getWorkflowInstructionForMcp,
  listWorkflowsForMcp,
} from "./workflow-services";

describe("workflow-services", () => {
  it("lists workflows without instruction bodies", () => {
    const result = listWorkflowsForMcp();
    expect(result.workflows.length).toBeGreaterThanOrEqual(9);
    expect(result.workflows.some((w) => w.workflowKey === "agent.main")).toBe(
      true,
    );
    for (const workflow of result.workflows) {
      expect(workflow).not.toHaveProperty("instruction");
      expect(workflow.title.length).toBeGreaterThan(0);
    }
  });

  it("returns workflow metadata by key", () => {
    const workflow = getWorkflowForMcp("orchestrator.daily");
    expect(workflow?.workflowKey).toBe("orchestrator.daily");
    expect(workflow?.cadenceHint).toBe("daily");
    expect(workflow).not.toHaveProperty("instruction");
  });

  it("returns null for unknown workflow keys", () => {
    expect(getWorkflowForMcp("not.a.workflow")).toBeNull();
    expect(getWorkflowInstructionForMcp("not.a.workflow")).toBeNull();
  });

  it("returns instruction body by key", () => {
    const result = getWorkflowInstructionForMcp("agent.main");
    expect(result?.workflowKey).toBe("agent.main");
    expect(result?.instruction).toContain("get_workflow_instruction");
    expect(result?.instruction.length).toBeGreaterThan(50);
  });
});

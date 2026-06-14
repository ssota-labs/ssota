import { describe, expect, it } from "vitest";
import type { Instruction } from "../domain/types.js";
import {
  buildWorkflowInstructionPackage,
  renderWorkflowInstructionText,
} from "./render-instruction-package.js";

const sampleInstruction: Instruction = {
  id: "550e8400-e29b-41d4-a716-446655440010",
  projectId: "550e8400-e29b-41d4-a716-446655440000",
  slug: "document-creation",
  instructionKey: "document_creation",
  title: "Document creation",
  triggerPatterns: [],
  applicableNodeTypes: ["Document"],
  requiredActions: ["create_node"],
  optionalActions: ["promote_document"],
  lifecycle: "Active",
  body: "Create documents as Draft.",
  contentUrl: null,
  scope: { kind: "node_type", nodeType: "Document" },
  triggers: [
    { id: "manual", kind: "manual", enabled: true, config: {} },
    { id: "task_assigned", kind: "task_assigned", enabled: true, config: {} },
  ],
  workflowSteps: [
    {
      id: "execute",
      title: "Create draft",
      actionRefs: ["create_node"],
      gate: true,
    },
  ],
  allowedActions: ["create_node"],
  outputContract: { format: "markdown" },
  gatePolicy: { promote: "human_required" },
  completionCriteria: "Document node exists in Draft",
};

describe("renderWorkflowInstructionText", () => {
  it("renders section headers for agent consumption", () => {
    const { workflow } = buildWorkflowInstructionPackage(sampleInstruction);
    const text = renderWorkflowInstructionText(workflow);

    expect(text).toContain("# Document creation");
    expect(text).toContain("## Trigger");
    expect(text).toContain("## Context");
    expect(text).toContain("## Steps");
    expect(text).toContain("### 1. Create draft");
    expect(text).toContain("## Output");
    expect(text).toContain("- manual");
    expect(text).toContain("Document node exists in Draft");
  });

  it("builds a package with structured workflow and rendered text", () => {
    const pkg = buildWorkflowInstructionPackage(sampleInstruction);
    expect(pkg.workflow.title).toBe("Document creation");
    expect(pkg.workflow.steps[0]?.actions[0]?.actionType).toBe("create_node");
    expect(pkg.renderedText).toContain("## Steps");
  });
});

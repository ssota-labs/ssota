import { describe, expect, it } from "vitest";
import type { Workflow } from "../domain/types.js";
import {
  buildWorkflowPackage,
  renderWorkflowText,
} from "./render-workflow-package.js";

const sampleWorkflow: Workflow = {
  id: "550e8400-e29b-41d4-a716-446655440010",
  projectId: "550e8400-e29b-41d4-a716-446655440000",
  slug: "document-creation",
  workflowKey: "document_creation",
  lifecycle: "Active",
  scope: { kind: "node_type", nodeType: "Document" },
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  spec: {
    title: "Document creation",
    workflowKey: "document_creation",
    lifecycle: "Active",
    scope: { kind: "node_type", nodeType: "Document" },
    trigger: {
      events: [
        { id: "manual", kind: "manual", enabled: true, config: {} },
        {
          id: "create_document",
          kind: "create_document",
          enabled: true,
          config: {},
        },
        {
          id: "task_assigned",
          kind: "task_assigned",
          enabled: true,
          config: {},
        },
      ],
    },
    context: { queries: [], traversals: [], assertions: [] },
    conditions: [],
    steps: [
      {
        id: "execute",
        title: "Create draft",
        mode: "agentic",
        actions: [{ actionType: "create_node", required: false }],
        referenceIds: [],
        gate: { id: "execute_gate", policy: { promote: "human_required" }, required: true },
      },
    ],
    gates: [],
    routes: [],
    references: [],
    output: {
      contract: { format: "markdown" },
      completionCriteria: "Document node exists in Draft",
    },
    agentNotes: "Create documents as Draft.",
    applicableNodeTypes: ["Document"],
    nodeBindings: [{ nodeType: "Document", disabledActions: [] }],
    allowedActions: ["create_node"],
    requiredActions: ["create_node"],
    optionalActions: ["promote_document"],
  },
};

describe("renderWorkflowText", () => {
  it("renders section headers for agent consumption", () => {
    const { workflow } = buildWorkflowPackage(sampleWorkflow);
    const text = renderWorkflowText(workflow);

    expect(text).toContain("# Document creation");
    expect(text).toContain("## Trigger");
    expect(text).toContain("## Context");
    expect(text).toContain("Applicable nodes:");
    expect(text).toContain("- Document");
    expect(text).toContain("## Steps");
    expect(text).toContain("### 1. Create draft");
    expect(text).toContain("## Output");
    expect(text).toContain("create_document");
    expect(text).toContain("Document node exists in Draft");
  });

  it("builds a package with structured workflow and rendered text", () => {
    const pkg = buildWorkflowPackage(sampleWorkflow);
    expect(pkg.workflow.title).toBe("Document creation");
    expect(pkg.workflow.steps[0]?.actions[0]?.actionType).toBe("create_node");
    expect(pkg.renderedText).toContain("## Steps");
  });
});

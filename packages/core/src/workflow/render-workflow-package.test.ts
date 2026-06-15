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
      ],
    },
    context: {
      filterGroups: [
        {
          id: "docs",
          nodeType: "Document",
          combinator: "and",
          conditions: [
            {
              id: "c1",
              propertyKey: "title",
              operator: "contains",
              value: "create",
            },
          ],
        },
      ],
      traversals: [],
      assertions: [],
    },
    routeBlocks: [],
    workflowBlocks: [],
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
    output: { contract: {} },
    agentNotes: "Completion: Document node exists in Draft\n\nCreate documents as Draft.",
    applicableNodeTypes: [{ nodeType: "Document", disabledActions: [] }],
    allowedActions: ["create_node"],
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
    expect(text).not.toContain("## Output");
    expect(text).toContain("## Agent notes");
    expect(text).toContain("Document node exists in Draft");
    expect(text).toContain("Filter group");
  });

  it("builds a package with structured workflow and rendered text", () => {
    const pkg = buildWorkflowPackage(sampleWorkflow);
    expect(pkg.workflow.title).toBe("Document creation");
    expect(pkg.workflow.steps[0]?.actions[0]?.actionType).toBe("create_node");
    expect(pkg.renderedText).toContain("## Steps");
  });

  it("renders route blocks with outlets and workflow handoffs", () => {
    const workflowWithRoutes: Workflow = {
      ...sampleWorkflow,
      spec: {
        ...sampleWorkflow.spec,
        workflowRole: "dispatcher",
        routeBlocks: [
          {
            id: "dispatch",
            label: "Dispatch",
            routingInstructionUrl: "https://notion.so/routing",
            links: [
              {
                id: "guide",
                label: "Routing guide",
                url: "https://notion.so/guide",
                source: "notion",
              },
            ],
            outlets: [
              {
                id: "out_discovery",
                label: "discovery",
                target: {
                  kind: "workflow",
                  workflowBlockId: "wf_discovery",
                },
              },
            ],
          },
        ],
        workflowBlocks: [
          {
            id: "wf_discovery",
            label: "Discovery steward",
            workflowKey: "discovery_steward",
          },
        ],
        steps: [
          {
            id: "execute",
            title: "Run",
            mode: "agentic",
            actions: [],
            referenceIds: [],
            instructionUrl: "https://notion.so/runbook",
          },
        ],
      },
    };

    const { workflow } = buildWorkflowPackage(workflowWithRoutes);
    const text = renderWorkflowText(workflow);

    expect(text).toContain("Role: dispatcher");
    expect(text).toContain("## Routes");
    expect(text).toContain("discovery → workflow discovery_steward");
    expect(text).toContain("instruction: https://notion.so/routing");
    expect(text).toContain("instruction via notion");
    expect(text).toContain("instruction: https://notion.so/runbook");
    expect(text).toContain("## Workflow handoffs");
  });
});

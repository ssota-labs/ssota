import { describe, expect, it } from "vitest";
import type { Workflow } from "@ssota/contracts";
import {
  addRouteOutlet,
  createWorkflowDraft,
  insertBlockAfter,
  isWorkflowDraftDirty,
  normalizeRouteInstructions,
  removeBlock,
  updateRouteBlock,
  updateStep,
  updateTriggerEvents,
  updateContext,
  updateWorkflowRole,
} from "./workflow-draft";

const baseWorkflow: Workflow = {
  id: "550e8400-e29b-41d4-a716-446655440010",
  slug: "test-workflow",
  workflowKey: "test_workflow",
  lifecycle: "Active",
  scope: { kind: "global" },
  title: "Test workflow",
  trigger: {
    events: [{ id: "manual", kind: "manual", enabled: true, config: {} }],
  },
  context: { filterGroups: [], traversals: [], assertions: [] },
  routeBlocks: [],
  workflowBlocks: [],
  conditions: [],
  steps: [
    {
      id: "execute",
      title: "Execute",
      mode: "agentic",
      actions: [],
      referenceIds: [],
    },
  ],
  gates: [],
  routes: [],
  references: [],
  output: { contract: {} },
  applicableNodeTypes: [],
  allowedActions: [],
};

describe("workflow-draft", () => {
  it("creates a draft from workflow wire", () => {
    const draft = createWorkflowDraft(baseWorkflow);
    expect(draft.title).toBe("Test workflow");
    expect(draft.steps[0]?.id).toBe("execute");
  });

  it("migrates routingInstructionUrl into instruction links on draft load", () => {
    const draft = createWorkflowDraft({
      ...baseWorkflow,
      routeBlocks: [
        {
          id: "route_1",
          label: "Dispatch",
          routingInstructionUrl: "https://notion.so/routing",
          links: [],
          outlets: [{ id: "out_1", label: "default", target: null }],
        },
      ],
    });

    expect(draft.routeBlocks[0]?.routingInstructionUrl).toBeNull();
    expect(draft.routeBlocks[0]?.links).toHaveLength(1);
    expect(draft.routeBlocks[0]?.links[0]?.url).toBe("https://notion.so/routing");
  });

  it("deduplicates routingInstructionUrl already present in links", () => {
    const normalized = normalizeRouteInstructions({
      id: "route_1",
      label: "Dispatch",
      routingInstructionUrl: "https://notion.so/routing",
      links: [
        {
          id: "link_1",
          label: "Instruction",
          url: "https://notion.so/routing",
        },
      ],
      outlets: [],
    });

    expect(normalized.routingInstructionUrl).toBeNull();
    expect(normalized.links).toHaveLength(1);
  });

  it("inserts route after context", () => {
    const draft = createWorkflowDraft(baseWorkflow);
    const { draft: next, focusNodeId } = insertBlockAfter(draft, "context", "route");
    expect(next.routeBlocks).toHaveLength(1);
    expect(next.flowEntry?.kind).toBe("route");
    expect(focusNodeId).toMatch(/^route:/);
  });

  it("inserts step after context replacing placeholder", () => {
    const draft = createWorkflowDraft(baseWorkflow);
    const { draft: next } = insertBlockAfter(draft, "context", "step");
    expect(next.steps).toHaveLength(1);
    expect(next.steps[0]?.id).not.toBe("execute");
    expect(next.steps[0]?.title).toBe("New step");
    expect(next.flowEntry?.kind).toBe("step");
  });

  it("inserts workflow block from route outlet", () => {
    const draft = createWorkflowDraft({
      ...baseWorkflow,
      routeBlocks: [
        {
          id: "route_1",
          label: "Dispatch",
          links: [],
          outlets: [{ id: "out_1", label: "default", target: null }],
        },
      ],
      flowEntry: { kind: "route", routeId: "route_1" },
    });
    const { draft: next, focusNodeId } = insertBlockAfter(
      draft,
      "route:route_1",
      "workflow",
      "out_1",
    );
    expect(next.workflowBlocks).toHaveLength(1);
    expect(next.routeBlocks[0]?.outlets[0]?.target?.kind).toBe("workflow");
    expect(focusNodeId).toMatch(/^workflow:/);
  });

  it("updates step fields including instructionUrl", () => {
    const draft = createWorkflowDraft(baseWorkflow);
    const next = updateStep(draft, "execute", {
      title: "Draft content",
      description: "Write the draft",
      instructionUrl: "https://notion.so/runbook",
    });
    expect(next.steps[0]?.title).toBe("Draft content");
    expect(next.steps[0]?.instructionUrl).toBe("https://notion.so/runbook");
  });

  it("removes route block and clears outlet targets", () => {
    const draft = createWorkflowDraft({
      ...baseWorkflow,
      routeBlocks: [
        {
          id: "route_1",
          label: "Dispatch",
          links: [],
          outlets: [{ id: "out_1", label: "default", target: null }],
        },
      ],
    });
    const next = removeBlock(draft, "route:route_1");
    expect(next.routeBlocks).toHaveLength(0);
  });

  it("detects dirty state from workflowRole", () => {
    const draft = createWorkflowDraft(baseWorkflow);
    expect(isWorkflowDraftDirty(draft, baseWorkflow)).toBe(false);
    const next = updateWorkflowRole(draft, "dispatcher");
    expect(isWorkflowDraftDirty(next, baseWorkflow)).toBe(true);
  });

  it("adds route outlets", () => {
    const draft = createWorkflowDraft({
      ...baseWorkflow,
      routeBlocks: [
        {
          id: "route_1",
          label: "Dispatch",
          links: [],
          outlets: [{ id: "out_1", label: "default", target: null }],
        },
      ],
    });
    const next = addRouteOutlet(draft, "route_1", "skip");
    expect(next.routeBlocks[0]?.outlets).toHaveLength(2);
  });

  it("updates route block label", () => {
    const draft = createWorkflowDraft({
      ...baseWorkflow,
      routeBlocks: [
        {
          id: "route_1",
          label: "Dispatch",
          links: [],
          outlets: [],
        },
      ],
    });
    const next = updateRouteBlock(draft, "route_1", { label: "Main dispatch" });
    expect(next.routeBlocks[0]?.label).toBe("Main dispatch");
  });

  it("updates trigger events", () => {
    const draft = createWorkflowDraft(baseWorkflow);
    const next = updateTriggerEvents(draft, [
      { id: "manual", kind: "manual", enabled: false, config: {} },
      { id: "t2", kind: "schedule", enabled: true, config: {} },
    ]);
    expect(next.trigger.events).toHaveLength(2);
    expect(next.trigger.events[1]?.kind).toBe("schedule");
  });

  it("updates context spec", () => {
    const draft = createWorkflowDraft(baseWorkflow);
    const next = updateContext(draft, {
      ...draft.context,
      filterGroups: [
        {
          id: "fg1",
          label: "Documents",
          nodeType: "Document",
          combinator: "and",
          conditions: [],
        },
      ],
    });
    expect(next.context.filterGroups).toHaveLength(1);
    expect(next.context.filterGroups[0]?.label).toBe("Documents");
  });

  it("splices a new step into an existing nextStepId chain", () => {
    const draft = createWorkflowDraft({
      ...baseWorkflow,
      steps: [
        {
          id: "step_a",
          title: "Step A",
          mode: "agentic",
          actions: [],
          referenceIds: [],
          nextStepId: "step_b",
        },
        {
          id: "step_b",
          title: "Step B",
          mode: "agentic",
          actions: [],
          referenceIds: [],
        },
      ],
      flowEntry: { kind: "step", stepId: "step_a" },
    });

    const { draft: next } = insertBlockAfter(draft, "step_a", "step");
    const inserted = next.steps.find(
      (step) => step.id !== "step_a" && step.id !== "step_b",
    );

    expect(next.steps.find((step) => step.id === "step_a")?.nextStepId).toBe(
      inserted?.id,
    );
    expect(inserted?.nextStepId).toBe("step_b");
  });

  it("adds a new route outlet when connecting another branch", () => {
    const draft = createWorkflowDraft({
      ...baseWorkflow,
      routeBlocks: [
        {
          id: "route_1",
          label: "Dispatch",
          links: [],
          outlets: [
            {
              id: "out_1",
              label: "default",
              target: { kind: "step", stepId: "execute" },
            },
          ],
        },
      ],
      flowEntry: { kind: "route", routeId: "route_1" },
    });

    const { draft: next } = insertBlockAfter(draft, "route:route_1", "step");
    const route = next.routeBlocks[0];

    expect(route?.outlets).toHaveLength(2);
    expect(route?.outlets[0]?.target?.kind).toBe("step");
    expect(route?.outlets[1]?.target?.kind).toBe("step");
    expect(route?.outlets[0]?.target).not.toEqual(route?.outlets[1]?.target);
  });
});

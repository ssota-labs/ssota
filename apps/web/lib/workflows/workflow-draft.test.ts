import { describe, expect, it } from "vitest";
import type { Workflow } from "@ssota/contracts";
import {
  createWorkflowDraft,
  insertBlockAfter,
  isWorkflowDraftDirty,
  linkReferenceToStep,
  removeBlock,
  updateCondition,
  updateStep,
  updateTriggerEvents,
  updateContext,
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

  it("inserts condition after context", () => {
    const draft = createWorkflowDraft(baseWorkflow);
    const { draft: next, focusNodeId } = insertBlockAfter(draft, "context", "condition");
    expect(next.conditions).toHaveLength(1);
    expect(focusNodeId).toMatch(/^condition:/);
  });

  it("inserts step after context replacing placeholder", () => {
    const draft = createWorkflowDraft(baseWorkflow);
    const { draft: next } = insertBlockAfter(draft, "context", "step");
    expect(next.steps).toHaveLength(1);
    expect(next.steps[0]?.id).not.toBe("execute");
    expect(next.steps[0]?.title).toBe("New step");
  });

  it("inserts reference linked to step", () => {
    const draft = createWorkflowDraft(baseWorkflow);
    const { draft: next, focusNodeId } = insertBlockAfter(draft, "execute", "reference");
    expect(next.references).toHaveLength(1);
    expect(next.steps[0]?.referenceIds).toContain(next.references[0]?.id);
    expect(focusNodeId).toMatch(/^reference:/);
  });

  it("updates step fields", () => {
    const draft = createWorkflowDraft(baseWorkflow);
    const next = updateStep(draft, "execute", {
      title: "Draft content",
      description: "Write the draft",
    });
    expect(next.steps[0]?.title).toBe("Draft content");
    expect(next.steps[0]?.description).toBe("Write the draft");
  });

  it("links reference to step", () => {
    const draft = createWorkflowDraft({
      ...baseWorkflow,
      references: [{ id: "ref_1", title: "Guide", kind: "url", url: "https://example.com" }],
    });
    const next = linkReferenceToStep(draft, "execute", "ref_1");
    expect(next.steps[0]?.referenceIds).toContain("ref_1");
  });

  it("removes condition block", () => {
    const draft = createWorkflowDraft({
      ...baseWorkflow,
      conditions: [
        {
          id: "cond_1",
          label: "Check",
          mode: "agentic",
          enforcement: "soft",
        },
      ],
    });
    const next = removeBlock(draft, "condition:cond_1");
    expect(next.conditions).toHaveLength(0);
  });

  it("detects dirty state", () => {
    const draft = createWorkflowDraft(baseWorkflow);
    expect(isWorkflowDraftDirty(draft, baseWorkflow)).toBe(false);
    const next = updateCondition(
      { ...draft, conditions: [{ id: "c1", label: "X", mode: "agentic", enforcement: "soft" }] },
      "c1",
      { label: "Changed" },
    );
    expect(isWorkflowDraftDirty(next, baseWorkflow)).toBe(true);
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
});

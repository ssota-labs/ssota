import { describe, expect, it } from "vitest";
import {
  mergeWorkflowDefinition,
  migrateApplicableNodeTypes,
  parseWorkflowSpec,
  workflowDefinitionToCatalogUpsert,
  workflowRowToWire,
} from "./workflow-store.js";
import { WorkflowDefinitionSchema } from "./workflow.js";

const manualTrigger = {
  id: "manual",
  kind: "manual",
  enabled: true,
  config: {},
} as const;

const taskAssignedTrigger = {
  id: "task_assigned",
  kind: "task_assigned",
  enabled: true,
  config: {},
} as const;

const sampleDefinition = WorkflowDefinitionSchema.parse({
  title: "Document creation",
  workflowKey: "document_creation",
  trigger: { events: [manualTrigger, taskAssignedTrigger] },
  context: {
    filterGroups: [
      {
        id: "docs",
        label: "Documents",
        nodeType: "Document",
        combinator: "and",
        conditions: [],
      },
    ],
    traversals: [],
    assertions: [],
  },
  steps: [
    {
      id: "execute",
      title: "Create draft",
      actions: [
        { actionType: "create_node", required: true },
        { actionType: "promote_document", required: false },
      ],
      gate: {
        id: "execute_gate",
        policy: { promote: "human_required" },
        required: true,
      },
    },
  ],
  output: {
    contract: { format: "markdown" },
    completionCriteria: "Document node exists in Draft",
  },
  agentNotes: "Create documents as Draft.",
  applicableNodeTypes: [{ nodeType: "Document", disabledActions: [] }],
  allowedActions: ["create_node", "promote_document"],
});

describe("workflow v0 schemas", () => {
  it("parses a workflow definition with structured trigger events", () => {
    expect(sampleDefinition.steps).toHaveLength(1);
    expect(sampleDefinition.context.filterGroups[0]?.nodeType).toBe("Document");
    expect(sampleDefinition.trigger.events[0]?.kind).toBe("manual");
  });
});

describe("workflow store helpers", () => {
  it("maps a persisted row to wire workflow shape", () => {
    const wire = workflowRowToWire({
      id: "550e8400-e29b-41d4-a716-446655440010",
      slug: "document-creation",
      workflowKey: "document_creation",
      lifecycle: "Active",
      scope: { kind: "node_type", nodeType: "Document" },
      spec: sampleDefinition,
    });

    expect(wire.id).toBe("550e8400-e29b-41d4-a716-446655440010");
    expect(wire.title).toBe("Document creation");
    expect(wire.workflowKey).toBe("document_creation");
    expect(wire.steps[0]?.actions[0]?.actionType).toBe("create_node");
  });

  it("builds catalog upsert payloads from definitions", () => {
    const upsert = workflowDefinitionToCatalogUpsert(sampleDefinition, {
      workflowId: "550e8400-e29b-41d4-a716-446655440010",
      slug: "document-creation",
    });

    expect(upsert.workflowId).toBe("550e8400-e29b-41d4-a716-446655440010");
    expect(upsert.spec.title).toBe("Document creation");
    expect(upsert.lifecycle).toBe("Active");
  });

  it("migrates legacy string applicableNodeTypes when parsing stored specs", () => {
    const parsed = parseWorkflowSpec({
      title: "Legacy",
      trigger: { events: [manualTrigger] },
      context: {
        queries: [{ id: "docs", nodeType: "Document" }],
        traversals: [],
        assertions: [],
      },
      applicableNodeTypes: ["Document"],
      steps: [{ id: "execute", title: "Run", actions: [] }],
    });

    expect(parsed.context.filterGroups[0]?.nodeType).toBe("Document");
    expect(parsed.applicableNodeTypes).toEqual([
      { nodeType: "Document", disabledActions: [] },
    ]);
  });

  it("merges partial workflow definition patches", () => {
    const merged = mergeWorkflowDefinition(sampleDefinition, {
      title: "Updated document creation",
      trigger: {
        events: [manualTrigger],
      },
    });

    expect(merged.title).toBe("Updated document creation");
    expect(merged.trigger.events).toHaveLength(1);
    expect(merged.steps).toEqual(sampleDefinition.steps);
  });

  it("migrates legacy nodeBindings into applicableNodeTypes", () => {
    const migrated = migrateApplicableNodeTypes({
      nodeBindings: [
        { nodeType: "Document", disabledActions: [] },
        { nodeType: "Note", disabledActions: ["promote_document"] },
      ],
    });

    expect(migrated).toEqual([
      { nodeType: "Document", disabledActions: [] },
      { nodeType: "Note", disabledActions: ["promote_document"] },
    ]);
  });

  it("prefers nodeBindings over legacy string applicableNodeTypes during migration", () => {
    const migrated = migrateApplicableNodeTypes({
      applicableNodeTypes: ["Workflow"],
      nodeBindings: [{ nodeType: "Feature", disabledActions: ["delete_node"] }],
    });

    expect(migrated).toEqual([
      { nodeType: "Feature", disabledActions: ["delete_node"] },
    ]);
  });

  it("preserves disabledActions on merge", () => {
    const merged = mergeWorkflowDefinition(sampleDefinition, {
      applicableNodeTypes: [
        { nodeType: "Feature", disabledActions: ["delete_node"] },
        { nodeType: "Note", disabledActions: [] },
      ],
    });

    expect(merged.applicableNodeTypes).toEqual([
      { nodeType: "Feature", disabledActions: ["delete_node"] },
      { nodeType: "Note", disabledActions: [] },
    ]);
  });

  it("strips legacy requiredActions and optionalActions on parse", () => {
    const parsed = parseWorkflowSpec({
      ...sampleDefinition,
      requiredActions: ["create_node"],
      optionalActions: ["promote_document"],
    });

    expect(parsed).not.toHaveProperty("requiredActions");
    expect(parsed).not.toHaveProperty("optionalActions");
    expect(parsed).not.toHaveProperty("nodeBindings");
  });
});

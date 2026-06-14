import { describe, expect, it } from "vitest";
import { InstructionSchema } from "./wire.js";
import {
  instructionToWorkflow,
  roundTripInstructionDefinition,
  workflowToInstructionDefinition,
} from "./workflow-compat.js";
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

const sampleInstruction = InstructionSchema.parse({
  id: "550e8400-e29b-41d4-a716-446655440010",
  slug: "document-creation",
  instructionKey: "document_creation",
  title: "Document creation",
  triggerPatterns: [],
  applicableNodeTypes: ["Document"],
  requiredActions: ["create_node"],
  optionalActions: ["promote_document"],
  lifecycle: "Active",
  body: "Create documents as Draft. Include title, content, and provenance.",
  contentUrl: "https://example.com/runbooks/document-creation",
  scope: { kind: "node_type", nodeType: "Document" },
  triggers: [manualTrigger, taskAssignedTrigger],
  workflowSteps: [
    {
      id: "contract",
      title: "Load contract",
      description: "Read action contract before writing.",
      actionRefs: ["create_node"],
      gate: false,
    },
    {
      id: "execute",
      title: "Create draft",
      actionRefs: ["create_node", "promote_document"],
      output: "Draft node id",
      gate: true,
    },
  ],
  allowedActions: ["create_node", "promote_document"],
  outputContract: { format: "markdown" },
  gatePolicy: { promote: "human_required" },
  completionCriteria: "Document node exists in Draft",
});

describe("workflow v0 schemas", () => {
  it("parses a workflow definition with structured trigger events", () => {
    const parsed = WorkflowDefinitionSchema.parse({
      title: "Document creation",
      workflowKey: "document_creation",
      trigger: { events: [manualTrigger] },
      context: {
        queries: [{ id: "docs", nodeType: "Document" }],
        traversals: [],
        assertions: [],
      },
      steps: [
        {
          id: "execute",
          title: "Create draft",
          actions: [{ actionType: "create_node", required: true }],
        },
      ],
      output: {
        contract: { format: "markdown" },
        completionCriteria: "Draft exists",
      },
    });

    expect(parsed.steps).toHaveLength(1);
    expect(parsed.context.queries[0]?.nodeType).toBe("Document");
    expect(parsed.trigger.events[0]?.kind).toBe("manual");
  });
});

describe("instruction ↔ workflow compatibility", () => {
  it("maps instruction fields into workflow sections", () => {
    const workflow = instructionToWorkflow(sampleInstruction);

    expect(workflow.instructionId).toBe(sampleInstruction.id);
    expect(workflow.workflowKey).toBe("document_creation");
    expect(workflow.trigger.events).toEqual([
      manualTrigger,
      taskAssignedTrigger,
    ]);
    expect(workflow.context.queries).toEqual([
      {
        id: "applicable_document",
        label: "Applicable Document nodes",
        nodeType: "Document",
      },
    ]);
    expect(workflow.steps).toHaveLength(2);
    expect(workflow.steps[1]?.gate?.required).toBe(true);
    expect(workflow.gates).toEqual([
      {
        id: "gate_promote",
        policy: { promote: "human_required" },
        required: true,
        reason: "human_required",
      },
    ]);
    expect(workflow.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "agent_body", kind: "inline" }),
        expect.objectContaining({ id: "runbook", kind: "url" }),
      ]),
    );
    expect(workflow.output.completionCriteria).toBe(
      "Document node exists in Draft",
    );
  });

  it("projects workflow back to instruction definition shape", () => {
    const workflow = instructionToWorkflow(sampleInstruction);
    const definition = workflowToInstructionDefinition(workflow);

    expect(definition.title).toBe(sampleInstruction.title);
    expect(definition.instructionKey).toBe(sampleInstruction.instructionKey);
    expect(definition.triggerPatterns).toEqual([]);
    expect(definition.triggers).toEqual(sampleInstruction.triggers);
    expect(definition.workflowSteps.map((step) => step.id)).toEqual([
      "contract",
      "execute",
    ]);
    expect(definition.workflowSteps[1]?.gate).toBe(true);
    expect(definition.allowedActions).toEqual(sampleInstruction.allowedActions);
    expect(definition.gatePolicy).toEqual(sampleInstruction.gatePolicy);
    expect(definition.body).toBe(sampleInstruction.body);
    expect(definition.contentUrl).toBe(sampleInstruction.contentUrl);
  });

  it("round-trips legacy instruction rows without losing core fields", () => {
    const roundTripped = roundTripInstructionDefinition(sampleInstruction);

    expect(roundTripped.title).toBe(sampleInstruction.title);
    expect(roundTripped.triggers).toEqual(sampleInstruction.triggers);
    expect(roundTripped.workflowSteps).toEqual(sampleInstruction.workflowSteps);
    expect(roundTripped.allowedActions).toEqual(sampleInstruction.allowedActions);
    expect(roundTripped.gatePolicy).toEqual(sampleInstruction.gatePolicy);
    expect(roundTripped.completionCriteria).toBe(
      sampleInstruction.completionCriteria,
    );
  });

  it("synthesizes a default step when legacy workflowSteps is empty", () => {
    const minimal = InstructionSchema.parse({
      ...sampleInstruction,
      workflowSteps: [],
      allowedActions: ["create_node"],
      requiredActions: ["create_node"],
    });

    const workflow = instructionToWorkflow(minimal);
    expect(workflow.steps).toHaveLength(1);
    expect(workflow.steps[0]?.id).toBe("execute");
    expect(workflow.steps[0]?.actions).toEqual([
      { actionType: "create_node", required: true },
    ]);
  });
});

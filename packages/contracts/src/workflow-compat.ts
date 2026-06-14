import type { InstructionWorkflowStep, InstructionDefinition } from "./definitions.js";
import { InstructionDefinitionSchema } from "./definitions.js";
import type { Instruction } from "./wire.js";
import {
  WorkflowDefinitionSchema,
  WorkflowSchema,
  type Workflow,
  type WorkflowDefinition,
  type WorkflowGateSpec,
  type WorkflowReferenceSpec,
  type WorkflowStepSpec,
} from "./workflow.js";

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function stepActionsFromLegacy(
  actionRefs: string[],
  requiredActions: string[],
): WorkflowStepSpec["actions"] {
  const required = new Set(requiredActions);
  return uniqueStrings(actionRefs).map((actionType) => ({
    actionType,
    required: required.has(actionType),
  }));
}

function legacyStepToWorkflowStep(
  step: InstructionWorkflowStep,
  gatePolicy: Record<string, unknown>,
  requiredActions: string[],
): WorkflowStepSpec {
  const actions = stepActionsFromLegacy(step.actionRefs, requiredActions);
  return {
    id: step.id,
    title: step.title,
    description: step.description,
    mode: "agentic",
    actions,
    gate: step.gate
      ? {
          id: `${step.id}_gate`,
          policy: gatePolicy,
          required: true,
        }
      : null,
    output: step.output,
    referenceIds: [],
  };
}

function defaultStepsFromInstruction(
  instruction: Pick<
    Instruction,
    | "title"
    | "allowedActions"
    | "requiredActions"
    | "gatePolicy"
    | "completionCriteria"
  >,
): WorkflowStepSpec[] {
  const actions = stepActionsFromLegacy(
    instruction.allowedActions,
    instruction.requiredActions,
  );
  return [
    {
      id: "execute",
      title: instruction.title,
      description: instruction.completionCriteria ?? undefined,
      mode: "agentic",
      actions,
      gate: null,
      referenceIds: [],
    },
  ];
}

function gatesFromPolicy(
  gatePolicy: Record<string, unknown>,
): WorkflowGateSpec[] {
  const entries = Object.entries(gatePolicy);
  if (entries.length === 0) return [];

  return entries.map(([key, value]) => ({
    id: `gate_${key}`,
    policy: { [key]: value },
    required: true,
    reason: typeof value === "string" ? value : undefined,
  }));
}

function referencesFromInstruction(
  instruction: Pick<Instruction, "body" | "contentUrl" | "instructionKey">,
): WorkflowReferenceSpec[] {
  const references: WorkflowReferenceSpec[] = [];

  if (instruction.body?.trim()) {
    references.push({
      id: "agent_body",
      title: "Instruction body",
      kind: "inline",
      body: instruction.body,
    });
  }

  if (instruction.contentUrl?.trim()) {
    references.push({
      id: "runbook",
      title: "External runbook",
      kind: "url",
      url: instruction.contentUrl,
    });
  }

  return references;
}

function contextFromApplicableNodeTypes(
  applicableNodeTypes: string[],
): WorkflowDefinition["context"] {
  return {
    queries: applicableNodeTypes.map((nodeType) => ({
      id: `applicable_${nodeType.toLowerCase()}`,
      label: `Applicable ${nodeType} nodes`,
      nodeType,
    })),
    traversals: [],
    assertions: [],
  };
}

/**
 * Derive the Workflow SSOT view from a persisted Instruction catalog row.
 * v0 storage keeps Instruction as the physical row; Workflow is the logical model.
 */
export function instructionToWorkflow(instruction: Instruction): Workflow {
  const steps =
    instruction.workflowSteps.length > 0
      ? instruction.workflowSteps.map((step) =>
          legacyStepToWorkflowStep(
            step,
            instruction.gatePolicy,
            instruction.requiredActions,
          ),
        )
      : defaultStepsFromInstruction(instruction);

  const definition: Workflow = {
    id: instruction.id,
    slug: instruction.slug,
    instructionId: instruction.id,
    title: instruction.title,
    workflowKey: instruction.instructionKey ?? undefined,
    lifecycle: instruction.lifecycle,
    scope: instruction.scope,
    trigger: {
      patterns: [...instruction.triggerPatterns],
      events: [...instruction.triggers],
    },
    context: contextFromApplicableNodeTypes(instruction.applicableNodeTypes),
    conditions: [],
    steps,
    gates: gatesFromPolicy(instruction.gatePolicy),
    output: {
      contract: { ...instruction.outputContract },
      completionCriteria: instruction.completionCriteria,
      format:
        typeof instruction.outputContract.format === "string"
          ? instruction.outputContract.format
          : undefined,
    },
    references: referencesFromInstruction(instruction),
    routes: [],
    agentNotes: instruction.body,
    applicableNodeTypes: [...instruction.applicableNodeTypes],
    allowedActions: [...instruction.allowedActions],
    requiredActions: [...instruction.requiredActions],
    optionalActions: [...instruction.optionalActions],
  };

  return WorkflowSchema.parse(definition);
}

function legacyStepsFromWorkflow(workflow: WorkflowDefinition): InstructionWorkflowStep[] {
  return workflow.steps.map((step) => ({
    id: step.id,
    title: step.title,
    description: step.description,
    actionRefs: step.actions.map((action) => action.actionType),
    output: step.output,
    gate: Boolean(step.gate?.required),
  }));
}

function gatePolicyFromWorkflow(workflow: WorkflowDefinition): Record<string, unknown> {
  if (workflow.gates.length > 0) {
    return workflow.gates.reduce<Record<string, unknown>>((acc, gate) => {
      Object.assign(acc, gate.policy);
      return acc;
    }, {});
  }

  const fromSteps = workflow.steps
    .filter((step) => step.gate)
    .map((step) => step.gate!.policy);
  if (fromSteps.length === 0) return {};

  return fromSteps.reduce<Record<string, unknown>>((acc, policy) => {
    Object.assign(acc, policy);
    return acc;
  }, {});
}

function bodyFromWorkflow(workflow: WorkflowDefinition): string | null {
  const inline = workflow.references.find(
    (reference) => reference.kind === "inline" && reference.body?.trim(),
  );
  if (inline?.body?.trim()) return inline.body.trim();
  if (workflow.agentNotes?.trim()) return workflow.agentNotes.trim();
  return null;
}

function contentUrlFromWorkflow(workflow: WorkflowDefinition): string | null {
  const urlRef = workflow.references.find(
    (reference) => reference.kind === "url" && reference.url,
  );
  return urlRef?.url ?? null;
}

/**
 * Project a Workflow definition back onto the Instruction catalog shape.
 * Used for define_instruction / upsert_instruction_catalog_entry compatibility.
 */
export function workflowToInstructionDefinition(
  workflow: WorkflowDefinition,
): InstructionDefinition {
  const body = bodyFromWorkflow(workflow);
  const contentUrl = contentUrlFromWorkflow(workflow);

  const definition = {
    title: workflow.title,
    instructionKey: workflow.workflowKey,
    triggerPatterns:
      workflow.trigger.patterns.length > 0
        ? workflow.trigger.patterns
        : ["manual"],
    applicableNodeTypes:
      workflow.applicableNodeTypes.length > 0
        ? workflow.applicableNodeTypes
        : workflow.context.queries
            .map((query) => query.nodeType)
            .filter((nodeType): nodeType is string => Boolean(nodeType)),
    requiredActions: [...workflow.requiredActions],
    optionalActions: [...workflow.optionalActions],
    lifecycle: workflow.lifecycle,
    body,
    contentUrl,
    scope: workflow.scope,
    triggers: [...workflow.trigger.events],
    workflowSteps: legacyStepsFromWorkflow(workflow),
    allowedActions:
      workflow.allowedActions.length > 0
        ? workflow.allowedActions
        : uniqueStrings(
            workflow.steps.flatMap((step) =>
              step.actions.map((action) => action.actionType),
            ),
          ),
    outputContract: { ...workflow.output.contract },
    gatePolicy: gatePolicyFromWorkflow(workflow),
    completionCriteria: workflow.output.completionCriteria ?? null,
  };

  if (!body && !contentUrl) {
    definition.body = workflow.title;
  }

  WorkflowDefinitionSchema.parse(workflow);
  return InstructionDefinitionSchema.parse(definition);
}

/** Parse and validate a workflow definition payload. */
export function parseWorkflowDefinition(input: unknown): WorkflowDefinition {
  return WorkflowDefinitionSchema.parse(input);
}

/** Round-trip helper: Instruction → Workflow → InstructionDefinition fields. */
export function roundTripInstructionDefinition(
  instruction: Instruction,
): InstructionDefinition {
  const workflow = instructionToWorkflow(instruction);
  return workflowToInstructionDefinition(workflow);
}

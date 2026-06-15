import type {
  Workflow,
  WorkflowConditionSpec,
  WorkflowDefinition,
  WorkflowGateSpec,
  WorkflowOutputSpec,
  WorkflowReferenceSpec,
  WorkflowRouteSpec,
  WorkflowStepSpec,
  WorkflowTriggerEvent,
  ContextSpec,
} from "@ssota/contracts";
import type { WorkflowFlowNodeKind } from "@/lib/workflows/workflow-flow-model";

export type WorkflowDraft = WorkflowDefinition;

export type WorkflowDraftPatch = {
  steps?: WorkflowStepSpec[];
  conditions?: WorkflowConditionSpec[];
  references?: WorkflowReferenceSpec[];
  routes?: WorkflowRouteSpec[];
  output?: WorkflowOutputSpec;
  gates?: WorkflowGateSpec[];
  trigger?: WorkflowDefinition["trigger"];
  context?: ContextSpec;
};

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export function createWorkflowDraft(workflow: Workflow): WorkflowDraft {
  const { id: _id, slug: _slug, createdAt: _c, updatedAt: _u, ...definition } =
    workflow;
  return structuredClone(definition);
}

export function draftToWorkflowWire(
  draft: WorkflowDraft,
  workflow: Workflow,
): Workflow {
  return { ...workflow, ...draft };
}

export function isWorkflowDraftDirty(
  draft: WorkflowDraft,
  workflow: Workflow,
): boolean {
  const baseline = createWorkflowDraft(workflow);
  return JSON.stringify(draft) !== JSON.stringify(baseline);
}

export function extractBuilderPatch(draft: WorkflowDraft): WorkflowDraftPatch {
  return {
    steps: draft.steps,
    conditions: draft.conditions,
    references: draft.references,
    routes: draft.routes,
    output: draft.output,
    gates: draft.gates,
    trigger: draft.trigger,
    context: draft.context,
  };
}

export function updateTriggerEvents(
  draft: WorkflowDraft,
  events: WorkflowTriggerEvent[],
): WorkflowDraft {
  return {
    ...draft,
    trigger: { ...draft.trigger, events },
  };
}

export function updateContext(draft: WorkflowDraft, context: ContextSpec): WorkflowDraft {
  return {
    ...draft,
    context,
  };
}

export function updateStep(
  draft: WorkflowDraft,
  stepId: string,
  patch: Partial<WorkflowStepSpec>,
): WorkflowDraft {
  return {
    ...draft,
    steps: draft.steps.map((step) =>
      step.id === stepId ? { ...step, ...patch } : step,
    ),
  };
}

export function updateCondition(
  draft: WorkflowDraft,
  conditionId: string,
  patch: Partial<WorkflowConditionSpec>,
): WorkflowDraft {
  return {
    ...draft,
    conditions: draft.conditions.map((condition) =>
      condition.id === conditionId ? { ...condition, ...patch } : condition,
    ),
  };
}

export function updateReference(
  draft: WorkflowDraft,
  referenceId: string,
  patch: Partial<WorkflowReferenceSpec>,
): WorkflowDraft {
  return {
    ...draft,
    references: draft.references.map((reference) =>
      reference.id === referenceId ? { ...reference, ...patch } : reference,
    ),
  };
}

export function updateRoute(
  draft: WorkflowDraft,
  routeId: string,
  patch: Partial<WorkflowRouteSpec>,
): WorkflowDraft {
  return {
    ...draft,
    routes: draft.routes.map((route) =>
      route.id === routeId ? { ...route, ...patch } : route,
    ),
  };
}

export function updateOutput(
  draft: WorkflowDraft,
  patch: Partial<WorkflowOutputSpec>,
): WorkflowDraft {
  return {
    ...draft,
    output: { ...draft.output, ...patch },
  };
}

export function linkReferenceToStep(
  draft: WorkflowDraft,
  stepId: string,
  referenceId: string,
): WorkflowDraft {
  return updateStep(draft, stepId, {
    referenceIds: Array.from(
      new Set([
        ...(draft.steps.find((step) => step.id === stepId)?.referenceIds ?? []),
        referenceId,
      ]),
    ),
  });
}

function defaultStep(title = "New step"): WorkflowStepSpec {
  return {
    id: newId("step"),
    title,
    mode: "agentic",
    actions: [],
    referenceIds: [],
  };
}

function defaultCondition(): WorkflowConditionSpec {
  return {
    id: newId("condition"),
    label: "Condition",
    mode: "agentic",
    enforcement: "soft",
    description: "",
  };
}

function defaultReference(kind: WorkflowReferenceSpec["kind"] = "url"): WorkflowReferenceSpec {
  return {
    id: newId("ref"),
    title: "Reference",
    kind,
    body: kind === "inline" ? "" : undefined,
    url: undefined,
    workflowKey: kind === "workflow" ? "target_workflow" : undefined,
  };
}

function defaultRoute(conditionId?: string): WorkflowRouteSpec {
  return {
    id: newId("route"),
    targetWorkflowKey: "target_workflow",
    conditionId,
    label: "Handoff",
  };
}

function insertStepAt(draft: WorkflowDraft, index: number, step: WorkflowStepSpec): WorkflowDraft {
  const steps = [...draft.steps];
  if (steps.length === 1 && steps[0]?.id === "execute" && steps[0].actions.length === 0) {
    return { ...draft, steps: [step] };
  }
  steps.splice(index, 0, step);
  return { ...draft, steps };
}

function resolveStepId(sourceNodeId: string): string | null {
  if (sourceNodeId.startsWith("condition:")) return null;
  if (sourceNodeId.startsWith("reference:")) return null;
  if (sourceNodeId.startsWith("route:")) return null;
  if (["trigger", "context", "output"].includes(sourceNodeId)) return null;
  return sourceNodeId;
}

export type InsertBlockResult = {
  draft: WorkflowDraft;
  focusNodeId: string;
};

export function insertBlockAfter(
  draft: WorkflowDraft,
  sourceNodeId: string,
  kind: WorkflowFlowNodeKind,
): InsertBlockResult {
  if (kind === "trigger" || kind === "context" || kind === "output") {
    return { draft, focusNodeId: sourceNodeId };
  }

  if (sourceNodeId === "context") {
    if (kind === "condition") {
      const condition = defaultCondition();
      return {
        draft: { ...draft, conditions: [...draft.conditions, condition] },
        focusNodeId: `condition:${condition.id}`,
      };
    }
    if (kind === "route") {
      const route = defaultRoute();
      return {
        draft: { ...draft, routes: [...draft.routes, route] },
        focusNodeId: `route:${route.id}`,
      };
    }
    if (kind === "step") {
      const step = defaultStep();
      return {
        draft: insertStepAt(draft, 0, step),
        focusNodeId: step.id,
      };
    }
  }

  if (sourceNodeId.startsWith("condition:")) {
    const conditionId = sourceNodeId.slice("condition:".length);
    if (kind === "step") {
      const step = defaultStep();
      const nextDraft = insertStepAt(draft, 0, step);
      return { draft: nextDraft, focusNodeId: step.id };
    }
    if (kind === "route") {
      const route = defaultRoute(conditionId);
      return {
        draft: { ...draft, routes: [...draft.routes, route] },
        focusNodeId: `route:${route.id}`,
      };
    }
    if (kind === "gate") {
      const step = { ...defaultStep("Review gate"), gate: { id: newId("gate"), policy: {}, required: true } };
      return {
        draft: insertStepAt(draft, 0, step),
        focusNodeId: step.id,
      };
    }
  }

  const stepId = resolveStepId(sourceNodeId);
  if (stepId) {
    const stepIndex = draft.steps.findIndex((step) => step.id === stepId);
    if (stepIndex === -1) {
      return { draft, focusNodeId: sourceNodeId };
    }

    if (kind === "step") {
      const step = defaultStep();
      return {
        draft: insertStepAt(draft, stepIndex + 1, step),
        focusNodeId: step.id,
      };
    }

    if (kind === "gate") {
      const step = {
        ...defaultStep("Review gate"),
        gate: { id: newId("gate"), policy: {}, required: true, reason: "" },
      };
      return {
        draft: insertStepAt(draft, stepIndex + 1, step),
        focusNodeId: step.id,
      };
    }

    if (kind === "condition") {
      const condition = defaultCondition();
      return {
        draft: { ...draft, conditions: [...draft.conditions, condition] },
        focusNodeId: `condition:${condition.id}`,
      };
    }

    if (kind === "reference") {
      const reference = defaultReference("url");
      const nextDraft = {
        ...draft,
        references: [...draft.references, reference],
      };
      return {
        draft: linkReferenceToStep(nextDraft, stepId, reference.id),
        focusNodeId: `reference:${reference.id}`,
      };
    }

    if (kind === "route") {
      const route = defaultRoute();
      const nextDraft = {
        ...draft,
        routes: [...draft.routes, route],
        steps: draft.steps.map((step) =>
          step.id === stepId
            ? { ...step, routeToWorkflowKey: route.targetWorkflowKey }
            : step,
        ),
      };
      return {
        draft: nextDraft,
        focusNodeId: `route:${route.id}`,
      };
    }
  }

  return { draft, focusNodeId: sourceNodeId };
}

const PROTECTED_STEP_IDS = new Set(["execute"]);

export function removeBlock(draft: WorkflowDraft, nodeId: string): WorkflowDraft {
  if (["trigger", "context", "output"].includes(nodeId)) {
    return draft;
  }

  if (nodeId.startsWith("condition:")) {
    const conditionId = nodeId.slice("condition:".length);
    return {
      ...draft,
      conditions: draft.conditions.filter((condition) => condition.id !== conditionId),
      routes: draft.routes.map((route) =>
        route.conditionId === conditionId ? { ...route, conditionId: undefined } : route,
      ),
    };
  }

  if (nodeId.startsWith("reference:")) {
    const referenceId = nodeId.slice("reference:".length);
    return {
      ...draft,
      references: draft.references.filter((reference) => reference.id !== referenceId),
      steps: draft.steps.map((step) => ({
        ...step,
        referenceIds: step.referenceIds.filter((id) => id !== referenceId),
      })),
    };
  }

  if (nodeId.startsWith("route:")) {
    const routeId = nodeId.slice("route:".length);
    const removed = draft.routes.find((route) => route.id === routeId);
    return {
      ...draft,
      routes: draft.routes.filter((route) => route.id !== routeId),
      steps: draft.steps.map((step) =>
        removed && step.routeToWorkflowKey === removed.targetWorkflowKey
          ? { ...step, routeToWorkflowKey: undefined }
          : step,
      ),
    };
  }

  if (PROTECTED_STEP_IDS.has(nodeId) && draft.steps.length <= 1) {
    return draft;
  }

  const remainingSteps = draft.steps.filter((step) => step.id !== nodeId);
  if (remainingSteps.length === 0) {
    return {
      ...draft,
      steps: [defaultStep(draft.title || "Workflow")],
    };
  }

  return { ...draft, steps: remainingSteps };
}

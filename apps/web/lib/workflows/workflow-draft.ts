import type {
  RouteBlock,
  RouteOutlet,
  RouteOutletTarget,
  Workflow,
  WorkflowBlockRef,
  WorkflowDefinition,
  WorkflowExternalLink,
  WorkflowGateSpec,
  WorkflowStepSpec,
  WorkflowTriggerEvent,
  ContextSpec,
} from "@ssota/contracts";
import type { WorkflowFlowNodeKind } from "@/lib/workflows/workflow-flow-model";
import {
  parseRouteNodeId,
  parseWorkflowBlockNodeId,
} from "@/lib/workflows/workflow-flow-model";

export type WorkflowDraft = WorkflowDefinition;

export type WorkflowDraftPatch = {
  flowEntry?: WorkflowDefinition["flowEntry"];
  steps?: WorkflowStepSpec[];
  routeBlocks?: RouteBlock[];
  workflowBlocks?: WorkflowBlockRef[];
  gates?: WorkflowGateSpec[];
  trigger?: WorkflowDefinition["trigger"];
  context?: ContextSpec;
};

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export function normalizeRouteInstructions(route: RouteBlock): RouteBlock {
  const routingUrl = route.routingInstructionUrl?.trim();
  if (!routingUrl) {
    return { ...route, routingInstructionUrl: null };
  }
  if (route.links.some((link) => link.url === routingUrl)) {
    return { ...route, routingInstructionUrl: null };
  }
  return {
    ...route,
    links: [
      { id: newId("link"), label: "Instruction", url: routingUrl },
      ...route.links,
    ],
    routingInstructionUrl: null,
  };
}

export function createWorkflowDraft(workflow: Workflow): WorkflowDraft {
  const { id: _id, slug: _slug, createdAt: _c, updatedAt: _u, ...definition } =
    workflow;
  const cloned = structuredClone(definition);
  return {
    ...cloned,
    routeBlocks: cloned.routeBlocks.map(normalizeRouteInstructions),
  };
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
    flowEntry: draft.flowEntry,
    steps: draft.steps,
    routeBlocks: draft.routeBlocks,
    workflowBlocks: draft.workflowBlocks,
    gates: draft.gates,
    trigger: draft.trigger,
    context: draft.context,
  };
}

export function updateWorkflowRole(
  draft: WorkflowDraft,
  workflowRole: string | undefined,
): WorkflowDraft {
  return { ...draft, workflowRole: workflowRole?.trim() || undefined };
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

export function updateAgentNotes(
  draft: WorkflowDraft,
  agentNotes: string | null | undefined,
): WorkflowDraft {
  return { ...draft, agentNotes: agentNotes?.trim() || null };
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

export function updateRouteBlock(
  draft: WorkflowDraft,
  routeId: string,
  patch: Partial<RouteBlock>,
): WorkflowDraft {
  return {
    ...draft,
    routeBlocks: draft.routeBlocks.map((route) =>
      route.id === routeId ? { ...route, ...patch } : route,
    ),
  };
}

export function updateRouteOutlet(
  draft: WorkflowDraft,
  routeId: string,
  outletId: string,
  patch: Partial<RouteOutlet>,
): WorkflowDraft {
  return updateRouteBlock(draft, routeId, {
    outlets: draft.routeBlocks
      .find((route) => route.id === routeId)
      ?.outlets.map((outlet) =>
        outlet.id === outletId ? { ...outlet, ...patch } : outlet,
      ),
  });
}

export function addRouteOutlet(
  draft: WorkflowDraft,
  routeId: string,
  label = "Outlet",
): WorkflowDraft {
  const outlet: RouteOutlet = { id: newId("outlet"), label, target: null };
  return updateRouteBlock(draft, routeId, {
    outlets: [
      ...(draft.routeBlocks.find((route) => route.id === routeId)?.outlets ?? []),
      outlet,
    ],
  });
}

export function removeRouteOutlet(
  draft: WorkflowDraft,
  routeId: string,
  outletId: string,
): WorkflowDraft {
  return updateRouteBlock(draft, routeId, {
    outlets: draft.routeBlocks
      .find((route) => route.id === routeId)
      ?.outlets.filter((outlet) => outlet.id !== outletId),
  });
}

export function addRouteLink(
  draft: WorkflowDraft,
  routeId: string,
  link: WorkflowExternalLink,
): WorkflowDraft {
  const route = draft.routeBlocks.find((item) => item.id === routeId);
  if (!route) return draft;
  return updateRouteBlock(draft, routeId, {
    links: [...route.links, link],
  });
}

export function removeRouteLink(
  draft: WorkflowDraft,
  routeId: string,
  linkId: string,
): WorkflowDraft {
  const route = draft.routeBlocks.find((item) => item.id === routeId);
  if (!route) return draft;
  return updateRouteBlock(draft, routeId, {
    links: route.links.filter((link) => link.id !== linkId),
  });
}

export function updateWorkflowBlock(
  draft: WorkflowDraft,
  workflowBlockId: string,
  patch: Partial<WorkflowBlockRef>,
): WorkflowDraft {
  return {
    ...draft,
    workflowBlocks: draft.workflowBlocks.map((block) =>
      block.id === workflowBlockId ? { ...block, ...patch } : block,
    ),
  };
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

function defaultRouteBlock(label = "Route"): RouteBlock {
  return {
    id: newId("route"),
    label,
    routingInstructionUrl: undefined,
    links: [],
    outlets: [{ id: newId("outlet"), label: "default", target: null }],
  };
}

function defaultWorkflowBlock(workflowKey = "target_workflow"): WorkflowBlockRef {
  return {
    id: newId("wf"),
    label: workflowKey,
    workflowKey,
  };
}

function setOutletTarget(
  draft: WorkflowDraft,
  routeId: string,
  outletId: string,
  target: RouteOutletTarget,
): WorkflowDraft {
  return updateRouteBlock(draft, routeId, {
    outlets: draft.routeBlocks
      .find((route) => route.id === routeId)
      ?.outlets.map((outlet) =>
        outlet.id === outletId ? { ...outlet, target } : outlet,
      ),
  });
}

function insertStepAt(draft: WorkflowDraft, index: number, step: WorkflowStepSpec): WorkflowDraft {
  const steps = [...draft.steps];
  if (steps.length === 1 && steps[0]?.id === "execute" && steps[0].actions.length === 0) {
    return { ...draft, steps: [step] };
  }
  steps.splice(index, 0, step);
  return { ...draft, steps };
}

function spliceStepAfter(
  draft: WorkflowDraft,
  stepIndex: number,
  newStep: WorkflowStepSpec,
): WorkflowDraft {
  const prior = draft.steps[stepIndex];
  const oldNextId = prior?.nextStepId;
  let nextDraft = insertStepAt(draft, stepIndex + 1, newStep);
  if (prior) {
    nextDraft = updateStep(nextDraft, prior.id, { nextStepId: newStep.id });
    if (oldNextId) {
      nextDraft = updateStep(nextDraft, newStep.id, { nextStepId: oldNextId });
    }
  }
  return nextDraft;
}

function resolveOutletForConnection(
  draft: WorkflowDraft,
  routeId: string,
  outletId?: string,
): { draft: WorkflowDraft; outletId: string | null } {
  const route = draft.routeBlocks.find((item) => item.id === routeId);
  if (!route) return { draft, outletId: null };

  if (outletId) {
    const outlet = route.outlets.find((item) => item.id === outletId);
    if (outlet && !outlet.target) {
      return { draft, outletId };
    }
    const withOutlet = addRouteOutlet(draft, routeId);
    const nextRoute = withOutlet.routeBlocks.find((item) => item.id === routeId);
    return { draft: withOutlet, outletId: nextRoute?.outlets.at(-1)?.id ?? null };
  }

  const emptyOutlet = route.outlets.find((item) => !item.target);
  if (emptyOutlet) {
    return { draft, outletId: emptyOutlet.id };
  }

  const withOutlet = addRouteOutlet(draft, routeId);
  const nextRoute = withOutlet.routeBlocks.find((item) => item.id === routeId);
  return { draft: withOutlet, outletId: nextRoute?.outlets.at(-1)?.id ?? null };
}

function connectOutletToNewBlock(
  draft: WorkflowDraft,
  routeId: string,
  outletId: string | undefined,
  target: RouteOutletTarget,
): WorkflowDraft {
  const { draft: withOutlet, outletId: resolvedOutletId } = resolveOutletForConnection(
    draft,
    routeId,
    outletId,
  );

  if (!resolvedOutletId) return draft;

  return setOutletTarget(withOutlet, routeId, resolvedOutletId, target);
}

export type InsertBlockResult = {
  draft: WorkflowDraft;
  focusNodeId: string;
};

export function insertBlockAfter(
  draft: WorkflowDraft,
  sourceNodeId: string,
  kind: WorkflowFlowNodeKind,
  outletId?: string,
): InsertBlockResult {
  if (kind === "trigger" || kind === "context") {
    return { draft, focusNodeId: sourceNodeId };
  }

  if (sourceNodeId === "context") {
    if (kind === "route") {
      const route = defaultRouteBlock();
      const nextDraft: WorkflowDraft = {
        ...draft,
        routeBlocks: [...draft.routeBlocks, route],
        flowEntry: { kind: "route", routeId: route.id },
      };
      return { draft: nextDraft, focusNodeId: `route:${route.id}` };
    }
    if (kind === "step") {
      const step = defaultStep();
      const nextDraft = {
        ...insertStepAt(draft, 0, step),
        flowEntry: { kind: "step" as const, stepId: step.id },
      };
      return { draft: nextDraft, focusNodeId: step.id };
    }
    if (kind === "workflow") {
      const block = defaultWorkflowBlock();
      const route = defaultRouteBlock("Dispatch");
      const routeWithTarget = {
        ...route,
        outlets: [
          {
            id: newId("outlet"),
            label: block.workflowKey,
            target: { kind: "workflow" as const, workflowBlockId: block.id },
          },
        ],
      };
      const nextDraft: WorkflowDraft = {
        ...draft,
        workflowBlocks: [...draft.workflowBlocks, block],
        routeBlocks: [...draft.routeBlocks, routeWithTarget],
        flowEntry: { kind: "route", routeId: routeWithTarget.id },
      };
      return { draft: nextDraft, focusNodeId: `workflow:${block.id}` };
    }
  }

  const routeIdFromNode = parseRouteNodeId(sourceNodeId);
  if (routeIdFromNode) {
    if (kind === "step") {
      const step = defaultStep();
      const withStep = insertStepAt(draft, draft.steps.length, step);
      const connected = connectOutletToNewBlock(
        withStep,
        routeIdFromNode,
        outletId,
        { kind: "step", stepId: step.id },
      );
      return { draft: connected, focusNodeId: step.id };
    }
    if (kind === "route") {
      const route = defaultRouteBlock();
      const withRoute = {
        ...draft,
        routeBlocks: [...draft.routeBlocks, route],
      };
      const connected = connectOutletToNewBlock(
        withRoute,
        routeIdFromNode,
        outletId,
        { kind: "route", routeId: route.id },
      );
      return { draft: connected, focusNodeId: `route:${route.id}` };
    }
    if (kind === "workflow") {
      const block = defaultWorkflowBlock();
      const withBlock = {
        ...draft,
        workflowBlocks: [...draft.workflowBlocks, block],
      };
      const connected = connectOutletToNewBlock(
        withBlock,
        routeIdFromNode,
        outletId,
        { kind: "workflow", workflowBlockId: block.id },
      );
      return { draft: connected, focusNodeId: `workflow:${block.id}` };
    }
  }

  const stepId = !sourceNodeId.includes(":")
    ? sourceNodeId
  : null;

  if (stepId && draft.steps.some((step) => step.id === stepId)) {
    const stepIndex = draft.steps.findIndex((step) => step.id === stepId);

    if (kind === "step") {
      const step = defaultStep();
      const nextDraft = spliceStepAfter(draft, stepIndex, step);
      return { draft: nextDraft, focusNodeId: step.id };
    }

    if (kind === "gate") {
      const step = {
        ...defaultStep("Review gate"),
        gate: { id: newId("gate"), policy: {}, required: true, reason: "" },
      };
      const nextDraft = spliceStepAfter(draft, stepIndex, step);
      return { draft: nextDraft, focusNodeId: step.id };
    }

    if (kind === "route") {
      const route = defaultRouteBlock();
      const prior = draft.steps[stepIndex];
      const nextDraft = {
        ...draft,
        routeBlocks: [...draft.routeBlocks, route],
      };
      if (prior) {
        return {
          draft: updateStep(nextDraft, prior.id, { nextStepId: undefined }),
          focusNodeId: `route:${route.id}`,
        };
      }
      return {
        draft: {
          ...nextDraft,
          flowEntry: { kind: "route", routeId: route.id },
        },
        focusNodeId: `route:${route.id}`,
      };
    }
  }

  return { draft, focusNodeId: sourceNodeId };
}

const PROTECTED_STEP_IDS = new Set(["execute"]);

function clearOutletTargets(
  draft: WorkflowDraft,
  predicate: (target: RouteOutletTarget) => boolean,
): WorkflowDraft {
  return {
    ...draft,
    routeBlocks: draft.routeBlocks.map((route) => ({
      ...route,
      outlets: route.outlets.map((outlet) => ({
        ...outlet,
        target: outlet.target && predicate(outlet.target) ? null : outlet.target,
      })),
    })),
  };
}

export function removeBlock(draft: WorkflowDraft, nodeId: string): WorkflowDraft {
  if (["trigger", "context"].includes(nodeId)) {
    return draft;
  }

  const routeId = parseRouteNodeId(nodeId);
  if (routeId) {
    const nextBlocks = draft.routeBlocks.filter((route) => route.id !== routeId);
    return {
      ...clearOutletTargets(draft, (target) =>
        target.kind === "route" && target.routeId === routeId,
      ),
      routeBlocks: nextBlocks,
      flowEntry:
        draft.flowEntry?.kind === "route" && draft.flowEntry.routeId === routeId
          ? nextBlocks[0]
            ? { kind: "route", routeId: nextBlocks[0].id }
            : draft.steps[0]
              ? { kind: "step", stepId: draft.steps[0].id }
              : undefined
          : draft.flowEntry,
    };
  }

  const workflowBlockId = parseWorkflowBlockNodeId(nodeId);
  if (workflowBlockId) {
    return {
      ...clearOutletTargets(draft, (target) =>
        target.kind === "workflow" && target.workflowBlockId === workflowBlockId,
      ),
      workflowBlocks: draft.workflowBlocks.filter(
        (block) => block.id !== workflowBlockId,
      ),
    };
  }

  if (PROTECTED_STEP_IDS.has(nodeId) && draft.steps.length <= 1) {
    return draft;
  }

  const remainingSteps = draft.steps.filter((step) => step.id !== nodeId);
  const nextDraft = clearOutletTargets(draft, (target) =>
    target.kind === "step" && target.stepId === nodeId,
  );

  if (remainingSteps.length === 0 && nextDraft.routeBlocks.length === 0) {
    return {
      ...nextDraft,
      steps: [defaultStep(nextDraft.title || "Workflow")],
    };
  }

  const stepsWithNext = nextDraft.steps
    .filter((step) => step.id !== nodeId)
    .map((step) =>
      step.nextStepId === nodeId ? { ...step, nextStepId: undefined } : step,
    );

  return {
    ...nextDraft,
    steps: stepsWithNext,
    flowEntry:
      nextDraft.flowEntry?.kind === "step" && nextDraft.flowEntry.stepId === nodeId
        ? remainingSteps[0]
          ? { kind: "step", stepId: remainingSteps[0].id }
          : nextDraft.routeBlocks[0]
            ? { kind: "route", routeId: nextDraft.routeBlocks[0].id }
            : undefined
        : nextDraft.flowEntry,
  };
}

import type {
  RouteBlock,
  RouteOutlet,
  RouteOutletTarget,
  WorkflowBlockRef,
  WorkflowFlowEntry,
} from "./workflow-graph.js";
import type {
  WorkflowConditionSpec,
  WorkflowDefinition,
  WorkflowOutputSpec,
  WorkflowReferenceSpec,
  WorkflowRouteSpec,
  WorkflowStepSpec,
} from "./workflow.js";

function newId(prefix: string): string {
  return `${prefix}_migrated`;
}

function appendAgentNote(
  agentNotes: string | null | undefined,
  note: string,
): string {
  const trimmed = agentNotes?.trim();
  if (!trimmed) return note;
  if (trimmed.includes(note)) return trimmed;
  return `${trimmed}\n\n${note}`;
}

function migrateOutputToAgentNotes(
  output: WorkflowOutputSpec | undefined,
  agentNotes: string | null | undefined,
): string | null | undefined {
  if (!output) return agentNotes;
  const parts: string[] = [];
  if (output.completionCriteria?.trim()) {
    parts.push(`Completion: ${output.completionCriteria.trim()}`);
  }
  if (output.format?.trim()) {
    parts.push(`Format: ${output.format.trim()}`);
  }
  if (Object.keys(output.contract).length > 0) {
    parts.push(`Contract: ${JSON.stringify(output.contract)}`);
  }
  if (parts.length === 0) return agentNotes;
  return appendAgentNote(agentNotes, parts.join("\n"));
}

function migrateReferencesToSteps(
  steps: WorkflowStepSpec[],
  references: WorkflowReferenceSpec[],
): WorkflowStepSpec[] {
  if (references.length === 0) return steps;

  const referenceById = new Map(references.map((ref) => [ref.id, ref]));

  return steps.map((step) => {
    if (step.instructionUrl) return step;

    const linked = step.referenceIds
      .map((id) => referenceById.get(id))
      .filter((ref): ref is WorkflowReferenceSpec => Boolean(ref));

    const urlRef = linked.find((ref) => ref.kind === "url" && ref.url);
    if (urlRef?.url) {
      return { ...step, instructionUrl: urlRef.url };
    }

    const inlineRef = linked.find((ref) => ref.kind === "inline" && ref.body?.trim());
    if (inlineRef?.body) {
      return {
        ...step,
        description: step.description
          ? `${step.description}\n\n${inlineRef.body}`
          : inlineRef.body,
      };
    }

    return step;
  });
}

function legacyRoutesToGraph(
  routes: WorkflowRouteSpec[],
  conditions: WorkflowConditionSpec[],
  steps: WorkflowStepSpec[],
): {
  routeBlocks: RouteBlock[];
  workflowBlocks: WorkflowBlockRef[];
  flowEntry?: WorkflowFlowEntry;
} {
  if (routes.length === 0 && conditions.length === 0) {
    return { routeBlocks: [], workflowBlocks: [] };
  }

  const workflowBlocks: WorkflowBlockRef[] = routes.map((route) => ({
    id: `wf_${route.id}`,
    label: route.label ?? route.targetWorkflowKey,
    workflowKey: route.targetWorkflowKey,
  }));

  const workflowBlockByRouteId = new Map(
    routes.map((route) => [`wf_${route.id}`, route.id]),
  );

  const outlets: RouteOutlet[] = [];

  if (conditions.length > 0) {
    const condition = conditions[0]!;
    if (steps[0]) {
      outlets.push({
        id: `${condition.id}_out_continue`,
        label: condition.label ?? "continue",
        target: { kind: "step", stepId: steps[0].id },
      });
    }
    for (const route of routes) {
      outlets.push({
        id: `${route.id}_out`,
        label: route.label ?? route.targetWorkflowKey,
        target: {
          kind: "workflow",
          workflowBlockId: `wf_${route.id}`,
        },
      });
    }
  } else {
    for (const route of routes) {
      outlets.push({
        id: `${route.id}_out`,
        label: route.label ?? route.targetWorkflowKey,
        target: {
          kind: "workflow",
          workflowBlockId: `wf_${route.id}`,
        },
      });
    }
    if (steps[0] && outlets.length === 0) {
      outlets.push({
        id: "default_out",
        label: "continue",
        target: { kind: "step", stepId: steps[0].id },
      });
    }
  }

  const routeBlock: RouteBlock = {
    id: conditions[0]?.id ?? routes[0]?.id ?? newId("route"),
    label: conditions[0]?.label ?? routes[0]?.label ?? "Route",
    routingInstructionUrl: undefined,
    links: [],
    outlets,
  };

  void workflowBlockByRouteId;

  return {
    routeBlocks: [routeBlock],
    workflowBlocks,
    flowEntry: { kind: "route", routeId: routeBlock.id },
  };
}

function inferFlowEntry(
  flowEntry: WorkflowFlowEntry | undefined,
  routeBlocks: RouteBlock[],
  steps: WorkflowStepSpec[],
): WorkflowFlowEntry | undefined {
  if (flowEntry) return flowEntry;
  if (routeBlocks[0]) return { kind: "route", routeId: routeBlocks[0].id };
  if (steps[0]) return { kind: "step", stepId: steps[0].id };
  return undefined;
}

function linkStepChain(steps: WorkflowStepSpec[]): WorkflowStepSpec[] {
  if (steps.length <= 1) return steps;
  return steps.map((step, index) => {
    const next = steps[index + 1];
    if (!next || step.nextStepId) return step;
    return { ...step, nextStepId: next.id };
  });
}

/** Normalize legacy conditions/routes/references/output into routeBlocks + workflowBlocks. */
export function migrateWorkflowGraph(
  definition: WorkflowDefinition,
): WorkflowDefinition {
  const hasNewGraph =
    definition.routeBlocks.length > 0 || definition.workflowBlocks.length > 0;

  let routeBlocks = definition.routeBlocks;
  let workflowBlocks = definition.workflowBlocks;
  let flowEntry = definition.flowEntry;

  if (!hasNewGraph) {
    const migrated = legacyRoutesToGraph(
      definition.routes,
      definition.conditions,
      definition.steps,
    );
    routeBlocks = migrated.routeBlocks;
    workflowBlocks = migrated.workflowBlocks;
    flowEntry = migrated.flowEntry ?? flowEntry;
  }

  const steps = linkStepChain(
    migrateReferencesToSteps(definition.steps, definition.references),
  );

  const agentNotes = migrateOutputToAgentNotes(
    definition.output,
    definition.agentNotes,
  );

  return {
    ...definition,
    steps,
    routeBlocks,
    workflowBlocks,
    flowEntry: inferFlowEntry(flowEntry, routeBlocks, steps),
    agentNotes,
    conditions: [],
    routes: [],
    references: [],
    output: { contract: {} },
  };
}

export function resolveOutletTargetNodeId(target: RouteOutletTarget): string {
  switch (target.kind) {
    case "step":
      return target.stepId;
    case "route":
      return `route:${target.routeId}`;
    case "workflow":
      return `workflow:${target.workflowBlockId}`;
  }
}

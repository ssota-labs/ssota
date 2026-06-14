import type { Workflow, WorkflowStepSpec } from "@ssota/contracts";
import type { ComponentType } from "react";
import type { Edge, Node } from "@xyflow/react";
import { getWorkflowTriggerMeta } from "@/lib/workflows/workflow-trigger-catalog";
import {
  estimateGraphNodeWidth,
  layoutGraphWithDagre,
} from "@/lib/graph/dagre-layout";

export type WorkflowFlowNodeKind =
  | "trigger"
  | "context"
  | "step"
  | "gate"
  | "condition"
  | "output"
  | "reference"
  | "route";

export type WorkflowFlowNodeData = {
  nodeId?: string;
  label: string;
  eyebrow?: string;
  description?: string;
  badges?: string[];
  kind: WorkflowFlowNodeKind;
  stepId?: string;
  conditionId?: string;
  gateId?: string;
  referenceId?: string;
  routeId?: string;
  layoutWidth?: number;
  addOptions?: WorkflowFlowNodeKind[];
  onAddNode?: (sourceNodeId: string, kind: WorkflowFlowNodeKind) => void;
  AddIcon?: ComponentType<{ className?: string }>;
};

export type WorkflowFlowNode = Node<WorkflowFlowNodeData, "workflowNode">;
export type WorkflowFlowEdge = Edge;

const DEFAULT_STEP: WorkflowStepSpec = {
  id: "step_1",
  title: "New step",
  mode: "agentic",
  actions: [],
  referenceIds: [],
};

function contextSummary(workflow: Workflow): string | undefined {
  const parts: string[] = [];
  if (workflow.context.filterGroups.length) {
    parts.push(`${workflow.context.filterGroups.length} filter groups`);
  }
  if (workflow.context.traversals.length) {
    parts.push(`${workflow.context.traversals.length} traversals`);
  }
  if (workflow.context.assertions.length) {
    parts.push(`${workflow.context.assertions.length} assertions`);
  }
  return parts.length ? parts.join(" · ") : workflow.context.notes;
}

function stepBadges(step: WorkflowStepSpec): string[] | undefined {
  const actions = step.actions.map((ref) => ref.actionType);
  return actions.length ? actions : undefined;
}

type DraftNodeInput = {
  id: string;
  kind: WorkflowFlowNodeKind;
  label: string;
  eyebrow?: string;
  description?: string;
  badges?: string[];
  stepId?: string;
  conditionId?: string;
  gateId?: string;
  referenceId?: string;
  routeId?: string;
};

function buildNode(input: DraftNodeInput): WorkflowFlowNode {
  return {
    id: input.id,
    type: "workflowNode",
    position: { x: 0, y: 0 },
    data: {
      kind: input.kind,
      eyebrow: input.eyebrow ?? input.kind,
      label: input.label,
      description: input.description,
      badges: input.badges,
      stepId: input.stepId,
      conditionId: input.conditionId,
      gateId: input.gateId,
      referenceId: input.referenceId,
      routeId: input.routeId,
      layoutWidth: estimateGraphNodeWidth({
        label: input.label,
        description: input.description,
        badges: input.badges,
      }),
    },
  };
}

export function layoutWorkflowGraph(
  nodes: WorkflowFlowNode[],
  edges: WorkflowFlowEdge[],
): {
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
} {
  const layouted = layoutGraphWithDagre(nodes, edges, "LR", {
    getNodeSize: (node) => ({
      width: node.data.layoutWidth ?? 220,
      height: node.data.kind === "reference" ? 96 : 120,
    }),
  });

  const stepByReference = new Map<string, WorkflowFlowNode>();
  for (const edge of edges) {
    if ((edge.data as { kind?: string } | undefined)?.kind !== "reference") {
      continue;
    }
    const source = layouted.nodes.find((node) => node.id === edge.source);
    if (source) stepByReference.set(edge.target, source as WorkflowFlowNode);
  }

  return {
    nodes: (layouted.nodes as WorkflowFlowNode[]).map((node) => {
      const source = stepByReference.get(node.id);
      if (!source) return node;
      return {
        ...node,
        position: {
          x: source.position.x,
          y: source.position.y + 150,
        },
      };
    }),
    edges: layouted.edges,
  };
}

/** Build React Flow nodes/edges from Workflow SSOT with condition, route, and reference branches. */
export function workflowToFlowGraph(workflow: Workflow): {
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
} {
  const steps =
    workflow.steps.length > 0 ? workflow.steps : [{ ...DEFAULT_STEP, title: workflow.title }];

  const nodes: WorkflowFlowNode[] = [
    buildNode({
      id: "trigger",
      kind: "trigger",
      eyebrow: "trigger",
      label: "Trigger",
      description:
        workflow.trigger.events
          .filter((event) => event.enabled)
          .map((event) => getWorkflowTriggerMeta(event.kind).label)
          .join(", ") || "No active triggers",
    }),
    buildNode({
      id: "context",
      kind: "context",
      eyebrow: "context",
      label: "Context",
      description: contextSummary(workflow) ?? "Assemble graph context",
      badges:
        (workflow.nodeBindings.length
          ? workflow.nodeBindings.map((binding) => binding.nodeType)
          : workflow.applicableNodeTypes.length
            ? workflow.applicableNodeTypes
            : undefined),
    }),
    ...workflow.conditions.map((condition) =>
      buildNode({
        id: `condition:${condition.id}`,
        kind: "condition",
        eyebrow: "condition",
        label: condition.label ?? condition.id,
        description: condition.description ?? condition.expression,
        badges: [condition.mode, condition.enforcement],
        conditionId: condition.id,
      }),
    ),
    ...steps.map((step) =>
      buildNode({
        id: step.id,
        kind: step.gate ? "gate" : "step",
        eyebrow: step.gate ? "review" : "step",
        label: step.title,
        description: step.description ?? step.output,
        badges: stepBadges(step),
        stepId: step.id,
        gateId: step.gate?.id,
      }),
    ),
    ...workflow.references.map((reference) =>
      buildNode({
        id: `reference:${reference.id}`,
        kind: "reference",
        eyebrow: "reference",
        label: reference.title,
        description:
          reference.kind === "url"
            ? (reference.url ?? undefined)
            : reference.kind === "workflow"
              ? reference.workflowKey
              : reference.body ?? undefined,
        badges: [reference.kind],
        referenceId: reference.id,
      }),
    ),
    ...workflow.routes.map((route) =>
      buildNode({
        id: `route:${route.id}`,
        kind: "route",
        eyebrow: "route",
        label: route.label ?? route.targetWorkflowKey,
        description: route.conditionId
          ? `When ${route.conditionId}`
          : "Handoff workflow",
        badges: [route.targetWorkflowKey],
        routeId: route.id,
        conditionId: route.conditionId,
      }),
    ),
    buildNode({
      id: "output",
      kind: "output",
      eyebrow: "output",
      label: "Output",
      description:
        workflow.output.completionCriteria ??
        (Object.keys(workflow.output.contract).length
          ? `${Object.keys(workflow.output.contract).length} contract fields`
          : "Completion criteria"),
    }),
  ];

  const edges: WorkflowFlowEdge[] = [];
  edges.push({
    id: "edge-trigger-context",
    source: "trigger",
    target: "context",
  });

  const firstStep = steps[0];
  const workflowCondition = workflow.conditions[0];
  const firstRoute = workflow.routes[0];

  if (workflowCondition) {
    edges.push({
      id: `edge-context-condition-${workflowCondition.id}`,
      source: "context",
      target: `condition:${workflowCondition.id}`,
    });
    if (firstStep) {
      edges.push({
        id: `edge-condition-${workflowCondition.id}-yes`,
        source: `condition:${workflowCondition.id}`,
        target: firstStep.id,
        label: "yes",
      });
    }
    if (firstRoute) {
      edges.push({
        id: `edge-condition-${workflowCondition.id}-route-${firstRoute.id}`,
        source: `condition:${workflowCondition.id}`,
        target: `route:${firstRoute.id}`,
        label: "no",
      });
    }
  } else if (firstStep) {
    edges.push({
      id: `edge-context-${firstStep.id}`,
      source: "context",
      target: firstStep.id,
    });
  } else {
    edges.push({
      id: "edge-context-output",
      source: "context",
      target: "output",
    });
  }

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index]!;
    const nextStep = steps[index + 1];
    const stepCondition = step.conditionId
      ? workflow.conditions.find((condition) => condition.id === step.conditionId)
      : null;

    for (const referenceId of step.referenceIds) {
      if (!workflow.references.some((reference) => reference.id === referenceId)) {
        continue;
      }
      edges.push({
        id: `edge-${step.id}-reference-${referenceId}`,
        source: step.id,
        target: `reference:${referenceId}`,
        label: "uses",
        type: "smoothstep",
        animated: false,
        data: { kind: "reference" },
        style: { strokeDasharray: "5 5" },
      });
    }

    if (step.routeToWorkflowKey) {
      const route = workflow.routes.find(
        (candidate) => candidate.targetWorkflowKey === step.routeToWorkflowKey,
      );
      if (route) {
        edges.push({
          id: `edge-${step.id}-route-${route.id}`,
          source: step.id,
          target: `route:${route.id}`,
          label: "handoff",
        });
      }
    }

    if (stepCondition) {
      edges.push({
        id: `edge-${step.id}-condition-${stepCondition.id}`,
        source: step.id,
        target: `condition:${stepCondition.id}`,
      });
      if (nextStep) {
        edges.push({
          id: `edge-condition-${stepCondition.id}-next-${nextStep.id}`,
          source: `condition:${stepCondition.id}`,
          target: nextStep.id,
          label: "yes",
        });
      }
      if (firstRoute) {
        edges.push({
          id: `edge-condition-${stepCondition.id}-route-${firstRoute.id}`,
          source: `condition:${stepCondition.id}`,
          target: `route:${firstRoute.id}`,
          label: "no",
        });
      }
      continue;
    }

    edges.push({
      id: nextStep ? `edge-${step.id}-${nextStep.id}` : `edge-${step.id}-output`,
      source: step.id,
      target: nextStep?.id ?? "output",
      label: step.gate ? "approved" : step.actions[0]?.actionType,
    });
  }

  return layoutWorkflowGraph(nodes, edges);
}

/** Ordered step ids from canvas (trigger → context → steps → output path). */
export function extractStepOrderFromGraph(
  nodes: WorkflowFlowNode[],
  edges: WorkflowFlowEdge[],
): string[] {
  const stepNodes = nodes.filter((n) => n.data.kind === "step" || n.data.kind === "gate");
  const stepIds = new Set(stepNodes.map((n) => n.id));

  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
    outgoing.get(edge.source)!.push(edge.target);
  }

  const ordered: string[] = [];
  let cursor: string | undefined = "context";
  const visited = new Set<string>();

  while (cursor && !visited.has(cursor)) {
    visited.add(cursor);
    const nextTargets: string[] = (outgoing.get(cursor) ?? []).filter((id) =>
      stepIds.has(id),
    );
    if (nextTargets[0]) {
      ordered.push(nextTargets[0]!);
      cursor = nextTargets[0];
    } else {
      break;
    }
  }

  for (const node of stepNodes) {
    if (!ordered.includes(node.id)) ordered.push(node.id);
  }

  return ordered;
}

export function createWorkflowFlowNode(
  kind: WorkflowFlowNodeKind,
): WorkflowFlowNode {
  const id = `${kind}_${crypto.randomUUID().slice(0, 8)}`;
  const labels: Record<WorkflowFlowNodeKind, string> = {
    trigger: "Trigger",
    context: "Context",
    step: "New step",
    gate: "Review gate",
    condition: "Condition",
    output: "Output",
    reference: "Reference",
    route: "Route",
  };

  return buildNode({
    id,
    kind,
    label: labels[kind],
    description:
      kind === "step"
        ? "Agent work unit"
        : kind === "route"
          ? "Handoff workflow"
          : kind === "reference"
            ? "Progressive disclosure"
            : undefined,
  });
}

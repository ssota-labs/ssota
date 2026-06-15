import type {
  RouteBlock,
  RouteOutletTarget,
  Workflow,
  WorkflowBlockRef,
  WorkflowStepSpec,
} from "@ssota/contracts";
import { resolveOutletTargetNodeId } from "@ssota/contracts";
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
  | "route"
  | "workflow";

export type WorkflowFlowNodeData = {
  nodeId?: string;
  label: string;
  eyebrow?: string;
  description?: string;
  badges?: string[];
  kind: WorkflowFlowNodeKind;
  stepId?: string;
  gateId?: string;
  routeId?: string;
  workflowBlockId?: string;
  /** Route outlets for multi-handle rendering */
  routeOutlets?: Array<{ id: string; label: string }>;
  /** Route outlet id when this node's + button adds to a specific outlet */
  outletId?: string;
  layoutWidth?: number;
  addOptions?: WorkflowFlowNodeKind[];
  onAddNode?: (
    sourceNodeId: string,
    kind: WorkflowFlowNodeKind,
    outletId?: string,
  ) => void;
  AddIcon?: ComponentType<{ className?: string }>;
};

export type WorkflowFlowNode = Node<WorkflowFlowNodeData, "workflowNode">;
export type WorkflowFlowEdge = Edge;

/** Must match handle positions on `WorkflowFlowNodeCard` for route nodes. */
export const ROUTE_OUTLET_HANDLE_TOP_BASE = 28;
/** Vertical gap between route outlet handles — must clear stacked branch node height (~120px). */
export const ROUTE_OUTLET_HANDLE_SPACING = 88;

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
  const badges = [...actions];
  if (step.instructionUrl) badges.push("instruction");
  return badges.length ? badges : undefined;
}

type DraftNodeInput = {
  id: string;
  kind: WorkflowFlowNodeKind;
  label: string;
  eyebrow?: string;
  description?: string;
  badges?: string[];
  stepId?: string;
  gateId?: string;
  routeId?: string;
  workflowBlockId?: string;
  outletId?: string;
  routeOutlets?: Array<{ id: string; label: string }>;
};

function buildNode(input: DraftNodeInput): WorkflowFlowNode {
  return {
    id: input.id,
    type: "workflowNode",
    position: { x: 0, y: 0 },
    data: {
      nodeId: input.id,
      kind: input.kind,
      eyebrow: input.eyebrow ?? input.kind,
      label: input.label,
      description: input.description,
      badges: input.badges,
      stepId: input.stepId,
      gateId: input.gateId,
      routeId: input.routeId,
      workflowBlockId: input.workflowBlockId,
      outletId: input.outletId,
      routeOutlets: input.routeOutlets,
      layoutWidth: estimateGraphNodeWidth({
        label: input.label,
        description: input.description,
        badges: input.badges,
      }),
    },
  };
}

function workflowBlockById(
  blocks: WorkflowBlockRef[],
  id: string,
): WorkflowBlockRef | undefined {
  return blocks.find((block) => block.id === id);
}

function stepById(
  steps: WorkflowStepSpec[],
  id: string,
): WorkflowStepSpec | undefined {
  return steps.find((step) => step.id === id);
}

function routeBlockById(
  routeBlocks: RouteBlock[],
  id: string,
): RouteBlock | undefined {
  return routeBlocks.find((route) => route.id === id);
}

function appendStepChainEdges(
  workflow: Workflow,
  steps: WorkflowStepSpec[],
  startStepId: string,
  edges: WorkflowFlowEdge[],
  sourcePrefix: string,
): void {
  let cursor: string | undefined = startStepId;
  const visited = new Set<string>();

  while (cursor && !visited.has(cursor)) {
    visited.add(cursor);
    const step = stepById(steps, cursor);
    if (!step) break;

    const nextId = step.nextStepId;
    if (nextId && stepById(steps, nextId)) {
      edges.push({
        id: `edge-${sourcePrefix}-${cursor}-${nextId}`,
        source: cursor,
        target: nextId,
        label: step.gate ? "approved" : step.actions[0]?.actionType,
      });
      cursor = nextId;
      continue;
    }
    break;
  }
}

function describeOutletTarget(
  workflow: Workflow,
  target: RouteOutletTarget,
): string {
  switch (target.kind) {
    case "step": {
      const step = stepById(workflow.steps, target.stepId);
      return step?.title ?? target.stepId;
    }
    case "route": {
      const route = routeBlockById(workflow.routeBlocks, target.routeId);
      return route?.label ?? target.routeId;
    }
    case "workflow": {
      const block = workflowBlockById(workflow.workflowBlocks, target.workflowBlockId);
      return block?.workflowKey ?? target.workflowBlockId;
    }
  }
}

function appendOutletTargetEdges(
  workflow: Workflow,
  target: RouteOutletTarget,
  edges: WorkflowFlowEdge[],
  sourceId: string,
  outletId: string,
  nodes: WorkflowFlowNode[],
): void {
  const targetNodeId = resolveOutletTargetNodeId(target);
  edges.push({
    id: `edge-${sourceId}-outlet-${outletId}-${targetNodeId}`,
    source: sourceId,
    target: targetNodeId,
    sourceHandle: outletId,
    label: describeOutletTarget(workflow, target),
  });

  if (target.kind === "step") {
    appendStepChainEdges(
      workflow,
      workflow.steps,
      target.stepId,
      edges,
      `chain-${outletId}`,
    );
    return;
  }

  if (target.kind === "route") {
    const route = routeBlockById(workflow.routeBlocks, target.routeId);
    if (route) {
      appendRouteBlockEdges(workflow, route, edges, nodes);
    }
  }
}

function appendRouteBlockEdges(
  workflow: Workflow,
  route: RouteBlock,
  edges: WorkflowFlowEdge[],
  nodes: WorkflowFlowNode[],
): void {
  const routeNodeId = `route:${route.id}`;
  if (!nodes.some((node) => node.id === routeNodeId)) return;

  for (const outlet of route.outlets) {
    if (!outlet.target) continue;
    appendOutletTargetEdges(
      workflow,
      outlet.target,
      edges,
      routeNodeId,
      outlet.id,
      nodes,
    );
  }
}

function getNodeLayoutHeight(node: WorkflowFlowNode): number {
  if (node.data.kind === "workflow") return 96;
  if (node.data.kind === "route") {
    const outletCount = node.data.routeOutlets?.length ?? 1;
    return Math.max(
      120,
      ROUTE_OUTLET_HANDLE_TOP_BASE +
        Math.max(0, outletCount - 1) * ROUTE_OUTLET_HANDLE_SPACING +
        24,
    );
  }
  return 120;
}

function outletHandleCenterY(routeNode: WorkflowFlowNode, outletIndex: number): number {
  return (
    routeNode.position.y +
    ROUTE_OUTLET_HANDLE_TOP_BASE +
    outletIndex * ROUTE_OUTLET_HANDLE_SPACING
  );
}

/** Keep branch targets in the same vertical order as route outlet handles (insertion order). */
function alignRouteOutletTargets(
  nodes: WorkflowFlowNode[],
  edges: WorkflowFlowEdge[],
): WorkflowFlowNode[] {
  const nodeById = new Map(nodes.map((node) => [node.id, { ...node }]));

  for (const routeNode of nodes) {
    if (routeNode.data.kind !== "route") continue;

    const outlets = routeNode.data.routeOutlets ?? [];
    if (outlets.length === 0) continue;

    const layoutRoute = nodeById.get(routeNode.id);
    if (!layoutRoute) continue;

    const outletEdges = edges
      .filter(
        (edge) =>
          edge.source === routeNode.id &&
          edge.sourceHandle &&
          outlets.some((outlet) => outlet.id === edge.sourceHandle),
      )
      .sort((left, right) => {
        const leftIndex = outlets.findIndex((outlet) => outlet.id === left.sourceHandle);
        const rightIndex = outlets.findIndex((outlet) => outlet.id === right.sourceHandle);
        return leftIndex - rightIndex;
      });

    for (const edge of outletEdges) {
      const outletIndex = outlets.findIndex((outlet) => outlet.id === edge.sourceHandle);
      if (outletIndex < 0) continue;

      const target = nodeById.get(edge.target);
      if (!target) continue;

      const targetHeight = getNodeLayoutHeight(target);
      const handleCenterY = outletHandleCenterY(layoutRoute, outletIndex);

      nodeById.set(edge.target, {
        ...target,
        position: {
          ...target.position,
          y: handleCenterY - targetHeight / 2,
        },
      });
    }
  }

  return nodes.map((node) => nodeById.get(node.id) ?? node);
}

export function layoutWorkflowGraph(
  nodes: WorkflowFlowNode[],
  edges: WorkflowFlowEdge[],
): {
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
} {
  const laidOut = layoutGraphWithDagre<WorkflowFlowNodeData>(nodes, edges, "LR", {
    getNodeSize: (node) => ({
      width: node.data.layoutWidth ?? 220,
      height: getNodeLayoutHeight(node as WorkflowFlowNode),
    }),
  });
  const alignedNodes = alignRouteOutletTargets(
    laidOut.nodes as WorkflowFlowNode[],
    laidOut.edges,
  );
  return {
    nodes: alignedNodes.map((node) => ({
      ...node,
      type: "workflowNode" as const,
    })),
    edges: laidOut.edges,
  };
}

/** Build React Flow nodes/edges from Workflow SSOT (routeBlocks + workflowBlocks). */
export function workflowToFlowGraph(workflow: Workflow): {
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
} {
  const steps =
    workflow.steps.length > 0
      ? workflow.steps
      : [{ ...DEFAULT_STEP, title: workflow.title }];

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
        workflow.applicableNodeTypes.length > 0
          ? workflow.applicableNodeTypes.map((entry) => entry.nodeType)
          : undefined,
    }),
    ...workflow.routeBlocks.map((route) =>
      buildNode({
        id: `route:${route.id}`,
        kind: "route",
        eyebrow: "route",
        label: route.label,
        description:
          route.links.length
            ? `${route.links.length} instruction(s) · ${route.outlets.length} outlet(s)`
            : `${route.outlets.length} outlet(s)`,
        badges: route.outlets.map((outlet) => outlet.label).slice(0, 3),
        routeId: route.id,
        routeOutlets: route.outlets.map((outlet) => ({
          id: outlet.id,
          label: outlet.label,
        })),
      }),
    ),
    ...steps.map((step) =>
      buildNode({
        id: step.id,
        kind: step.gate ? "gate" : "step",
        eyebrow: step.gate ? "review" : "step",
        label: step.title,
        description: step.description ?? step.instructionUrl ?? undefined,
        badges: stepBadges(step),
        stepId: step.id,
        gateId: step.gate?.id,
      }),
    ),
    ...workflow.workflowBlocks.map((block) =>
      buildNode({
        id: `workflow:${block.id}`,
        kind: "workflow",
        eyebrow: "workflow",
        label: block.label ?? block.workflowKey,
        description: `Handoff → ${block.workflowKey}`,
        badges: [block.workflowKey],
        workflowBlockId: block.id,
      }),
    ),
  ];

  const edges: WorkflowFlowEdge[] = [
    { id: "edge-trigger-context", source: "trigger", target: "context" },
  ];

  const flowEntry =
    workflow.flowEntry ??
    (workflow.routeBlocks[0]
      ? { kind: "route" as const, routeId: workflow.routeBlocks[0].id }
      : steps[0]
        ? { kind: "step" as const, stepId: steps[0].id }
        : undefined);

  if (flowEntry?.kind === "route") {
    const route = routeBlockById(workflow.routeBlocks, flowEntry.routeId);
    if (route) {
      edges.push({
        id: `edge-context-route-${route.id}`,
        source: "context",
        target: `route:${route.id}`,
      });
      appendRouteBlockEdges(workflow, route, edges, nodes);
    }
  } else if (flowEntry?.kind === "step") {
    edges.push({
      id: `edge-context-${flowEntry.stepId}`,
      source: "context",
      target: flowEntry.stepId,
    });
    appendStepChainEdges(
      workflow,
      steps,
      flowEntry.stepId,
      edges,
      "main",
    );
  }

  return layoutWorkflowGraph(nodes, edges);
}

/** Ordered step ids from canvas main spine. */
export function extractStepOrderFromGraph(
  nodes: WorkflowFlowNode[],
  edges: WorkflowFlowEdge[],
): string[] {
  const stepNodes = nodes.filter(
    (n) => n.data.kind === "step" || n.data.kind === "gate",
  );
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
    route: "Route",
    workflow: "Workflow",
  };

  return buildNode({
    id,
    kind,
    label: labels[kind],
    description:
      kind === "step"
        ? "Agent work unit"
        : kind === "route"
          ? "Dispatch branches"
          : kind === "workflow"
            ? "Handoff workflow"
            : undefined,
  });
}

export function parseRouteNodeId(nodeId: string): string | null {
  if (!nodeId.startsWith("route:")) return null;
  return nodeId.slice("route:".length);
}

export function parseWorkflowBlockNodeId(nodeId: string): string | null {
  if (!nodeId.startsWith("workflow:")) return null;
  return nodeId.slice("workflow:".length);
}

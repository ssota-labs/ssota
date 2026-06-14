import type { Workflow, WorkflowStepSpec } from "@ssota/contracts";
import type { Edge, Node } from "@xyflow/react";
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
  | "output";

export type WorkflowFlowNodeData = {
  label: string;
  eyebrow?: string;
  description?: string;
  badges?: string[];
  kind: WorkflowFlowNodeKind;
  stepId?: string;
  layoutWidth?: number;
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
  if (workflow.context.queries.length) {
    parts.push(`${workflow.context.queries.length} queries`);
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

/** Build React Flow nodes/edges from Workflow SSOT (linear + gate branches). */
export function workflowToFlowGraph(workflow: Workflow): {
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
} {
  const steps =
    workflow.steps.length > 0 ? workflow.steps : [{ ...DEFAULT_STEP, title: workflow.title }];

  const nodes: WorkflowFlowNode[] = [
    {
      id: "trigger",
      type: "workflowNode",
      position: { x: 0, y: 0 },
      data: {
        kind: "trigger",
        eyebrow: "trigger",
        label: "Trigger",
        description:
          [...workflow.trigger.patterns, ...workflow.trigger.events].join(", ") ||
          "manual",
        layoutWidth: estimateGraphNodeWidth({
          label: "Trigger",
          description: "manual",
        }),
      },
    },
    {
      id: "context",
      type: "workflowNode",
      position: { x: 0, y: 0 },
      data: {
        kind: "context",
        eyebrow: "context",
        label: "Context",
        description: contextSummary(workflow) ?? "Assemble graph context",
        badges: workflow.applicableNodeTypes.length
          ? workflow.applicableNodeTypes
          : undefined,
        layoutWidth: estimateGraphNodeWidth({
          label: "Context",
          description: contextSummary(workflow),
        }),
      },
    },
    ...steps.map((step) => ({
      id: step.id,
      type: "workflowNode" as const,
      position: { x: 0, y: 0 },
      data: {
        kind: (step.gate ? "gate" : "step") as WorkflowFlowNodeKind,
        eyebrow: step.gate ? "review" : "step",
        label: step.title,
        description: step.description ?? step.output,
        badges: stepBadges(step),
        stepId: step.id,
        layoutWidth: estimateGraphNodeWidth({
          label: step.title,
          description: step.description ?? step.output,
          badges: stepBadges(step),
        }),
      },
    })),
    {
      id: "output",
      type: "workflowNode",
      position: { x: 0, y: 0 },
      data: {
        kind: "output",
        eyebrow: "output",
        label: "Output",
        description:
          workflow.output.completionCriteria ??
          (Object.keys(workflow.output.contract).length
            ? `${Object.keys(workflow.output.contract).length} contract fields`
            : "Completion criteria"),
        layoutWidth: estimateGraphNodeWidth({
          label: "Output",
          description: "Completion",
        }),
      },
    },
  ];

  const edges: WorkflowFlowEdge[] = [];
  let previousId = "trigger";

  edges.push({
    id: "edge-trigger-context",
    source: "trigger",
    target: "context",
  });
  previousId = "context";

  for (const step of steps) {
    edges.push({
      id: `edge-${previousId}-${step.id}`,
      source: previousId,
      target: step.id,
      label: step.actions[0]?.actionType,
    });
    previousId = step.id;
  }

  edges.push({
    id: "edge-output",
    source: previousId,
    target: "output",
    label: "complete",
  });

  const layouted = layoutGraphWithDagre(nodes, edges, "LR", {
    getNodeSize: (node) => ({
      width: node.data.layoutWidth ?? 220,
      height: 120,
    }),
  });

  return {
    nodes: layouted.nodes as WorkflowFlowNode[],
    edges: layouted.edges,
  };
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

export function createPaletteNode(
  kind: WorkflowFlowNodeKind,
  position: { x: number; y: number },
): WorkflowFlowNode {
  const id = `${kind}_${crypto.randomUUID().slice(0, 8)}`;
  const labels: Record<WorkflowFlowNodeKind, string> = {
    trigger: "Trigger",
    context: "Context",
    step: "New step",
    gate: "Review gate",
    condition: "Condition",
    output: "Output",
  };

  return {
    id,
    type: "workflowNode",
    position,
    data: {
      kind,
      eyebrow: kind,
      label: labels[kind],
      description: kind === "step" ? "Agent work unit" : undefined,
      layoutWidth: 200,
    },
  };
}

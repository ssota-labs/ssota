"use client";

import { buildWorkflowInstructionPackage } from "@ssota/core";
import type { Instruction } from "@ssota/core";
import type { Workflow } from "@ssota/contracts";
import {
  GraphFlowCanvas,
  type GraphFlowEdge,
  type GraphFlowNode,
} from "@/components/graph/graph-flow-canvas";
import { workflowToFlowGraph } from "@/lib/workflows/workflow-flow-model";

export type WorkflowStepView = {
  id: string;
  title: string;
  description?: string;
  actionRefs: string[];
  output?: string;
  gate: boolean;
};

/** Read-only linear diagram — prefer WorkflowVisualBuilder for interactive editing. */
export function WorkflowFlowCanvas({
  steps,
  instruction,
  workflow,
}: {
  steps?: WorkflowStepView[];
  instruction?: Instruction;
  workflow?: Workflow;
}) {
  if (workflow || instruction) {
    const pkg = workflow
      ? { workflow, renderedText: "" }
      : buildWorkflowInstructionPackage(instruction!);
    const { nodes, edges } = workflowToFlowGraph(pkg.workflow);
    const graphNodes: GraphFlowNode[] = nodes.map((node) => ({
      ...node,
      type: "graphNode",
      data: {
        label: node.data.label,
        eyebrow: node.data.eyebrow,
        description: node.data.description,
        badges: node.data.badges,
        kind:
          node.data.kind === "gate"
            ? "review"
            : node.data.kind === "step"
              ? "action"
              : node.data.kind === "condition"
                ? "decision"
                : node.data.kind === "reference"
                  ? "instance"
                  : node.data.kind === "route"
                    ? "workflow"
                    : node.data.kind === "trigger" || node.data.kind === "context"
                  ? "workflow"
                  : node.data.kind,
        layoutWidth: node.data.layoutWidth,
      },
    }));
    return (
      <GraphFlowCanvas
        nodes={graphNodes}
        edges={edges as GraphFlowEdge[]}
        emptyMessage="No workflow steps yet."
      />
    );
  }

  const normalizedSteps =
    steps && steps.length > 0
      ? steps
      : [
          {
            id: "instruction",
            title: "Natural language instruction",
            description: "This workflow is defined as guidance only.",
            actionRefs: [],
            gate: false,
          },
        ];

  const nodes: GraphFlowNode[] = [
    {
      id: "trigger",
      type: "graphNode",
      position: { x: 0, y: 160 },
      data: {
        kind: "workflow",
        eyebrow: "trigger",
        label: "Trigger",
        description: "User request, MCP call, or automation event",
      },
    },
    ...normalizedSteps.map((step, index) => ({
      id: step.id,
      type: "graphNode" as const,
      position: { x: 260 + index * 260, y: step.gate ? 260 : 120 },
      data: {
        kind: step.gate ? ("review" as const) : ("action" as const),
        eyebrow: step.gate ? "review point" : "step",
        label: step.title,
        description: step.description ?? step.output,
        badges: step.actionRefs.length ? step.actionRefs : undefined,
      },
    })),
    {
      id: "output",
      type: "graphNode",
      position: { x: 260 + normalizedSteps.length * 260, y: 160 },
      data: {
        kind: "output",
        eyebrow: "completion",
        label: "Output",
        description: "Completion criteria and recorded run outcome",
      },
    },
  ];

  const stepEdges: GraphFlowEdge[] = normalizedSteps.map((step, index) => ({
    id: `edge-${step.id}`,
    source: index === 0 ? "trigger" : normalizedSteps[index - 1]!.id,
    target: step.id,
    label: step.actionRefs.length ? step.actionRefs.join(", ") : "continue",
  }));

  const edges: GraphFlowEdge[] = [
    ...stepEdges,
    {
      id: "edge-output",
      source: normalizedSteps.at(-1)!.id,
      target: "output",
      label: "complete",
    },
  ];

  return <GraphFlowCanvas nodes={nodes} edges={edges} />;
}

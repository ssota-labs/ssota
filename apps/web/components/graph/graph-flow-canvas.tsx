"use client";

import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { cn } from "@ssota/ui/lib/utils";

export type FlowNodeKind =
  | "object"
  | "relation"
  | "action"
  | "instance"
  | "workflow"
  | "decision"
  | "review"
  | "output";

export type GraphFlowNodeData = {
  label: string;
  eyebrow?: string;
  description?: string;
  badges?: string[];
  kind?: FlowNodeKind;
  align?: "left" | "right";
};

export type GraphFlowNode = Node<GraphFlowNodeData, "graphNode">;
export type GraphFlowEdge = Edge;

const nodeStyles: Record<FlowNodeKind, string> = {
  object: "border-primary/40 bg-card text-card-foreground shadow-sm",
  relation: "border-border bg-muted/60 text-foreground",
  action: "border-border bg-background text-foreground",
  instance: "border-primary/50 bg-card text-card-foreground shadow-sm",
  workflow: "border-primary/40 bg-card text-card-foreground shadow-sm",
  decision: "border-border bg-muted/70 text-foreground",
  review: "border-border bg-background text-foreground",
  output: "border-border bg-muted/60 text-foreground",
};

function GraphNode({ data }: NodeProps<GraphFlowNode>) {
  const kind = data.kind ?? "object";
  const align = data.align ?? "left";
  const isRight = align === "right";

  return (
    <div
      className={cn(
        "w-[220px] rounded-xl border px-3 py-2",
        isRight ? "flex flex-col items-end text-right" : "text-left",
        nodeStyles[kind],
      )}
    >
      <Handle type="target" position={Position.Left} className="size-2" />
      <Handle type="source" position={Position.Right} className="size-2" />
      {data.eyebrow ? (
        <div className="mb-1 w-full text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {data.eyebrow}
        </div>
      ) : null}
      <div className="w-full text-sm font-semibold">{data.label}</div>
      {data.description ? (
        <div className="mt-1 w-full text-xs text-muted-foreground">
          {data.description}
        </div>
      ) : null}
      {data.badges?.length ? (
        <div
          className={cn(
            "mt-2 flex w-full flex-wrap gap-1",
            isRight ? "justify-end" : "justify-start",
          )}
        >
          {data.badges.slice(0, 4).map((badge) => (
            <Badge key={badge} variant="secondary" className="text-[10px]">
              {badge}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const nodeTypes = { graphNode: GraphNode };

export function GraphFlowCanvas({
  nodes,
  edges,
  emptyMessage = "No graph relationships yet.",
  fitViewPadding = 0.15,
}: {
  nodes: GraphFlowNode[];
  edges: GraphFlowEdge[];
  emptyMessage?: string;
  fitViewPadding?: number;
}) {
  if (nodes.length === 0) {
    return (
      <div className="flex h-full min-h-64 items-center justify-center rounded-lg border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="h-full min-h-96 overflow-hidden rounded-lg border bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges.map((edge) => ({
          markerEnd: { type: MarkerType.ArrowClosed },
          type: "smoothstep",
          ...edge,
        }))}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: fitViewPadding }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={18} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

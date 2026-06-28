"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  Handle,
  Position,
  ReactFlow,
  getBezierPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@ssota/ui/lib/utils";

type ContextNodeData = {
  label: string;
  phase?: "direction" | "execution" | "verify";
};

const PHASE_LABELS = [
  { label: "방향", flex: 3 },
  { label: "실행", flex: 2 },
  { label: "검증·배포", flex: 2 },
] as const;

function ContextNode({ data }: NodeProps) {
  const { label, phase } = data as ContextNodeData;
  return (
    <div
      className={cn(
        "min-w-[76px] rounded-lg border px-2.5 py-2 text-center text-[11px] font-semibold leading-tight shadow-sm",
        phase === "execution"
          ? "border-primary/35 bg-primary/10 text-foreground"
          : "border-primary/25 bg-primary/5 text-foreground",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-1 !border-0 !bg-transparent !opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!size-1 !border-0 !bg-transparent !opacity-0"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!size-1 !border-0 !bg-transparent !opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!size-1 !border-0 !bg-transparent !opacity-0"
      />
      {label}
    </div>
  );
}

function ContextEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}: EdgeProps) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={path}
      style={style}
      markerEnd={markerEnd}
      interactionWidth={0}
    />
  );
}

const NODE_TYPES = { context: ContextNode };
const EDGE_TYPES = { context: ContextEdge };

const INITIAL_NODES: Node<ContextNodeData>[] = [
  { id: "okr", type: "context", position: { x: 0, y: 72 }, data: { label: "OKR", phase: "direction" } },
  { id: "roadmap", type: "context", position: { x: 108, y: 72 }, data: { label: "로드맵", phase: "direction" } },
  { id: "research", type: "context", position: { x: 216, y: 72 }, data: { label: "리서치", phase: "direction" } },
  { id: "initiative", type: "context", position: { x: 340, y: 8 }, data: { label: "이니셔티브", phase: "execution" } },
  { id: "design", type: "context", position: { x: 452, y: 8 }, data: { label: "설계결정", phase: "execution" } },
  { id: "test", type: "context", position: { x: 564, y: 72 }, data: { label: "테스트", phase: "verify" } },
  { id: "deploy", type: "context", position: { x: 672, y: 72 }, data: { label: "배포", phase: "verify" } },
];

const edgeStroke = "var(--color-primary, oklch(0.62 0.12 223))";

const INITIAL_EDGES: Edge[] = [
  { id: "e-okr-roadmap", source: "okr", target: "roadmap", type: "context", style: { stroke: edgeStroke, strokeWidth: 1.5, opacity: 0.45 } },
  { id: "e-roadmap-research", source: "roadmap", target: "research", type: "context", style: { stroke: edgeStroke, strokeWidth: 1.5, opacity: 0.45 } },
  { id: "e-research-initiative", source: "research", target: "initiative", targetHandle: "top", type: "context", style: { stroke: edgeStroke, strokeWidth: 1.5, opacity: 0.5 } },
  { id: "e-initiative-design", source: "initiative", target: "design", type: "context", style: { stroke: edgeStroke, strokeWidth: 1.5, opacity: 0.5 } },
  { id: "e-design-test", source: "design", sourceHandle: "bottom", target: "test", targetHandle: "top", type: "context", style: { stroke: edgeStroke, strokeWidth: 1.5, opacity: 0.5 } },
  { id: "e-test-deploy", source: "test", target: "deploy", type: "context", style: { stroke: edgeStroke, strokeWidth: 1.5, opacity: 0.45 } },
  {
    id: "e-research-design",
    source: "research",
    target: "design",
    targetHandle: "top",
    type: "context",
    style: { stroke: edgeStroke, strokeWidth: 1, opacity: 0.28, strokeDasharray: "4 4" },
  },
  {
    id: "e-okr-deploy",
    source: "okr",
    target: "deploy",
    targetHandle: "top",
    type: "context",
    style: { stroke: edgeStroke, strokeWidth: 1, opacity: 0.2, strokeDasharray: "5 5" },
  },
];

/** 제품 맥락 체인 — react-flow 기반 정적 그래프. */
export function SolutionContextFlow({ className }: { className?: string }) {
  const [nodes] = React.useState(INITIAL_NODES);
  const [edges] = React.useState(INITIAL_EDGES);

  return (
    <div className={cn("deck-context-flow flex h-full min-h-[300px] flex-col", className)}>
      <div className="relative min-h-0 flex-1 rounded-xl border border-border bg-card/30">
        <div className="pointer-events-none absolute inset-x-4 top-2.5 z-10 flex text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70">
          {PHASE_LABELS.map((phase) => (
            <span key={phase.label} style={{ flex: phase.flex }} className="text-center">
              {phase.label}
            </span>
          ))}
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          fitView
          fitViewOptions={{ padding: { top: 28, right: 16, bottom: 12, left: 16 } }}
          proOptions={{ hideAttribution: true }}
          className="!bg-transparent"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={18}
            size={1}
            color="color-mix(in oklch, var(--color-primary) 18%, transparent)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

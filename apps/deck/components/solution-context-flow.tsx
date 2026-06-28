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
  useNodesInitialized,
  useReactFlow,
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
        "min-w-[104px] rounded-xl border px-3.5 py-3 text-center text-[14px] font-semibold leading-tight shadow-sm",
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
  { id: "okr", type: "context", position: { x: 0, y: 108 }, data: { label: "OKR", phase: "direction" } },
  { id: "roadmap", type: "context", position: { x: 58, y: 108 }, data: { label: "로드맵", phase: "direction" } },
  { id: "research", type: "context", position: { x: 116, y: 108 }, data: { label: "리서치", phase: "direction" } },
  { id: "initiative", type: "context", position: { x: 186, y: 16 }, data: { label: "이니셔티브", phase: "execution" } },
  { id: "design", type: "context", position: { x: 244, y: 16 }, data: { label: "설계결정", phase: "execution" } },
  { id: "test", type: "context", position: { x: 314, y: 108 }, data: { label: "테스트", phase: "verify" } },
  { id: "deploy", type: "context", position: { x: 372, y: 108 }, data: { label: "배포", phase: "verify" } },
];

const edgeStroke = "var(--color-primary, oklch(0.62 0.12 223))";

const INITIAL_EDGES: Edge[] = [
  { id: "e-okr-roadmap", source: "okr", target: "roadmap", type: "context", style: { stroke: edgeStroke, strokeWidth: 2, opacity: 0.45 } },
  { id: "e-roadmap-research", source: "roadmap", target: "research", type: "context", style: { stroke: edgeStroke, strokeWidth: 2, opacity: 0.45 } },
  { id: "e-research-initiative", source: "research", target: "initiative", targetHandle: "top", type: "context", style: { stroke: edgeStroke, strokeWidth: 2, opacity: 0.5 } },
  { id: "e-initiative-design", source: "initiative", target: "design", type: "context", style: { stroke: edgeStroke, strokeWidth: 2, opacity: 0.5 } },
  { id: "e-design-test", source: "design", sourceHandle: "bottom", target: "test", targetHandle: "top", type: "context", style: { stroke: edgeStroke, strokeWidth: 2, opacity: 0.5 } },
  { id: "e-test-deploy", source: "test", target: "deploy", type: "context", style: { stroke: edgeStroke, strokeWidth: 2, opacity: 0.45 } },
  {
    id: "e-research-design",
    source: "research",
    target: "design",
    targetHandle: "top",
    type: "context",
    style: { stroke: edgeStroke, strokeWidth: 1.5, opacity: 0.28, strokeDasharray: "4 4" },
  },
];

const FIT_OPTIONS = {
  padding: 0.04,
  maxZoom: 2.5,
  minZoom: 1,
  duration: 0,
} as const;

/** 컨테이너 크기·노드 측정 후 그래프를 pane에 맞게 확대. */
function ContextFlowFit({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const { fitView } = useReactFlow();
  const ready = useNodesInitialized();

  const refit = React.useCallback(() => {
    void fitView(FIT_OPTIONS);
  }, [fitView]);

  React.useEffect(() => {
    if (!ready) return;
    const id = requestAnimationFrame(refit);
    return () => cancelAnimationFrame(id);
  }, [ready, refit]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || !ready) return;

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(refit);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, ready, refit]);

  return null;
}

/** 제품 맥락 체인 — react-flow 기반 정적 그래프. */
export function SolutionContextFlow({ className }: { className?: string }) {
  const [nodes] = React.useState(INITIAL_NODES);
  const [edges] = React.useState(INITIAL_EDGES);
  const containerRef = React.useRef<HTMLDivElement>(null);

  return (
    <div className={cn("deck-context-flow flex h-full min-h-[300px] flex-col", className)}>
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 rounded-xl border border-border bg-card/30"
      >
        <div className="pointer-events-none absolute inset-x-4 top-3 z-10 flex text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
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
          proOptions={{ hideAttribution: true }}
          className="!bg-transparent"
        >
          <ContextFlowFit containerRef={containerRef} />
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.2}
            color="color-mix(in oklch, var(--color-primary) 18%, transparent)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

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
  useInternalNode,
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

// 노드 크기를 고정한다. 덱은 .deck-scaler의 CSS transform: scale() 안에서 렌더되므로
// React Flow의 getBoundingClientRect 기반 핸들 측정이 부모 scale만큼 왜곡된다.
// → 측정에 의존하지 않고, 고정 geometry로 엣지 앵커를 직접 계산해 핸들에 정확히 붙인다.
const NODE_W = 116;
const NODE_H = 46;

const PHASE_LABELS = [
  { label: "방향", flex: 1 },
  { label: "실행", flex: 1 },
  { label: "검증·배포", flex: 1 },
] as const;

// 핸들 id — 어느 변에 붙는지 명시.
const HANDLE = {
  targetLeft: "t-l",
  targetTop: "t-t",
  sourceRight: "s-r",
  sourceBottom: "s-b",
} as const;

function ContextNode({ data }: NodeProps) {
  const { label, phase } = data as ContextNodeData;
  const handleClass = "!h-1.5 !w-1.5 !border-0 !bg-primary/40";
  return (
    <div
      style={{ width: NODE_W, height: NODE_H }}
      className={cn(
        "flex items-center justify-center rounded-xl border text-center text-[14px] font-semibold leading-tight shadow-sm",
        phase === "execution"
          ? "border-primary/35 bg-primary/10 text-foreground"
          : "border-primary/25 bg-primary/5 text-foreground",
      )}
    >
      <Handle id={HANDLE.targetLeft} type="target" position={Position.Left} className={handleClass} />
      <Handle id={HANDLE.targetTop} type="target" position={Position.Top} className={handleClass} />
      {label}
      <Handle id={HANDLE.sourceRight} type="source" position={Position.Right} className={handleClass} />
      <Handle id={HANDLE.sourceBottom} type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

type HandleId = (typeof HANDLE)[keyof typeof HANDLE];

/** 핸들 id별 앵커(flow 좌표) — 고정 노드 크기 기준. position은 측정값이 아닌 prop이라 scale 영향 없음. */
function handleAnchor(x: number, y: number, handle: HandleId): { x: number; y: number; position: Position } {
  switch (handle) {
    case HANDLE.sourceRight:
      return { x: x + NODE_W, y: y + NODE_H / 2, position: Position.Right };
    case HANDLE.sourceBottom:
      return { x: x + NODE_W / 2, y: y + NODE_H, position: Position.Bottom };
    case HANDLE.targetLeft:
      return { x, y: y + NODE_H / 2, position: Position.Left };
    case HANDLE.targetTop:
      return { x: x + NODE_W / 2, y, position: Position.Top };
    default:
      return { x, y, position: Position.Left };
  }
}

/** 측정 대신 노드 position + 고정 geometry로 경로를 그려, 부모 CSS scale에도 핸들에 정확히 붙는다. */
function ContextEdge({
  id,
  source,
  target,
  sourceHandleId,
  targetHandleId,
  style,
  markerEnd,
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) return null;

  const sp = sourceNode.internals.positionAbsolute;
  const tp = targetNode.internals.positionAbsolute;
  const s = handleAnchor(sp.x, sp.y, (sourceHandleId as HandleId) ?? HANDLE.sourceRight);
  const t = handleAnchor(tp.x, tp.y, (targetHandleId as HandleId) ?? HANDLE.targetLeft);

  const [path] = getBezierPath({
    sourceX: s.x,
    sourceY: s.y,
    sourcePosition: s.position,
    targetX: t.x,
    targetY: t.y,
    targetPosition: t.position,
  });

  return (
    <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} interactionWidth={0} />
  );
}

const NODE_TYPES = { context: ContextNode };
const EDGE_TYPES = { context: ContextEdge };

// 3컬럼 세로 배치: 방향(좌)·실행(중)·검증배포(우).
const COL_X = [0, 176, 352] as const;

const INITIAL_NODES: Node<ContextNodeData>[] = [
  { id: "okr", type: "context", position: { x: COL_X[0], y: 20 }, data: { label: "OKR", phase: "direction" }, width: NODE_W, height: NODE_H },
  { id: "roadmap", type: "context", position: { x: COL_X[0], y: 110 }, data: { label: "로드맵", phase: "direction" }, width: NODE_W, height: NODE_H },
  { id: "research", type: "context", position: { x: COL_X[0], y: 200 }, data: { label: "리서치", phase: "direction" }, width: NODE_W, height: NODE_H },
  { id: "initiative", type: "context", position: { x: COL_X[1], y: 65 }, data: { label: "이니셔티브", phase: "execution" }, width: NODE_W, height: NODE_H },
  { id: "design", type: "context", position: { x: COL_X[1], y: 155 }, data: { label: "설계결정", phase: "execution" }, width: NODE_W, height: NODE_H },
  { id: "test", type: "context", position: { x: COL_X[2], y: 65 }, data: { label: "테스트", phase: "verify" }, width: NODE_W, height: NODE_H },
  { id: "deploy", type: "context", position: { x: COL_X[2], y: 155 }, data: { label: "배포", phase: "verify" }, width: NODE_W, height: NODE_H },
];

const edgeStroke = "var(--color-primary, oklch(0.62 0.12 223))";

const vEdge = (id: string, source: string, target: string, opacity = 0.45): Edge => ({
  id,
  source,
  sourceHandle: HANDLE.sourceBottom,
  target,
  targetHandle: HANDLE.targetTop,
  type: "context",
  style: { stroke: edgeStroke, strokeWidth: 2, opacity },
});

const hEdge = (id: string, source: string, target: string, opacity = 0.5): Edge => ({
  id,
  source,
  sourceHandle: HANDLE.sourceRight,
  target,
  targetHandle: HANDLE.targetLeft,
  type: "context",
  style: { stroke: edgeStroke, strokeWidth: 2, opacity },
});

const INITIAL_EDGES: Edge[] = [
  // 방향 컬럼 세로 체인
  vEdge("e-okr-roadmap", "okr", "roadmap"),
  vEdge("e-roadmap-research", "roadmap", "research"),
  // 방향 → 실행
  hEdge("e-research-initiative", "research", "initiative"),
  // 실행 컬럼 세로 체인
  vEdge("e-initiative-design", "initiative", "design", 0.5),
  // 실행 → 검증·배포
  hEdge("e-design-test", "design", "test"),
  // 검증·배포 컬럼 세로 체인
  vEdge("e-test-deploy", "test", "deploy"),
  // 맥락 교차(점선) — 리서치에서 설계결정으로 직접 참조
  {
    id: "e-research-design",
    source: "research",
    sourceHandle: HANDLE.sourceRight,
    target: "design",
    targetHandle: HANDLE.targetLeft,
    type: "context",
    style: { stroke: edgeStroke, strokeWidth: 1.5, opacity: 0.28, strokeDasharray: "4 4" },
  },
];

const FIT_OPTIONS = {
  padding: 0.12,
  maxZoom: 1.6,
  minZoom: 0.4,
  duration: 0,
} as const;

/** 컨테이너 리사이즈/측정 후 그래프를 pane 중앙에 맞춘다. */
function ContextFlowFit({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const { fitView } = useReactFlow();
  const ready = useNodesInitialized();

  const refit = React.useCallback(() => {
    void fitView(FIT_OPTIONS);
  }, [fitView]);

  React.useEffect(() => {
    if (!ready) return;
    const rafs: number[] = [];
    rafs.push(requestAnimationFrame(() => rafs.push(requestAnimationFrame(refit))));
    const t = setTimeout(refit, 120);
    return () => {
      rafs.forEach(cancelAnimationFrame);
      clearTimeout(t);
    };
  }, [ready, refit]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || !ready) return;
    const observer = new ResizeObserver(() => requestAnimationFrame(refit));
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
          fitView
          fitViewOptions={FIT_OPTIONS}
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

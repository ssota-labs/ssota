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
  useUpdateNodeInternals,
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
  { label: "방향", flex: 1 },
  { label: "실행", flex: 1 },
  { label: "검증·배포", flex: 1 },
] as const;

// 핸들 id — 멀티 핸들 노드에서 엣지가 어느 핸들에 붙을지 명시하기 위해 모두 id를 둔다.
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
      className={cn(
        "min-w-[104px] rounded-xl border px-3.5 py-3 text-center text-[14px] font-semibold leading-tight shadow-sm",
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

// 3컬럼 세로 배치: 방향(좌)·실행(중)·검증배포(우). 컨테이너(좁고 세로로 긴) 비율을 채운다.
const COL_X = [0, 180, 360] as const;

const INITIAL_NODES: Node<ContextNodeData>[] = [
  { id: "okr", type: "context", position: { x: COL_X[0], y: 20 }, data: { label: "OKR", phase: "direction" } },
  { id: "roadmap", type: "context", position: { x: COL_X[0], y: 110 }, data: { label: "로드맵", phase: "direction" } },
  { id: "research", type: "context", position: { x: COL_X[0], y: 200 }, data: { label: "리서치", phase: "direction" } },
  { id: "initiative", type: "context", position: { x: COL_X[1], y: 65 }, data: { label: "이니셔티브", phase: "execution" } },
  { id: "design", type: "context", position: { x: COL_X[1], y: 155 }, data: { label: "설계결정", phase: "execution" } },
  { id: "test", type: "context", position: { x: COL_X[2], y: 65 }, data: { label: "테스트", phase: "verify" } },
  { id: "deploy", type: "context", position: { x: COL_X[2], y: 155 }, data: { label: "배포", phase: "verify" } },
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
  padding: 0.1,
  maxZoom: 1.6,
  minZoom: 0.4,
  duration: 0,
} as const;

/** 컨테이너 크기·노드 측정 후 그래프를 pane에 맞게 확대 + 핸들 위치 재측정. */
function ContextFlowFit({
  containerRef,
  nodeIds,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  nodeIds: string[];
}) {
  const { fitView } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const ready = useNodesInitialized();
  const key = nodeIds.join(",");

  const refit = React.useCallback(() => {
    void fitView(FIT_OPTIONS);
  }, [fitView]);

  // 핸들 bounds 재측정 — 엣지가 핸들에 정확히 붙도록(web FlowReady 패턴).
  React.useEffect(() => {
    if (nodeIds.length > 0) updateNodeInternals(nodeIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, updateNodeInternals]);

  React.useEffect(() => {
    if (!ready) return;
    // 노드 측정 완료 직후 + 약간의 지연 후 재맞춤(초기 좌측 치우침 방지).
    const rafs: number[] = [];
    const raf1 = requestAnimationFrame(() => {
      updateNodeInternals(nodeIds);
      rafs.push(requestAnimationFrame(refit));
    });
    rafs.push(raf1);
    const t = setTimeout(refit, 120);
    return () => {
      rafs.forEach(cancelAnimationFrame);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key, refit]);

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
  const nodeIds = React.useMemo(() => nodes.map((n) => n.id), [nodes]);

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
          <ContextFlowFit containerRef={containerRef} nodeIds={nodeIds} />
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

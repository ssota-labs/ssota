"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import { FlowTopToolbar, FlowViewportToolbar } from "@/lib/page-runtime/components/flow-toolbar";
import { layoutFlowWithDagre } from "@/lib/page-runtime/flow-layout";
import {
  SUBFLOW_HEADER_H,
  SUBFLOW_LOOP_PAD,
  SUBFLOW_PAD,
  buildSubflowModel,
  type GatePolicyInstance,
  type OverviewNodeData,
  type TopologyNodeData,
  type WorkCycleInstance,
} from "./work-cycle-model";

const DIAGRAM_HEIGHT = 720;
/** Dagre nodesep/ranksep — RF 공식 예제 패턴에 맞춘 간격. */
const OUTER_LAYOUT_SPACING = 72;
const NESTED_LAYOUT_SPACING = 56;

/** 역방향(reject_loop·back handoff) 엣지용 하단 핸들 — forward(좌→우)와 분리해 행 아래로 우회. */
function LoopHandle() {
  const style = { left: "50%", transform: "translateX(-50%)" };
  return (
    <>
      <Handle
        id="loop"
        type="target"
        position={Position.Bottom}
        style={style}
        className="!pointer-events-none !h-0 !w-0 !min-h-0 !min-w-0 !border-0 !opacity-0"
      />
      <Handle
        id="loop"
        type="source"
        position={Position.Bottom}
        style={style}
        className="!bg-muted-foreground"
      />
    </>
  );
}

type CycleCardData = OverviewNodeData & {
  onToggleExpand?: (cycleKey: string) => void;
};

function ExpandToggle({
  cycleKey,
  expanded,
  expandable,
  onToggleExpand,
}: {
  cycleKey: string;
  expanded: boolean;
  expandable: boolean;
  onToggleExpand?: (cycleKey: string) => void;
}) {
  if (!expandable) return null;
  return (
    <button
      type="button"
      data-testid={`work-cycle-expand-${cycleKey}`}
      aria-expanded={expanded}
      aria-label={expanded ? "Collapse cycle" : "Expand cycle"}
      className={cn(
        "border-border bg-background hover:bg-muted text-muted-foreground",
        "flex size-7 shrink-0 items-center justify-center rounded-md border",
      )}
      onClick={(ev) => {
        ev.stopPropagation();
        onToggleExpand?.(cycleKey);
      }}
    >
      {expanded ? (
        <MinusIcon className="size-3.5" weight="bold" />
      ) : (
        <PlusIcon className="size-3.5" weight="bold" />
      )}
    </button>
  );
}

function CycleCardNode({ data, selected }: NodeProps) {
  const d = data as unknown as CycleCardData;
  return (
    <div
      className={cn(
        "bg-card border-border w-[240px] rounded-lg border px-3 py-2 shadow-sm",
        selected && "ring-primary ring-2",
        d.expanded && "border-primary/40",
      )}
      data-testid={`work-cycle-node-${d.cycleKey}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            {d.letter}. {d.group}
          </div>
          <div className="text-sm font-semibold leading-snug">{d.title}</div>
          <div className="text-muted-foreground mt-1 flex gap-2 text-[11px]">
            <span>{d.stageCount} stages</span>
            <span>{d.gateCount} gates</span>
            {d.orchestratorMode ? <span>orch: {d.orchestratorMode}</span> : null}
          </div>
        </div>
        <ExpandToggle
          cycleKey={d.cycleKey}
          expanded={d.expanded}
          expandable={d.expandable}
          onToggleExpand={d.onToggleExpand}
        />
      </div>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
      <LoopHandle />
    </div>
  );
}

/** Parent group — children nest inside via React Flow `parentId`. */
function CycleGroupNode({ data, selected }: NodeProps) {
  const d = data as unknown as CycleCardData;
  return (
    <div
      className={cn(
        "border-border bg-muted/30 h-full w-full rounded-xl border-2 border-dashed",
        selected && "ring-primary ring-2",
        "border-primary/35",
      )}
      data-testid={`work-cycle-group-${d.cycleKey}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      <div
        className="border-border/60 flex items-start gap-2 border-b px-3 py-2"
        style={{ height: SUBFLOW_HEADER_H }}
      >
        <div className="min-w-0 flex-1">
          <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            {d.letter}. {d.group}
          </div>
          <div className="text-sm font-semibold leading-snug">{d.title}</div>
        </div>
        <ExpandToggle
          cycleKey={d.cycleKey}
          expanded={d.expanded}
          expandable={d.expandable}
          onToggleExpand={d.onToggleExpand}
        />
      </div>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
      <LoopHandle />
    </div>
  );
}

function TopologyStepNode({ data, selected }: NodeProps) {
  const d = data as unknown as TopologyNodeData;
  const isGate = d.nodeKind === "gate";
  return (
    <div
      className={cn(
        "bg-card border-border w-full rounded-lg border px-3 py-2 shadow-sm",
        isGate && "border-chart-4/60 bg-chart-4/5",
        d.nodeKind === "trigger" && "border-dashed",
        d.nodeKind === "end" && "border-primary/40",
        selected && "ring-primary ring-2",
      )}
      style={{ minWidth: 160 }}
      data-testid={
        isGate
          ? `work-cycle-gate-${d.parentCycleKey}-${d.gatePolicyKey ?? d.label}`
          : undefined
      }
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
        {d.nodeKind}
        {d.owner ? ` · ${d.owner}` : ""}
      </div>
      <div className="text-sm font-semibold leading-snug">{d.label}</div>
      {d.catalogKeys && d.catalogKeys.length > 0 ? (
        <div className="text-muted-foreground mt-1 truncate text-[11px]">
          {d.catalogKeys.join(", ")}
        </div>
      ) : null}
      {d.gatePolicyKey ? (
        <div className="text-chart-4 mt-1 text-[11px]">
          {d.gatePolicyKey}
        </div>
      ) : null}
      {d.gateSummary ? (
        <div className="text-muted-foreground mt-0.5 truncate font-mono text-[10px]">
          {d.gateSummary}
        </div>
      ) : null}
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
      <LoopHandle />
    </div>
  );
}

const NODE_TYPES = {
  cycleCard: CycleCardNode,
  cycleGroup: CycleGroupNode,
  topologyStep: TopologyStepNode,
};

function edgeLabelProps(kind: string): Partial<Edge> {
  if (kind === "reject_loop") {
    return {
      labelStyle: { fill: "var(--destructive)", fontSize: 11, fontWeight: 600 },
      labelBgStyle: { fill: "var(--card)" },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
    };
  }
  return {
    labelStyle: { fill: "var(--muted-foreground)", fontSize: 11 },
    labelBgStyle: { fill: "var(--card)" },
    labelBgPadding: [4, 2] as [number, number],
    labelBgBorderRadius: 4,
  };
}

function edgeStyle(kind: string): React.CSSProperties | undefined {
  if (kind === "feed" || kind === "handoff") {
    return { strokeDasharray: "6 4" };
  }
  if (kind === "reject_loop") {
    return { stroke: "var(--destructive)" };
  }
  return undefined;
}

function FitViewWhenReady({
  hostRef,
  depsKey,
}: {
  hostRef: React.RefObject<HTMLDivElement | null>;
  depsKey: string;
}) {
  const { fitView } = useReactFlow();
  const ready = useNodesInitialized();

  React.useEffect(() => {
    if (!ready) return;
    const run = () => {
      const el = hostRef.current;
      if (!el || el.clientWidth < 40 || el.clientHeight < 40) return;
      void fitView({ padding: 0.12, minZoom: 0.15, duration: 200 });
    };
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });
    const el = hostRef.current;
    if (!el || typeof ResizeObserver === "undefined") {
      return () => cancelAnimationFrame(raf);
    }
    const ro = new ResizeObserver(() => run());
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [ready, fitView, hostRef, depsKey]);

  return null;
}

/**
 * Work-cycle map as React Flow Sub Flows.
 *
 * Layout: React Flow 공식 Dagre 예제 패턴으로 노드만 배치
 * (@see https://reactflow.dev/examples/layout/dagre).
 * Edges: RF 내장 SmoothStep — 공식 layouting 가이드는 엣지 라우팅을
 * 별도 라이브러리 없이 내장 타입에 맡기는 것을 기본으로 한다
 * (@see https://reactflow.dev/learn/layouting/layouting#routing-edges).
 * 사이클(back handoff)은 layout 입력에서 제외하고 하단 loop 핸들로 그린다.
 * @see https://reactflow.dev/learn/layouting/sub-flows
 */
export function WorkCycleDiagram({
  cycles,
  policies,
}: {
  cycles: WorkCycleInstance[];
  policies: GatePolicyInstance[];
}) {
  const policiesByKey = React.useMemo(() => {
    const map = new Map<string, GatePolicyInstance>();
    for (const p of policies) map.set(p.properties.policyKey, p);
    return map;
  }, [policies]);

  const [expandedCycleKeys, setExpandedCycleKeys] = React.useState<Set<string>>(
    () => new Set(),
  );

  const toggleExpand = React.useCallback((cycleKey: string) => {
    setExpandedCycleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(cycleKey)) next.delete(cycleKey);
      else next.add(cycleKey);
      return next;
    });
  }, []);

  const fitKey = React.useMemo(
    () => [...expandedCycleKeys].toSorted().join(","),
    [expandedCycleKeys],
  );

  const model = React.useMemo(
    () => buildSubflowModel(cycles, policiesByKey, expandedCycleKeys),
    [cycles, policiesByKey, expandedCycleKeys],
  );

  const [nodes, setNodes] = React.useState<Node[]>([]);
  const [edges, setEdges] = React.useState<Edge[]>([]);
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const nestedPositions = new Map<
      string,
      { positions: Record<string, { x: number; y: number }>; width: number; height: number }
    >();

    for (const nest of model.nestedLayouts) {
      const laid = layoutFlowWithDagre(
        {
          nodes: nest.nodes.map((n) => ({
            id: n.id,
            title: n.id,
            width: n.width,
            height: n.height,
          })),
          edges: nest.edges,
        },
        "LR",
        NESTED_LAYOUT_SPACING,
      );
      let maxX = 0;
      let maxY = 0;
      for (const n of nest.nodes) {
        const p = laid[n.id] ?? { x: 0, y: 0 };
        maxX = Math.max(maxX, p.x + n.width);
        maxY = Math.max(maxY, p.y + n.height);
      }
      const offsetPositions: Record<string, { x: number; y: number }> = {};
      for (const [id, p] of Object.entries(laid)) {
        offsetPositions[id] = {
          x: p.x + SUBFLOW_PAD,
          y: p.y + SUBFLOW_HEADER_H + SUBFLOW_PAD,
        };
      }
      nestedPositions.set(nest.cycleKey, {
        positions: offsetPositions,
        width: Math.max(280, maxX + SUBFLOW_PAD * 2),
        height: Math.max(
          160,
          maxY +
            SUBFLOW_HEADER_H +
            SUBFLOW_PAD * 2 +
            (nest.hasBackEdges ? SUBFLOW_LOOP_PAD : 0),
        ),
      });
    }

    const topLevel = model.nodes.filter((n) => !n.parentId);
    const topWithSize = topLevel.map((n) => {
      const nest = nestedPositions.get(n.id);
      return {
        id: n.id,
        title: n.data.kind === "cycle" ? n.data.title : n.id,
        width: nest?.width ?? n.width,
        height: nest?.height ?? n.height,
      };
    });

    // Forward handoff만 dagre에 넣는다 — back-edge는 사이클이라 랭크를 무너뜨린다.
    const outerPositions = layoutFlowWithDagre(
      {
        nodes: topWithSize,
        edges: model.edges
          .filter((e) => !e.id.includes("::") && !e.backward)
          .map((e) => ({ id: e.id, source: e.source, target: e.target })),
      },
      "LR",
      OUTER_LAYOUT_SPACING,
    );

    const rfNodes: Node[] = [];
    for (const n of model.nodes) {
      if (n.parentId) continue;
      const nest = nestedPositions.get(n.id);
      const w = nest?.width ?? n.width;
      const h = nest?.height ?? n.height;
      const baseData =
        n.data.kind === "cycle"
          ? ({ ...n.data, onToggleExpand: toggleExpand } satisfies CycleCardData)
          : n.data;
      rfNodes.push({
        id: n.id,
        type: n.rfType,
        position: outerPositions[n.id] ?? { x: 0, y: 0 },
        data: baseData,
        style: n.rfType === "cycleGroup" ? { width: w, height: h } : undefined,
        width: n.rfType === "cycleGroup" ? w : undefined,
        height: n.rfType === "cycleGroup" ? h : undefined,
        // Official dagre example sets handle sides for LR.
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    }
    for (const n of model.nodes) {
      if (!n.parentId) continue;
      const nest = nestedPositions.get(n.parentId);
      const rel = nest?.positions[n.id] ?? { x: SUBFLOW_PAD, y: SUBFLOW_HEADER_H };
      rfNodes.push({
        id: n.id,
        type: n.rfType,
        parentId: n.parentId,
        extent: "parent",
        position: rel,
        data: n.data,
        style: { width: n.width, height: n.height },
        draggable: false,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    }

    setNodes(rfNodes);
    setEdges(
      model.edges.map((e): Edge => {
        const loop = e.backward === true;
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: loop ? "loop" : undefined,
          targetHandle: loop ? "loop" : undefined,
          // Official dagre example uses SmoothStep for edges.
          type: "smoothstep",
          label: e.label,
          zIndex: e.id.includes("::") ? 10 : 0,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
          },
          ...edgeLabelProps(e.kind),
          style: edgeStyle(e.kind),
        };
      }),
    );
  }, [model, toggleExpand]);

  return (
    <div
      ref={hostRef}
      className="border-border bg-muted/20 relative w-full overflow-hidden rounded-xl border"
      style={{ height: DIAGRAM_HEIGHT }}
      data-testid="work-cycle-flow-canvas"
    >
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          fitView
          minZoom={0.1}
          proOptions={{ hideAttribution: true }}
          style={{ width: "100%", height: DIAGRAM_HEIGHT }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <FlowTopToolbar locked={false} onToggleLock={() => {}} />
          <FlowViewportToolbar />
          <FitViewWhenReady hostRef={hostRef} depsKey={fitKey || "collapsed"} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}


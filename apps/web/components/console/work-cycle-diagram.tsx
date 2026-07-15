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
import {
  ElkOrthogonalEdge,
  type ElkOrthogonalEdgeData,
} from "@/lib/page-runtime/components/elk-orthogonal-edge";
import { FlowTopToolbar, FlowViewportToolbar } from "@/lib/page-runtime/components/flow-toolbar";
import {
  layoutFlowWithEdges,
  synthesizeFeedbackRoutes,
  type RoutedEdge,
} from "@/lib/page-runtime/flow-layout";
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
/** Outer canvas spacing — room for orthogonal corridors between cycle cards. */
const OUTER_LAYOUT_SPACING = 72;
const NESTED_LAYOUT_SPACING = 56;

function offsetRoutedEdges(
  routes: RoutedEdge[],
  dx: number,
  dy: number,
): RoutedEdge[] {
  return routes.map((r) => ({
    id: r.id,
    points: r.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
  }));
}

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

const EDGE_TYPES = {
  elkOrthogonal: ElkOrthogonalEdge,
};

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

function edgeStrokeStyle(kind: string): React.CSSProperties | undefined {
  if (kind === "feed" || kind === "handoff") {
    return { strokeDasharray: "6 4" };
  }
  if (kind === "reject_loop") {
    return { stroke: "var(--destructive)" };
  }
  return undefined;
}

/**
 * Work-cycle map as React Flow Sub Flows: topology steps nest inside an
 * expanded cycle group via `parentId` + relative positions.
 * Edge paths: forward handoffs/sequence use ELK orthogonal sections
 * (`layoutFlowWithEdges`); feedback/reject_loop use stacked lanes under the
 * nodes (`synthesizeFeedbackRoutes`) so cycles don't scramble LR ranks.
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
    let cancelled = false;

    async function run() {
      const nestedLayouts = new Map<
        string,
        {
          positions: Record<string, { x: number; y: number }>;
          width: number;
          height: number;
          /** Nest-local ELK routes; later shifted into absolute flow coords. */
          routes: RoutedEdge[];
        }
      >();

      for (const nest of model.nestedLayouts) {
        // Forward-only ELK orthogonal: placement + routes stay in one coordinate space.
        const nestNodes = nest.nodes.map((n) => ({
          id: n.id,
          title: n.id,
          width: n.width,
          height: n.height,
        }));
        const laid = await layoutFlowWithEdges(
          { nodes: nestNodes, edges: nest.edges },
          "LR",
          NESTED_LAYOUT_SPACING,
        );
        const nestNodeMap = new Map(
          nest.nodes.map((n) => [
            n.id,
            {
              id: n.id,
              width: n.width,
              height: n.height,
              x: laid.positions[n.id]?.x ?? 0,
              y: laid.positions[n.id]?.y ?? 0,
            },
          ]),
        );
        const backNestEdges = model.edges
          .filter((e) => e.id.startsWith(`${nest.cycleKey}::`) && e.backward)
          .map((e) => ({ id: e.id, source: e.source, target: e.target }));
        const feedback = synthesizeFeedbackRoutes(nestNodeMap, backNestEdges);
        const nestRoutes = [...laid.edges, ...feedback];

        let maxX = 0;
        let maxY = 0;
        for (const n of nest.nodes) {
          const p = laid.positions[n.id] ?? { x: 0, y: 0 };
          maxX = Math.max(maxX, p.x + n.width);
          maxY = Math.max(maxY, p.y + n.height);
        }
        if (feedback.length > 0) {
          for (const r of feedback) {
            for (const p of r.points) maxY = Math.max(maxY, p.y);
          }
        }
        const offsetPositions: Record<string, { x: number; y: number }> = {};
        for (const [id, p] of Object.entries(laid.positions)) {
          offsetPositions[id] = {
            x: p.x + SUBFLOW_PAD,
            y: p.y + SUBFLOW_HEADER_H + SUBFLOW_PAD,
          };
        }
        nestedLayouts.set(nest.cycleKey, {
          positions: offsetPositions,
          width: Math.max(280, maxX + SUBFLOW_PAD * 2),
          height: Math.max(
            160,
            maxY +
              SUBFLOW_HEADER_H +
              SUBFLOW_PAD * 2 +
              (nest.hasBackEdges ? SUBFLOW_LOOP_PAD : 0),
          ),
          routes: nestRoutes,
        });
      }

      if (cancelled) return;

      const topLevel = model.nodes.filter((n) => !n.parentId);
      const topWithSize = topLevel.map((n) => {
        const nest = nestedLayouts.get(n.id);
        return {
          id: n.id,
          title: n.data.kind === "cycle" ? n.data.title : n.id,
          width: nest?.width ?? n.width,
          height: nest?.height ?? n.height,
        };
      });

      // Outer forward handoffs → ELK orthogonal; back handoffs → stacked lanes below.
      const outerForward = model.edges
        .filter((e) => !e.id.includes("::") && !e.backward)
        .map((e) => ({ id: e.id, source: e.source, target: e.target }));
      const outer = await layoutFlowWithEdges(
        { nodes: topWithSize, edges: outerForward },
        "LR",
        OUTER_LAYOUT_SPACING,
      );
      const outerNodeMap = new Map(
        topWithSize.map((n) => [
          n.id,
          {
            id: n.id,
            width: n.width,
            height: n.height,
            x: outer.positions[n.id]?.x ?? 0,
            y: outer.positions[n.id]?.y ?? 0,
          },
        ]),
      );
      const outerBack = model.edges
        .filter((e) => !e.id.includes("::") && e.backward)
        .map((e) => ({ id: e.id, source: e.source, target: e.target }));
      const outerFeedback = synthesizeFeedbackRoutes(outerNodeMap, outerBack);
      const outerRoutes = [...outer.edges, ...outerFeedback];

      if (cancelled) return;

      const routeById = new Map<string, RoutedEdge>();
      for (const r of outerRoutes) routeById.set(r.id, r);

      for (const [cycleKey, nest] of nestedLayouts) {
        const parentPos = outer.positions[cycleKey] ?? { x: 0, y: 0 };
        const abs = offsetRoutedEdges(
          nest.routes,
          parentPos.x + SUBFLOW_PAD,
          parentPos.y + SUBFLOW_HEADER_H + SUBFLOW_PAD,
        );
        for (const r of abs) routeById.set(r.id, r);
      }

      const rfNodes: Node[] = [];
      for (const n of model.nodes) {
        if (n.parentId) continue;
        const nest = nestedLayouts.get(n.id);
        const w = nest?.width ?? n.width;
        const h = nest?.height ?? n.height;
        const baseData =
          n.data.kind === "cycle"
            ? ({ ...n.data, onToggleExpand: toggleExpand } satisfies CycleCardData)
            : n.data;
        rfNodes.push({
          id: n.id,
          type: n.rfType,
          position: outer.positions[n.id] ?? { x: 0, y: 0 },
          data: baseData,
          style: n.rfType === "cycleGroup" ? { width: w, height: h } : undefined,
          width: n.rfType === "cycleGroup" ? w : undefined,
          height: n.rfType === "cycleGroup" ? h : undefined,
        });
      }
      for (const n of model.nodes) {
        if (!n.parentId) continue;
        const nest = nestedLayouts.get(n.parentId);
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
        });
      }

      setNodes(rfNodes);
      setEdges(
        model.edges.map((e): Edge => {
          const route = routeById.get(e.id);
          const data: ElkOrthogonalEdgeData = {
            points: route?.points,
            kind: e.kind,
            label: e.label,
          };
          const loop = e.backward === true;
          return {
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: loop ? "loop" : undefined,
            targetHandle: loop ? "loop" : undefined,
            type: "elkOrthogonal",
            data,
            label: e.label,
            zIndex: e.id.includes("::") ? 10 : 0,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 16,
              height: 16,
            },
            style: edgeStrokeStyle(e.kind),
          };
        }),
      );
    }

    run().catch((error) => {
      console.error("[work-cycle] layout failed", error);
    });
    return () => {
      cancelled = true;
    };
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
          edgeTypes={EDGE_TYPES}
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

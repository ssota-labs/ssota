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
import { layoutFlow } from "@/lib/page-runtime/flow-layout";
import type { FlowModel } from "@/lib/page-runtime/flow-model";
import {
  buildExpandCollapseModel,
  type GatePolicyInstance,
  type OverviewNodeData,
  type TopologyNodeData,
  type WorkCycleInstance,
} from "./work-cycle-model";

const DIAGRAM_HEIGHT = 720;

type CycleCardData = OverviewNodeData & {
  onToggleExpand?: (cycleKey: string) => void;
};

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
        {d.expandable ? (
          <button
            type="button"
            data-testid={`work-cycle-expand-${d.cycleKey}`}
            aria-expanded={d.expanded}
            aria-label={d.expanded ? "Collapse cycle" : "Expand cycle"}
            className={cn(
              "border-border bg-background hover:bg-muted text-muted-foreground",
              "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border",
            )}
            onClick={(ev) => {
              ev.stopPropagation();
              d.onToggleExpand?.(d.cycleKey);
            }}
          >
            {d.expanded ? (
              <MinusIcon className="size-3.5" weight="bold" />
            ) : (
              <PlusIcon className="size-3.5" weight="bold" />
            )}
          </button>
        ) : null}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
  );
}

function TopologyStepNode({ data, selected }: NodeProps) {
  const d = data as unknown as TopologyNodeData;
  const isGate = d.nodeKind === "gate";
  return (
    <div
      className={cn(
        "bg-card border-border w-[200px] rounded-lg border px-3 py-2 shadow-sm",
        isGate && "border-amber-500/60 bg-amber-500/5",
        d.nodeKind === "trigger" && "border-dashed",
        d.nodeKind === "end" && "border-emerald-600/40",
        selected && "ring-primary ring-2",
      )}
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
        <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
          {d.gatePolicyKey}
        </div>
      ) : null}
      {d.gateSummary ? (
        <div className="text-muted-foreground mt-0.5 truncate font-mono text-[10px]">
          {d.gateSummary}
        </div>
      ) : null}
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
  );
}

const NODE_TYPES = {
  cycleCard: CycleCardNode,
  topologyStep: TopologyStepNode,
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

function WorkCycleFlowCanvas({
  nodes,
  edges,
  height = DIAGRAM_HEIGHT,
  fitKey,
}: {
  nodes: Node[];
  edges: Edge[];
  height?: number;
  fitKey: string;
}) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  return (
    <div
      ref={hostRef}
      className="border-border bg-muted/20 relative w-full overflow-hidden rounded-xl border"
      style={{ height }}
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
          style={{ width: "100%", height }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <FlowTopToolbar locked={false} onToggleLock={() => {}} />
          <FlowViewportToolbar />
          <FitViewWhenReady hostRef={hostRef} depsKey={fitKey} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

/**
 * One React Flow canvas with all work cycles. Expanding a cycle reveals its
 * topology (stages + gates) via the official `hidden` expand/collapse pattern.
 * @see https://reactflow.dev/examples/layout/expand-collapse
 */
export function WorkCycleExpandCollapseDiagram({
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

  const model = React.useMemo(
    () => buildExpandCollapseModel(cycles, policiesByKey, expandedCycleKeys),
    [cycles, policiesByKey, expandedCycleKeys],
  );

  const [nodes, setNodes] = React.useState<Node[]>([]);
  const [edges, setEdges] = React.useState<Edge[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    // Layout only visible (non-hidden) nodes — matches RF expand-collapse examples.
    const visibleNodes = model.nodes.filter((n) => !n.hidden);
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    const visibleEdges = model.edges.filter(
      (e) => !e.hidden && visibleIds.has(e.source) && visibleIds.has(e.target),
    );

    const flowModel: FlowModel = {
      nodes: visibleNodes.map((n) => ({
        id: n.id,
        title:
          n.data.kind === "cycle" ? n.data.title : (n.data as TopologyNodeData).label,
        width: n.width,
        height: n.height,
      })),
      edges: visibleEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    };

    void layoutFlow(flowModel, "LR").then((positions) => {
      if (cancelled) return;
      setNodes(
        model.nodes.map((n) => {
          const baseData =
            n.data.kind === "cycle"
              ? ({ ...n.data, onToggleExpand: toggleExpand } satisfies CycleCardData)
              : n.data;
          return {
            id: n.id,
            type: n.rfType,
            position: positions[n.id] ?? { x: 0, y: 0 },
            hidden: n.hidden,
            data: baseData,
          };
        }),
      );
      setEdges(
        model.edges.map((e) => {
          const dashed =
            e.kind === "feed" || e.kind === "handoff" || e.kind === "expand";
          return {
            id: e.id,
            source: e.source,
            target: e.target,
            hidden: e.hidden,
            label: e.label,
            style: dashed
              ? { strokeDasharray: "6 4" }
              : e.kind === "reject_loop"
                ? { stroke: "var(--destructive)" }
                : undefined,
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
          };
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [model, toggleExpand]);

  const fitKey = React.useMemo(
    () => [...expandedCycleKeys].toSorted().join(","),
    [expandedCycleKeys],
  );

  return (
    <WorkCycleFlowCanvas nodes={nodes} edges={edges} fitKey={fitKey || "collapsed"} />
  );
}

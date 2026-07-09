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
import { cn } from "@ssota/ui/lib/utils";
import { FlowTopToolbar, FlowViewportToolbar } from "@/lib/page-runtime/components/flow-toolbar";
import { layoutFlow } from "@/lib/page-runtime/flow-layout";
import type { FlowModel } from "@/lib/page-runtime/flow-model";
import {
  buildOverviewModel,
  buildTopologyModel,
  type GatePolicyInstance,
  type OverviewNodeData,
  type TopologyNodeData,
  type WorkCycleInstance,
} from "./work-cycle-model";

const DIAGRAM_HEIGHT = 640;

function CycleCardNode({ data, selected }: NodeProps) {
  const d = data as unknown as OverviewNodeData;
  return (
    <div
      className={cn(
        "bg-card border-border w-[220px] rounded-lg border px-3 py-2 shadow-sm",
        selected && "ring-primary ring-2",
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
        {d.letter}. {d.group}
      </div>
      <div className="text-sm font-semibold leading-snug">{d.title}</div>
      <div className="text-muted-foreground mt-1 flex gap-2 text-[11px]">
        <span>{d.stageCount} stages</span>
        <span>{d.gateCount} gates</span>
        {d.orchestratorMode ? <span>orch: {d.orchestratorMode}</span> : null}
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

function FitViewOnce() {
  const { fitView } = useReactFlow();
  const ready = useNodesInitialized();
  React.useEffect(() => {
    if (ready) void fitView({ padding: 0.15, minZoom: 0.2 });
  }, [ready, fitView]);
  return null;
}

function WorkCycleFlowCanvas({
  nodes,
  edges,
}: {
  nodes: Node[];
  edges: Edge[];
}) {
  return (
    <div className="border-border bg-muted/20 relative h-[640px] overflow-hidden rounded-xl border">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          fitView
          proOptions={{ hideAttribution: true }}
          style={{ height: DIAGRAM_HEIGHT }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <FlowTopToolbar locked={false} onToggleLock={() => {}} />
          <FlowViewportToolbar />
          <FitViewOnce />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

export function WorkCycleOverviewDiagram({
  cycles,
  onSelectCycle,
}: {
  cycles: WorkCycleInstance[];
  onSelectCycle: (cycleKey: string) => void;
}) {
  const model = React.useMemo(() => buildOverviewModel(cycles), [cycles]);
  const [nodes, setNodes] = React.useState<Node[]>([]);
  const [edges, setEdges] = React.useState<Edge[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    const flowModel: FlowModel = {
      nodes: model.nodes.map((n) => ({
        id: n.id,
        title: n.data.title,
        width: 220,
        height: 88,
      })),
      edges: model.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    };
    void layoutFlow(flowModel, "LR").then((positions) => {
      if (cancelled) return;
      setNodes(
        model.nodes.map((n) => ({
          id: n.id,
          type: "cycleCard",
          position: positions[n.id] ?? { x: 0, y: 0 },
          data: n.data,
        })),
      );
      setEdges(
        model.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          animated: false,
          style: { strokeDasharray: "6 4" },
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [model]);

  return (
    <div
      onClick={(ev) => {
        const target = (ev.target as HTMLElement).closest(".react-flow__node");
        if (!target) return;
        const id = target.getAttribute("data-id");
        if (id) onSelectCycle(id);
      }}
    >
      <WorkCycleFlowCanvas nodes={nodes} edges={edges} />
    </div>
  );
}

export function WorkCycleTopologyDiagram({
  cycle,
  policies,
}: {
  cycle: WorkCycleInstance;
  policies: GatePolicyInstance[];
}) {
  const policiesByKey = React.useMemo(() => {
    const map = new Map<string, GatePolicyInstance>();
    for (const p of policies) map.set(p.properties.policyKey, p);
    return map;
  }, [policies]);

  const model = React.useMemo(
    () => buildTopologyModel(cycle.properties.topology, policiesByKey),
    [cycle, policiesByKey],
  );
  const [nodes, setNodes] = React.useState<Node[]>([]);
  const [edges, setEdges] = React.useState<Edge[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    const flowModel: FlowModel = {
      nodes: model.nodes.map((n) => ({
        id: n.id,
        title: n.data.label,
        width: 200,
        height: n.data.nodeKind === "gate" ? 100 : 80,
      })),
      edges: model.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    };
    void layoutFlow(flowModel, "LR").then((positions) => {
      if (cancelled) return;
      setNodes(
        model.nodes.map((n) => ({
          id: n.id,
          type: "topologyStep",
          position: positions[n.id] ?? { x: 0, y: 0 },
          data: n.data,
        })),
      );
      setEdges(
        model.edges.map((e) => {
          const dashed = e.kind === "feed" || e.kind === "handoff";
          return {
            id: e.id,
            source: e.source,
            target: e.target,
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
  }, [model]);

  return <WorkCycleFlowCanvas nodes={nodes} edges={edges} />;
}

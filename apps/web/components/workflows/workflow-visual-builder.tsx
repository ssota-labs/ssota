"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Workflow } from "@ssota/contracts";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import { cn } from "@ssota/ui/lib/utils";
import {
  createPaletteNode,
  extractStepOrderFromGraph,
  workflowToFlowGraph,
  type WorkflowFlowNode,
  type WorkflowFlowNodeData,
  type WorkflowFlowNodeKind,
} from "@/lib/workflows/workflow-flow-model";
import { layoutGraphWithDagre } from "@/lib/graph/dagre-layout";

const nodeStyles: Record<WorkflowFlowNodeKind, string> = {
  trigger: "border-primary/50 bg-primary/5 text-foreground shadow-sm",
  context: "border-border bg-muted/50 text-foreground",
  step: "border-border bg-card text-card-foreground shadow-sm",
  gate: "border-amber-500/40 bg-amber-500/10 text-foreground",
  condition: "border-violet-500/40 bg-violet-500/10 text-foreground",
  output: "border-emerald-500/40 bg-emerald-500/10 text-foreground",
};

function WorkflowFlowNodeCard({ data, selected }: NodeProps<WorkflowFlowNode>) {
  const showTarget = data.kind !== "trigger";
  const showSource = data.kind !== "output";

  return (
    <div
      style={data.layoutWidth ? { width: data.layoutWidth } : undefined}
      className={cn(
        "min-w-44 max-w-[240px] rounded-xl border px-3 py-2 text-left transition-shadow",
        !data.layoutWidth && "w-max",
        nodeStyles[data.kind],
        selected && "ring-2 ring-primary/40",
      )}
    >
      {showTarget ? (
        <Handle type="target" position={Position.Left} className="!size-2" />
      ) : null}
      {showSource ? (
        <Handle type="source" position={Position.Right} className="!size-2" />
      ) : null}
      {data.eyebrow ? (
        <div className="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {data.eyebrow}
        </div>
      ) : null}
      <div className="text-sm font-semibold">{data.label}</div>
      {data.description ? (
        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {data.description}
        </div>
      ) : null}
      {data.badges?.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {data.badges.slice(0, 3).map((badge) => (
            <Badge key={badge} variant="secondary" className="text-[10px]">
              {badge}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const nodeTypes = { workflowNode: WorkflowFlowNodeCard };

const PALETTE: { kind: WorkflowFlowNodeKind; label: string; hint: string }[] = [
  { kind: "step", label: "Step", hint: "Agent work unit" },
  { kind: "gate", label: "Review gate", hint: "Human approval" },
  { kind: "condition", label: "Condition", hint: "Branch criteria" },
];

type WorkflowVisualBuilderInnerProps = {
  workflow: Workflow;
  readOnly?: boolean;
  onStepsReorder?: (stepIds: string[]) => void;
};

function WorkflowVisualBuilderInner({
  workflow,
  readOnly = false,
  onStepsReorder,
}: WorkflowVisualBuilderInnerProps) {
  const initial = useMemo(() => workflowToFlowGraph(workflow), [workflow]);
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowFlowNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    const next = workflowToFlowGraph(workflow);
    setNodes(next.nodes);
    setEdges(next.edges);
    requestAnimationFrame(() => fitView({ padding: 0.12, duration: 200 }));
  }, [workflow, setNodes, setEdges, fitView]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            animated: false,
          },
          current,
        ),
      );
    },
    [readOnly, setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      if (readOnly) return;
      event.preventDefault();
      const kind = event.dataTransfer.getData(
        "application/reactflow",
      ) as WorkflowFlowNodeKind;
      if (!kind || !reactFlowWrapper.current) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const node = createPaletteNode(kind, position);
      setNodes((current) => [...current, node]);
    },
    [readOnly, screenToFlowPosition, setNodes],
  );

  const onDragStart = useCallback(
    (event: React.DragEvent, kind: WorkflowFlowNodeKind) => {
      event.dataTransfer.setData("application/reactflow", kind);
      event.dataTransfer.effectAllowed = "move";
    },
    [],
  );

  const autoLayout = useCallback(() => {
    const layouted = layoutGraphWithDagre(nodes, edges, "LR", {
      getNodeSize: (node) => ({
        width: node.data.layoutWidth ?? 220,
        height: 120,
      }),
    });
    setNodes(layouted.nodes as WorkflowFlowNode[]);
    setEdges(layouted.edges);
    requestAnimationFrame(() => fitView({ padding: 0.12, duration: 300 }));
  }, [nodes, edges, setNodes, setEdges, fitView]);

  const notifyReorder = useCallback(() => {
    onStepsReorder?.(extractStepOrderFromGraph(nodes, edges));
  }, [nodes, edges, onStepsReorder]);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;

  return (
    <div className="flex h-full min-h-0">
      {!readOnly ? (
        <aside className="flex w-44 shrink-0 flex-col border-r bg-muted/20">
          <div className="border-b px-3 py-2">
            <p className="text-xs font-semibold">Palette</p>
            <p className="text-[10px] text-muted-foreground">Drag onto canvas</p>
          </div>
          <ul className="space-y-1 p-2">
            {PALETTE.map((item) => (
              <li key={item.kind}>
                <div
                  draggable
                  onDragStart={(event) => onDragStart(event, item.kind)}
                  className="cursor-grab rounded-md border bg-background px-2 py-1.5 text-xs active:cursor-grabbing"
                  data-testid={`palette-${item.kind}`}
                >
                  <div className="font-medium">{item.label}</div>
                  <div className="text-[10px] text-muted-foreground">{item.hint}</div>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}

      <div ref={reactFlowWrapper} className="relative min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          deleteKeyCode={readOnly ? null : "Backspace"}
          proOptions={{ hideAttribution: true }}
          className="bg-background"
        >
          <Background gap={20} size={1} />
          <Controls showInteractive={!readOnly} />
          <MiniMap
            nodeStrokeWidth={3}
            zoomable
            pannable
            className="!bottom-3 !right-3"
          />
          <Panel position="top-right" className="flex gap-2">
            {!readOnly ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 bg-background text-xs"
                  onClick={autoLayout}
                  data-testid="workflow-auto-layout"
                >
                  Auto layout
                </Button>
                {onStepsReorder ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={notifyReorder}
                  >
                    Apply order
                  </Button>
                ) : null}
              </>
            ) : null}
          </Panel>
        </ReactFlow>

        {selectedNode && !readOnly ? (
          <div className="absolute bottom-3 left-3 z-10 w-56 rounded-lg border bg-background/95 p-3 shadow-md backdrop-blur-sm">
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              {selectedNode.data.kind}
            </p>
            <p className="mt-1 text-sm font-semibold">{selectedNode.data.label}</p>
            {selectedNode.data.description ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedNode.data.description}
              </p>
            ) : null}
            <p className="mt-2 text-[10px] text-muted-foreground">
              Connect handles · drag to reposition · Backspace to delete
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function WorkflowVisualBuilder(props: WorkflowVisualBuilderInnerProps) {
  return (
    <ReactFlowProvider>
      <WorkflowVisualBuilderInner {...props} />
    </ReactFlowProvider>
  );
}

export type { WorkflowFlowNodeData };

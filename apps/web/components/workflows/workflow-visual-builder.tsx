"use client";

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import type { ActionCatalogEntry, NodeCatalogEntry, Workflow } from "@ssota/contracts";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import { PlusIcon } from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ssota/ui/components/ui/dropdown-menu";
import { cn } from "@ssota/ui/lib/utils";
import { WorkflowNodeInspector } from "@/components/workflows/workflow-node-inspector";
import {
  createWorkflowFlowNode,
  layoutWorkflowGraph,
  workflowToFlowGraph,
  type WorkflowFlowNode,
  type WorkflowFlowNodeData,
  type WorkflowFlowNodeKind,
} from "@/lib/workflows/workflow-flow-model";

const nodeStyles: Record<WorkflowFlowNodeKind, string> = {
  trigger: "border-primary/50 bg-primary/5 text-foreground shadow-sm",
  context: "border-border bg-muted/50 text-foreground",
  step: "border-border bg-card text-card-foreground shadow-sm",
  gate: "border-amber-500/40 bg-amber-500/10 text-foreground",
  condition: "border-violet-500/40 bg-violet-500/10 text-foreground",
  output: "border-emerald-500/40 bg-emerald-500/10 text-foreground",
  reference: "border-sky-500/40 bg-sky-500/10 text-foreground",
  route: "border-rose-500/40 bg-rose-500/10 text-foreground",
};

function WorkflowFlowNodeCard({ data, selected }: NodeProps<WorkflowFlowNode>) {
  const showTarget = data.kind !== "trigger";
  const showSource = data.kind !== "output" && data.kind !== "reference";
  const AddIcon = data.AddIcon;

  return (
    <div
      style={data.layoutWidth ? { width: data.layoutWidth } : undefined}
      className={cn(
        "relative min-w-44 max-w-[240px] rounded-xl border px-3 py-2 text-left transition-shadow",
        !data.layoutWidth && "w-max",
        nodeStyles[data.kind],
        selected && "ring-2 ring-primary/40",
      )}
    >
      {showTarget ? (
        <Handle
          type="target"
          position={Position.Left}
          className="!size-2"
          style={{ top: 18 }}
        />
      ) : null}
      {showSource ? (
        <Handle
          type="source"
          position={Position.Right}
          className="!size-2"
          style={{ top: 18 }}
        />
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
      {data.addOptions?.length && data.onAddNode && AddIcon ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="nodrag nopan absolute top-1/2 -right-3 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-foreground"
                aria-label={`Add next block after ${data.label}`}
                data-testid={`add-node-${data.kind}`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              />
            }
          >
            <AddIcon className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40" align="start">
            {data.addOptions.map((kind) => (
              <DropdownMenuItem
                key={kind}
                onClick={(event) => {
                  event.stopPropagation();
                  if (data.nodeId) data.onAddNode?.(data.nodeId, kind);
                }}
                data-testid={`add-node-option-${kind}`}
              >
                {NODE_LABELS[kind]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

const nodeTypes = { workflowNode: WorkflowFlowNodeCard };

const NODE_LABELS: Record<WorkflowFlowNodeKind, string> = {
  trigger: "Trigger",
  context: "Context",
  condition: "Condition",
  step: "Step",
  gate: "Gate",
  output: "Output",
  reference: "Reference",
  route: "Route",
};

type WorkflowVisualBuilderInnerProps = {
  workflow: Workflow;
  workflowId: string;
  projectId: string;
  nodeCatalog: NodeCatalogEntry[];
  actionCatalog: ActionCatalogEntry[];
  readOnly?: boolean;
};

function addOptionsForKind(kind: WorkflowFlowNodeKind, readOnly: boolean) {
  if (readOnly) return [];
  if (kind === "context") return ["condition", "step", "route"] satisfies WorkflowFlowNodeKind[];
  if (kind === "condition") {
    return ["step", "gate", "route", "output"] satisfies WorkflowFlowNodeKind[];
  }
  if (kind === "step") {
    return [
      "condition",
      "step",
      "gate",
      "output",
      "reference",
      "route",
    ] satisfies WorkflowFlowNodeKind[];
  }
  if (kind === "gate") return ["step", "output"] satisfies WorkflowFlowNodeKind[];
  return [];
}

function decorateWorkflowNodes(
  nodes: WorkflowFlowNode[],
  readOnly: boolean,
  onAddNode: (sourceNodeId: string, kind: WorkflowFlowNodeKind) => void,
) {
  return nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      nodeId: node.id,
      addOptions: addOptionsForKind(node.data.kind, readOnly),
      onAddNode,
      AddIcon: PlusIcon,
    },
  }));
}

function WorkflowVisualBuilderInner({
  workflow,
  workflowId,
  projectId,
  nodeCatalog,
  actionCatalog,
  readOnly = false,
}: WorkflowVisualBuilderInnerProps) {
  const initial = useMemo(() => workflowToFlowGraph(workflow), [workflow]);
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowFlowNode>(initial.nodes);
  const [edges, setEdges] = useState<Edge[]>(initial.edges);
  const nodesRef = useRef<WorkflowFlowNode[]>(initial.nodes);
  const edgesRef = useRef<Edge[]>(initial.edges);
  const { fitView } = useReactFlow();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const onAddNodeRef = useRef<
    (sourceNodeId: string, kind: WorkflowFlowNodeKind) => void
  >(() => {});

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const addNodeAfter = useCallback(
    (sourceNodeId: string, kind: WorkflowFlowNodeKind) => {
      if (readOnly) return;

      const nextNode = createWorkflowFlowNode(kind);
      const currentEdges = edgesRef.current;
      const currentNodes = nodesRef.current;
      const executionOutgoing = currentEdges.filter(
        (edge) =>
          edge.source === sourceNodeId &&
          (edge.data as { kind?: string } | undefined)?.kind !== "reference",
      );
      const retainedEdges =
        kind === "reference"
          ? currentEdges
          : currentEdges.filter(
              (edge) =>
                !(
                  edge.source === sourceNodeId &&
                  (edge.data as { kind?: string } | undefined)?.kind !== "reference"
                ),
            );
      const newEdge: Edge = {
        id: `edge-${sourceNodeId}-${nextNode.id}`,
        source: sourceNodeId,
        target: nextNode.id,
        type: "smoothstep",
        label:
          kind === "reference"
            ? "uses"
            : sourceNodeId.startsWith("condition:") && kind === "route"
              ? "no"
              : sourceNodeId.startsWith("condition:")
                ? "yes"
                : kind === "route"
                  ? "handoff"
                  : undefined,
        data: kind === "reference" ? { kind: "reference" } : undefined,
        style: kind === "reference" ? { strokeDasharray: "5 5" } : undefined,
      };
      const rewiredEdges =
        kind === "reference"
          ? []
          : executionOutgoing.map((edge) => ({
              ...edge,
              id: `edge-${nextNode.id}-${edge.target}`,
              source: nextNode.id,
              label:
                nextNode.data.kind === "condition"
                  ? "yes"
                  : edge.label,
            }));
      const layouted = layoutWorkflowGraph(
        [...currentNodes, nextNode],
        [...retainedEdges, newEdge, ...rewiredEdges],
      );
      setNodes(decorateWorkflowNodes(layouted.nodes, readOnly, onAddNodeRef.current));
      setEdges(layouted.edges);
      setSelectedNodeId(nextNode.id);
      requestAnimationFrame(() => fitView({ padding: 0.12, duration: 250 }));
    },
    [fitView, readOnly, setNodes],
  );

  useEffect(() => {
    onAddNodeRef.current = addNodeAfter;
  }, [addNodeAfter]);

  useEffect(() => {
    const next = workflowToFlowGraph(workflow);
    startTransition(() => {
      setNodes(decorateWorkflowNodes(next.nodes, readOnly, onAddNodeRef.current));
      setEdges(next.edges);
    });
    requestAnimationFrame(() => fitView({ padding: 0.12, duration: 200 }));
  }, [workflow, setNodes, setEdges, fitView, readOnly]);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;

  return (
    <div className="flex h-full min-h-0">
      <div className="relative min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={!readOnly}
          deleteKeyCode={null}
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
        </ReactFlow>
      </div>
      {!readOnly && selectedNode ? (
        <WorkflowNodeInspector
          workflow={workflow}
          workflowId={workflowId}
          projectId={projectId}
          nodeCatalog={nodeCatalog}
          actionCatalog={actionCatalog}
          selectedNode={selectedNode}
        />
      ) : null}
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

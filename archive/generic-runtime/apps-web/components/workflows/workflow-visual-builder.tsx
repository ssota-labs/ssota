"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActionCatalogEntry, Workflow } from "@ssota/contracts";
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
import {
  FlowArrowIcon,
  GitBranchIcon,
  ListChecksIcon,
  PlusIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Button } from "@ssota/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ssota/ui/components/ui/dropdown-menu";
import { cn } from "@ssota/ui/lib/utils";
import { saveWorkflowBuilderFormAction } from "@/app/actions";
import {
  WorkflowNodeInspector,
  type WorkflowPickerOption,
} from "@/components/workflows/workflow-node-inspector";
import {
  createWorkflowDraft,
  draftToWorkflowWire,
  extractBuilderPatch,
  insertBlockAfter,
  isWorkflowDraftDirty,
  type WorkflowDraft,
} from "@/lib/workflows/workflow-draft";
import {
  ROUTE_OUTLET_HANDLE_SPACING,
  ROUTE_OUTLET_HANDLE_TOP_BASE,
  workflowToFlowGraph,
  type WorkflowFlowNode,
  type WorkflowFlowNodeData,
  type WorkflowFlowNodeKind,
} from "@/lib/workflows/workflow-flow-model";
import type {
  WorkflowEdgeCatalogOption,
  WorkflowNodeCatalogOption,
} from "@/lib/workflows/workflow-context-defaults";

const nodeStyles: Record<WorkflowFlowNodeKind, string> = {
  trigger: "border-primary/50 bg-primary/5 text-foreground shadow-sm",
  context: "border-border bg-muted/50 text-foreground",
  step: "border-border bg-card text-card-foreground shadow-sm",
  gate: "border-amber-500/40 bg-amber-500/10 text-foreground",
  route: "border-violet-500/40 bg-violet-500/10 text-foreground",
  workflow: "border-rose-500/40 bg-rose-500/10 text-foreground",
};

const ADDABLE_KINDS: WorkflowFlowNodeKind[] = ["step", "route", "workflow"];

const NODE_LABELS: Record<WorkflowFlowNodeKind, string> = {
  trigger: "Trigger",
  context: "Context",
  step: "Step",
  gate: "Gate",
  route: "Route",
  workflow: "Workflow",
};

const NODE_ICONS: Record<WorkflowFlowNodeKind, Icon> = {
  trigger: PlusIcon,
  context: PlusIcon,
  step: ListChecksIcon,
  gate: ShieldCheckIcon,
  route: GitBranchIcon,
  workflow: FlowArrowIcon,
};

function WorkflowFlowNodeCard({ data, selected }: NodeProps<WorkflowFlowNode>) {
  const showTarget = data.kind !== "trigger";
  const showLinearSource =
    data.kind !== "workflow" && data.kind !== "route";
  const AddIcon = data.AddIcon;
  const routeOutlets = data.routeOutlets ?? [];

  const renderAddMenu = (sourceNodeId: string) => {
    if (!data.addOptions?.length || !data.onAddNode || !AddIcon) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="nodrag nopan flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-foreground"
              aria-label={`Add block from ${data.label}`}
              data-testid={`add-node-${data.kind}`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            />
          }
        >
          <AddIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-44" align="start">
          {data.addOptions.map((kind) => {
            const KindIcon = NODE_ICONS[kind];
            return (
              <DropdownMenuItem
                key={kind}
                onClick={(event) => {
                  event.stopPropagation();
                  data.onAddNode?.(sourceNodeId, kind);
                }}
                data-testid={`add-node-option-${kind}`}
              >
                <KindIcon />
                {NODE_LABELS[kind]}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div
      style={data.layoutWidth ? { width: data.layoutWidth } : undefined}
      className={cn(
        "relative min-w-44 max-w-[260px] rounded-xl border px-3 py-2 text-left transition-shadow",
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
      {showLinearSource ? (
        <Handle
          type="source"
          position={Position.Right}
          className="!size-2"
          style={{ top: 18 }}
        />
      ) : null}
      {data.kind === "route"
        ? routeOutlets.map((outlet, index) => {
            const top = ROUTE_OUTLET_HANDLE_TOP_BASE + index * ROUTE_OUTLET_HANDLE_SPACING;
            return (
              <Handle
                key={outlet.id}
                id={outlet.id}
                type="source"
                position={Position.Right}
                className="!size-2"
                style={{ top }}
              />
            );
          })
        : null}
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
      {data.nodeId ? (
        <div
          className={cn(
            "absolute -right-3",
            data.kind === "route"
              ? "top-2"
              : "top-1/2 -translate-y-1/2",
          )}
        >
          {renderAddMenu(data.nodeId)}
        </div>
      ) : null}
    </div>
  );
}

const nodeTypes = { workflowNode: WorkflowFlowNodeCard };

type WorkflowVisualBuilderProps = {
  workflow: Workflow;
  workflowId: string;
  projectId: string;
  orgSlug: string;
  projectSlug: string;
  workflowOptions: WorkflowPickerOption[];
  actionCatalog: ActionCatalogEntry[];
  contextNodeCatalog: WorkflowNodeCatalogOption[];
  contextEdgeCatalog: WorkflowEdgeCatalogOption[];
  readOnly?: boolean;
};

function addOptionsForKind(kind: WorkflowFlowNodeKind, readOnly: boolean) {
  if (readOnly) return [];
  if (kind === "context") return ADDABLE_KINDS;
  if (kind === "route") return ADDABLE_KINDS;
  if (kind === "step" || kind === "gate") {
    return ["step", "gate", "route"] satisfies WorkflowFlowNodeKind[];
  }
  return [];
}

function decorateWorkflowNodes(
  nodes: WorkflowFlowNode[],
  readOnly: boolean,
  onAddNode: (
    sourceNodeId: string,
    kind: WorkflowFlowNodeKind,
    outletId?: string,
  ) => void,
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
  orgSlug,
  projectSlug,
  workflowOptions,
  contextNodeCatalog,
  contextEdgeCatalog,
  readOnly = false,
}: WorkflowVisualBuilderProps) {
  const [draft, setDraft] = useState<WorkflowDraft>(() => createWorkflowDraft(workflow));
  const draftWire = useMemo(() => draftToWorkflowWire(draft, workflow), [draft, workflow]);
  const graph = useMemo(() => workflowToFlowGraph(draftWire), [draftWire]);
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowFlowNode>(graph.nodes);
  const [edges, setEdges] = useState<Edge[]>(graph.edges);
  const { fitView } = useReactFlow();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const onAddNodeRef = useRef<
  (
    sourceNodeId: string,
    kind: WorkflowFlowNodeKind,
    outletId?: string,
  ) => void
  >(() => {});

  const dirty = useMemo(
    () => !readOnly && isWorkflowDraftDirty(draft, workflow),
    [draft, workflow, readOnly],
  );

  useEffect(() => {
    setDraft(createWorkflowDraft(workflow));
    setSelectedNodeId(null);
  }, [workflow.id, workflow.updatedAt]);

  const syncCanvas = useCallback(
    (nextDraft: WorkflowDraft, focusNodeId?: string | null) => {
      const wire = draftToWorkflowWire(nextDraft, workflow);
      const nextGraph = workflowToFlowGraph(wire);
      setDraft(nextDraft);
      setNodes(
        decorateWorkflowNodes(nextGraph.nodes, readOnly, onAddNodeRef.current),
      );
      setEdges(nextGraph.edges);
      if (focusNodeId) setSelectedNodeId(focusNodeId);
      requestAnimationFrame(() => fitView({ padding: 0.12, duration: 250 }));
    },
    [fitView, readOnly, setNodes, workflow],
  );

  const addNodeAfter = useCallback(
    (sourceNodeId: string, kind: WorkflowFlowNodeKind, outletId?: string) => {
      if (readOnly) return;
      const { draft: nextDraft, focusNodeId } = insertBlockAfter(
        draft,
        sourceNodeId,
        kind,
        outletId,
      );
      syncCanvas(nextDraft, focusNodeId);
    },
    [draft, readOnly, syncCanvas],
  );

  useEffect(() => {
    onAddNodeRef.current = addNodeAfter;
  }, [addNodeAfter]);

  useEffect(() => {
    setNodes(decorateWorkflowNodes(graph.nodes, readOnly, onAddNodeRef.current));
    setEdges(graph.edges);
  }, [graph.edges, graph.nodes, readOnly, setNodes]);

  useEffect(() => {
    if (selectedNodeId && !graph.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [graph.nodes, selectedNodeId]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );
  const builderPatch = useMemo(() => extractBuilderPatch(draft), [draft]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!readOnly ? (
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
          <p className="text-sm text-muted-foreground">
            {dirty ? "Unsaved changes" : "All changes saved"}
          </p>
          <form action={saveWorkflowBuilderFormAction}>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="workflowId" value={workflowId} />
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <input type="hidden" name="projectSlug" value={projectSlug} />
            <input type="hidden" name="workflowSlug" value={workflow.slug} />
            <input
              type="hidden"
              name="workflowSpec"
              value={JSON.stringify(builderPatch)}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!dirty}
              data-testid="save-workflow-builder"
            >
              Save
            </Button>
          </form>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1">
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
            draft={draft}
            selectedNode={selectedNode}
            currentWorkflowKey={workflow.workflowKey}
            onDraftChange={syncCanvas}
            workflowOptions={workflowOptions}
            allowedActions={draft.allowedActions}
            contextNodeCatalog={contextNodeCatalog}
            contextEdgeCatalog={contextEdgeCatalog}
          />
        ) : null}
      </div>
    </div>
  );
}

export function WorkflowVisualBuilder(props: WorkflowVisualBuilderProps) {
  return (
    <ReactFlowProvider>
      <WorkflowVisualBuilderInner {...props} />
    </ReactFlowProvider>
  );
}

export type { WorkflowFlowNodeData };

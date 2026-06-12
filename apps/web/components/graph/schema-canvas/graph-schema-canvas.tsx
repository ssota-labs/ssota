"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { EdgeCatalogEntry, NodeCatalogEntry } from "@loopos/core";
import { CatalogEdge } from "./catalog-edge";
import { CatalogNode } from "./catalog-node";
import {
  buildSchemaGraph,
  type CatalogEdgeData,
  type CatalogNodeData,
  type SchemaSelection,
} from "./build-schema-graph";
import { SchemaCanvasStyles } from "./schema-canvas-styles";
import { SchemaDetailPanel, type SchemaPanelSelection } from "./schema-detail-panel";

const nodeTypes = { catalogNode: CatalogNode };
const edgeTypes = { catalogEdge: CatalogEdge };

export type GraphSchemaCanvasProps = {
  nodeEntries: NodeCatalogEntry[];
  edgeEntries: EdgeCatalogEntry[];
  initialSelection?: SchemaSelection;
  toolbar?: React.ReactNode;
  title?: string;
  description?: string;
};

function GraphSchemaCanvasInner({
  nodeEntries,
  edgeEntries,
  initialSelection = null,
  toolbar,
  title = "Schema",
  description = "Node catalog and allowed relationships between node types.",
}: GraphSchemaCanvasProps) {
  const nodeBySlug = useMemo(
    () => new Map(nodeEntries.map((entry) => [entry.slug, entry])),
    [nodeEntries],
  );
  const edgeBySlug = useMemo(
    () => new Map(edgeEntries.map((entry) => [entry.slug, entry])),
    [edgeEntries],
  );

  const graph = useMemo(
    () => buildSchemaGraph(nodeEntries, edgeEntries, initialSelection),
    [nodeEntries, edgeEntries, initialSelection],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CatalogNodeData>>(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<CatalogEdgeData>>(graph.edges);
  const [panelSelection, setPanelSelection] = useState<SchemaPanelSelection>(() => {
    if (!initialSelection) return null;
    if (initialSelection.kind === "node") {
      const entry = nodeBySlug.get(initialSelection.slug);
      return entry ? { kind: "node", entry } : null;
    }
    const entry = edgeBySlug.get(initialSelection.slug);
    return entry ? { kind: "edge", entry } : null;
  });

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setNodes, setEdges]);

  useEffect(() => {
    if (!initialSelection) return;
    if (initialSelection.kind === "node") {
      const entry = nodeBySlug.get(initialSelection.slug);
      setPanelSelection(entry ? { kind: "node", entry } : null);
      return;
    }
    const entry = edgeBySlug.get(initialSelection.slug);
    setPanelSelection(entry ? { kind: "edge", entry } : null);
  }, [initialSelection, nodeBySlug, edgeBySlug]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanelSelection(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<CatalogNodeData>) => {
      const entry = nodeBySlug.get(node.id);
      if (!entry) return;
      setNodes((current) =>
        current.map((item) => ({ ...item, selected: item.id === node.id })),
      );
      setEdges((current) => current.map((item) => ({ ...item, selected: false })));
      setPanelSelection({ kind: "node", entry });
    },
    [nodeBySlug, setNodes, setEdges],
  );

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge<CatalogEdgeData>) => {
      const slug = edge.data?.slug;
      if (!slug) return;
      const entry = edgeBySlug.get(slug);
      if (!entry) return;
      setEdges((current) =>
        current.map((item) => ({
          ...item,
          selected: item.data?.slug === slug,
        })),
      );
      setNodes((current) => current.map((item) => ({ ...item, selected: false })));
      setPanelSelection({ kind: "edge", entry });
    },
    [edgeBySlug, setNodes, setEdges],
  );

  const onPaneClick = useCallback(() => {
    setNodes((current) => current.map((item) => ({ ...item, selected: false })));
    setEdges((current) => current.map((item) => ({ ...item, selected: false })));
    setPanelSelection(null);
  }, [setNodes, setEdges]);

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-semibold">{title}</h1>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {toolbar ? <div className="flex shrink-0 items-center gap-2">{toolbar}</div> : null}
      </div>

      <div className="relative min-h-0 flex-1">
        <div className="schema-canvas absolute inset-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              nodeColor="var(--muted-foreground)"
              maskColor="color-mix(in oklch, var(--background) 70%, transparent)"
            />
          </ReactFlow>
        </div>
        <SchemaDetailPanel selection={panelSelection} onClose={() => setPanelSelection(null)} />
      </div>
      <SchemaCanvasStyles />
    </div>
  );
}

export function GraphSchemaCanvas(props: GraphSchemaCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphSchemaCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

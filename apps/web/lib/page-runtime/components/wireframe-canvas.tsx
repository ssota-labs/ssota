"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useNodesInitialized,
  type Edge,
  type Node,
} from "@xyflow/react";
import { cn } from "@ssota/ui/lib/utils";
import { boundNodes } from "../bindings";
import { useSelection } from "../selection-context";
import { deriveWireframeEdges } from "@/lib/wireframe/extract-links";
import {
  WireframeNavigationProvider,
} from "@/lib/wireframe/navigation-context";
import { readWireframeJsx, readWireframePosition, wireframeSlug } from "@/lib/wireframe/read-wireframe";
import type { CatalogComponent, RenderNode } from "../types";
import {
  WIREFRAME_NODE_HEIGHT,
  WIREFRAME_NODE_WIDTH,
  WireframeFlowNode,
} from "./wireframe-node";

const NODE_TYPES = { wireframe: WireframeFlowNode };

const GRID_GAP_X = 360;
const GRID_GAP_Y = 560;

function FlowViewportSync({
  focusNodeId,
  positions,
}: {
  focusNodeId: string | null;
  positions: Record<string, { x: number; y: number }>;
}) {
  const initialized = useNodesInitialized();
  const { fitView, setCenter } = useReactFlow();

  React.useEffect(() => {
    if (initialized && Object.keys(positions).length > 0 && !focusNodeId) {
      void fitView({ padding: 0.2, duration: 300 });
    }
  }, [initialized, positions, focusNodeId, fitView]);

  React.useEffect(() => {
    if (!focusNodeId || !initialized) return;
    const pos = positions[focusNodeId];
    if (!pos) return;
    const timer = window.setTimeout(() => {
      void setCenter(
        pos.x + WIREFRAME_NODE_WIDTH / 2,
        pos.y + WIREFRAME_NODE_HEIGHT / 2,
        { zoom: 0.85, duration: 450 },
      );
    }, 50);
    return () => window.clearTimeout(timer);
  }, [focusNodeId, initialized, positions, setCenter]);

  return null;
}

function WireframeCanvasEl({
  nodes,
  selectedId,
  onSelect,
  height,
}: {
  nodes: RenderNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  height: number;
}) {
  const frames = React.useMemo(
    () =>
      nodes.map((node) => {
        const slug = wireframeSlug(node.title, node.properties ?? {});
        return {
          id: node.id,
          slug,
          title: node.title,
          jsx: readWireframeJsx(node.properties ?? {}),
          properties: node.properties ?? {},
          position: readWireframePosition(node.properties ?? {}),
        };
      }),
    [nodes],
  );

  const slugToNodeId = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const frame of frames) {
      map[frame.slug] = frame.id;
    }
    return map;
  }, [frames]);

  const navEdges = React.useMemo(
    () =>
      deriveWireframeEdges(
        frames.map((frame) => ({ slug: frame.slug, jsx: frame.jsx })),
      ),
    [frames],
  );

  const positions = React.useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    frames.forEach((frame, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      map[frame.id] = {
        x: frame.position.x ?? col * GRID_GAP_X,
        y: frame.position.y ?? row * GRID_GAP_Y,
      };
    });
    return map;
  }, [frames]);

  const rfNodes = React.useMemo<Node[]>(() => {
    return frames.map((frame) => {
      const position = positions[frame.id] ?? { x: 0, y: 0 };
      return {
        id: frame.id,
        type: "wireframe",
        position,
        data: {
          title: frame.title,
          slug: frame.slug,
          properties: frame.properties,
          selected: frame.id === selectedId,
        },
        selected: frame.id === selectedId,
      };
    });
  }, [frames, positions, selectedId]);

  const rfEdges = React.useMemo<Edge[]>(() => {
    const slugToRfId = Object.fromEntries(frames.map((f) => [f.slug, f.id]));
    const edges: Edge[] = [];
    navEdges.forEach((edge, index) => {
      const source = slugToRfId[edge.sourceSlug];
      const target = slugToRfId[edge.targetSlug];
      if (!source || !target) return;
      const missing = !slugToNodeId[edge.targetSlug];
      edges.push({
        id: `nav-${index}-${edge.sourceSlug}-${edge.targetSlug}`,
        source,
        target,
        animated: !missing,
        label: missing ? "missing" : undefined,
        style: missing
          ? { stroke: "var(--color-amber-500)", strokeDasharray: "6 4" }
          : { stroke: "var(--color-primary)" },
        labelStyle: missing
          ? { fill: "var(--color-amber-600)", fontSize: 10 }
          : undefined,
      });
    });
    return edges;
  }, [frames, navEdges, slugToNodeId]);

  const handleNavigate = React.useCallback(
    (nodeId: string) => {
      onSelect(nodeId);
    },
    [onSelect],
  );

  if (nodes.length === 0) {
    return (
      <div
        className="text-muted-foreground border-border flex h-full items-center justify-center rounded-lg border border-dashed p-6 text-sm"
        data-testid="wireframe-canvas"
      >
        No wireframes scoped to this initiative.
      </div>
    );
  }

  return (
    <WireframeNavigationProvider
      slugToNodeId={slugToNodeId}
      onNavigate={(nodeId) => handleNavigate(nodeId)}
    >
      <div
        className="ssota-wireframe-flow border-border bg-card relative w-full overflow-hidden rounded-lg border"
        style={{ height }}
        data-testid="wireframe-canvas"
      >
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={NODE_TYPES}
          nodesDraggable={false}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
          minZoom={0.15}
          maxZoom={1.2}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          onNodeClick={(_, node) => onSelect(node.id)}
        >
          <FlowViewportSync focusNodeId={selectedId} positions={positions} />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </WireframeNavigationProvider>
  );
}

function WireframeSidebar({
  nodes,
  selectedId,
  onSelect,
  className,
}: {
  nodes: RenderNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return nodes;
    return nodes.filter((node) => {
      const slug = wireframeSlug(node.title, node.properties ?? {});
      return (
        node.title.toLowerCase().includes(q) || slug.includes(q)
      );
    });
  }, [nodes, query]);

  return (
    <aside
      className={cn("border-border flex h-full min-h-0 flex-col border-r", className)}
      data-testid="wireframe-sidebar"
    >
      <div className="border-border border-b p-3">
        <p className="mb-2 text-xs font-semibold">Wireframes</p>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search wireframes..."
          aria-label="Search wireframes"
          className="border-input bg-background placeholder:text-muted-foreground w-full rounded-md border px-2 py-1.5 text-xs"
        />
        <p className="text-muted-foreground mt-2 text-[10px]">
          {nodes.length} page{nodes.length === 1 ? "" : "s"}
        </p>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto p-2">
        {filtered.map((node) => {
          const slug = wireframeSlug(node.title, node.properties ?? {});
          const active = node.id === selectedId;
          return (
            <li key={node.id}>
              <button
                type="button"
                data-testid={`wireframe-list-${slug}`}
                className={cn(
                  "mb-1 w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted/60 text-foreground",
                )}
                onClick={() => onSelect(node.id)}
              >
                <span className="block truncate">{node.title}</span>
                <span className="text-muted-foreground block truncate text-[10px]">
                  {slug}
                </span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 ? (
          <li className="text-muted-foreground px-2 py-4 text-xs">
            No wireframes match your search.
          </li>
        ) : null}
      </ul>
    </aside>
  );
}

function WireframeCanvasView({
  props,
  bindingData,
}: {
  props: Record<string, unknown>;
  bindingData: import("../types").BindingContext;
}) {
  const nodes = boundNodes(bindingData, props);
  const selection = useSelection();
  const selectedBinding =
    typeof props.selectedBinding === "string" ? props.selectedBinding : "selected";
  const selectedFromBinding = bindingData[selectedBinding];
  const selectedId =
    selectedFromBinding &&
    typeof selectedFromBinding === "object" &&
    "id" in selectedFromBinding
      ? String((selectedFromBinding as { id: string }).id)
      : selection?.selectedId ?? nodes[0]?.id ?? null;

  const height =
    typeof props.height === "number" && props.height > 0 ? props.height : 640;

  const onSelect = React.useCallback(
    (id: string) => {
      selection?.setSelectedId(id);
    },
    [selection],
  );

  return (
    <div
      className="border-border flex h-full min-h-0 overflow-hidden rounded-lg border"
      data-testid="wireframe-canvas-shell"
    >
      <WireframeSidebar
        nodes={nodes}
        selectedId={selectedId}
        onSelect={onSelect}
        className="w-[min(16rem,32%)] shrink-0"
      />
      <div className="min-w-0 flex-1 p-2">
        <WireframeCanvasEl
          nodes={nodes}
          selectedId={selectedId}
          onSelect={onSelect}
          height={height}
        />
      </div>
    </div>
  );
}

export const wireframeComponents: Record<string, CatalogComponent> = {
  WireframeCanvas: ({ props, bindingData }) => (
    <ReactFlowProvider>
      <WireframeCanvasView props={props} bindingData={bindingData} />
    </ReactFlowProvider>
  ),
};

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
  type Node,
} from "@xyflow/react";
import { cn } from "@ssota/ui/lib/utils";
import { WireframeViewportToolbar } from "@/components/console/wireframe/wireframe-viewport-toolbar";
import { boundNodes } from "../bindings";
import { useSelection } from "../selection-context";
import { WireframeNavigationProvider } from "@/lib/wireframe/navigation-context";
import { readWireframeJsx, wireframeSlug } from "@/lib/wireframe/read-wireframe";
import type { WireframeViewport } from "@/lib/wireframe/viewport";
import {
  WireframeViewportProvider,
  useWireframeViewport,
} from "@/lib/wireframe/viewport-context";
import type { CatalogComponent, RenderNode } from "../types";
import { WireframeFlowNode } from "./wireframe-node";

const NODE_TYPES = { wireframe: WireframeFlowNode };

const WIREFRAME_FLOW_STYLES = `
.ssota-wireframe-flow .react-flow__renderer { z-index: 4; }
.ssota-wireframe-flow .react-flow__pane { z-index: 1; }
.ssota-wireframe-flow .react-flow__viewport { z-index: 2; pointer-events: none; }
.ssota-wireframe-flow .react-flow__nodes { pointer-events: none; }
.ssota-wireframe-flow .react-flow__node { z-index: 1; pointer-events: all; }
.ssota-wireframe-flow .react-flow__node.selected { z-index: 2; }
`;

/** Fit the single centered wireframe when selection or viewport changes. */
function SingleWireframeViewport({ nodeId }: { nodeId: string | null }) {
  const initialized = useNodesInitialized();
  const { fitView } = useReactFlow();
  const { viewport, size } = useWireframeViewport();

  React.useEffect(() => {
    if (initialized && nodeId) {
      void fitView({ padding: 0.2, duration: 300 });
    }
  }, [initialized, nodeId, viewport, size.width, size.height, fitView]);

  return null;
}

function WireframePreviewCanvas({
  activeFrame,
}: {
  activeFrame: {
    id: string;
    slug: string;
    title: string;
    properties: Record<string, unknown>;
  };
}) {
  const { viewport, setViewport } = useWireframeViewport();

  const rfNodes = React.useMemo<Node[]>(
    () => [
      {
        id: activeFrame.id,
        type: "wireframe",
        position: { x: 0, y: 0 },
        data: {
          properties: activeFrame.properties,
        },
        draggable: false,
        selectable: true,
      },
    ],
    [activeFrame],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <WireframeViewportToolbar
        title={activeFrame.title}
        slug={activeFrame.slug}
        viewport={viewport}
        onViewportChange={setViewport}
      />
      <div className="relative min-h-0 flex-1">
        <ReactFlow
          key={`${activeFrame.id}-${viewport}`}
          nodes={rfNodes}
          edges={[]}
          nodeTypes={NODE_TYPES}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          panOnDrag={[1, 2]}
          zoomOnScroll
          proOptions={{ hideAttribution: true }}
          minZoom={0.2}
          maxZoom={1.5}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          className="bg-muted/20"
        >
          <SingleWireframeViewport nodeId={activeFrame.id} />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls showInteractive={false} position="bottom-left" />
        </ReactFlow>
      </div>
    </div>
  );
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
  const [viewport, setViewport] = React.useState<WireframeViewport>("mobile");

  const frames = React.useMemo(
    () =>
      nodes.map((node) => ({
        id: node.id,
        slug: wireframeSlug(node.title, node.properties ?? {}),
        title: node.title,
        jsx: readWireframeJsx(node.properties ?? {}),
        properties: node.properties ?? {},
      })),
    [nodes],
  );

  const slugToNodeId = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const frame of frames) {
      map[frame.slug] = frame.id;
    }
    return map;
  }, [frames]);

  const activeFrame =
    frames.find((frame) => frame.id === selectedId) ?? frames[0] ?? null;

  const toolbarTitle = activeFrame?.title ?? "Wireframes";
  const toolbarSlug = activeFrame?.slug ?? "—";

  const handleNavigate = React.useCallback(
    (nodeId: string) => {
      onSelect(nodeId);
    },
    [onSelect],
  );

  if (nodes.length === 0) {
    return (
      <WireframeViewportProvider
        viewport={viewport}
        onViewportChange={setViewport}
      >
        <div
          className="ssota-wireframe-flow border-border bg-card relative flex w-full flex-col overflow-hidden rounded-lg border"
          style={{ height }}
          data-testid="wireframe-canvas"
        >
          <WireframeViewportToolbar
            title={toolbarTitle}
            slug={toolbarSlug}
            viewport={viewport}
            onViewportChange={setViewport}
          />
          <div className="text-muted-foreground flex flex-1 items-center justify-center p-6 text-sm">
            No wireframes scoped to this initiative.
          </div>
        </div>
      </WireframeViewportProvider>
    );
  }

  if (!activeFrame) {
    return (
      <WireframeViewportProvider
        viewport={viewport}
        onViewportChange={setViewport}
      >
        <div
          className="ssota-wireframe-flow border-border bg-card relative flex w-full flex-col overflow-hidden rounded-lg border"
          style={{ height }}
          data-testid="wireframe-canvas"
        >
          <WireframeViewportToolbar
            title={toolbarTitle}
            slug={toolbarSlug}
            viewport={viewport}
            onViewportChange={setViewport}
          />
          <div className="text-muted-foreground flex flex-1 items-center justify-center p-6 text-sm">
            Select a wireframe from the list to preview.
          </div>
        </div>
      </WireframeViewportProvider>
    );
  }

  return (
    <WireframeNavigationProvider
      slugToNodeId={slugToNodeId}
      activePageSlug={activeFrame.slug}
      onNavigate={handleNavigate}
    >
      <WireframeViewportProvider
        viewport={viewport}
        onViewportChange={setViewport}
      >
        <div
          className="ssota-wireframe-flow border-border bg-card relative flex w-full flex-col overflow-hidden rounded-lg border"
          style={{ height }}
          data-testid="wireframe-canvas"
        >
          <style>{WIREFRAME_FLOW_STYLES}</style>
          <WireframePreviewCanvas activeFrame={activeFrame} />
        </div>
      </WireframeViewportProvider>
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

function resolveInitialWireframeId(
  nodes: RenderNode[],
  bindingData: Record<string, unknown>,
  selectedBinding: string,
): string | null {
  const selectedFromBinding = bindingData[selectedBinding];
  if (
    selectedFromBinding &&
    typeof selectedFromBinding === "object" &&
    "id" in selectedFromBinding
  ) {
    return String((selectedFromBinding as { id: string }).id);
  }
  return nodes[0]?.id ?? null;
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

  const bindingSelectedId = React.useMemo(
    () => resolveInitialWireframeId(nodes, bindingData, selectedBinding),
    [nodes, bindingData, selectedBinding],
  );

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const activeIdExists = activeId
    ? nodes.some((node) => node.id === activeId)
    : false;
  const selectedId = activeIdExists ? activeId : bindingSelectedId;

  const height =
    typeof props.height === "number" && props.height > 0 ? props.height : 640;

  const onSelect = React.useCallback(
    (id: string) => {
      setActiveId(id);
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

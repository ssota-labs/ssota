"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  useUpdateNodeInternals,
  type Edge,
  type Node,
} from "@xyflow/react";
import type { JsonRenderSpec } from "@ssota/contracts";
import { useAction, type OnAction } from "../context";

// Lazy import breaks the static cycle flow-canvas → renderer → registry → flow-canvas.
const PanelRenderer = dynamic(
  () => import("../renderer").then((m) => m.DynamicPageRenderer),
  { ssr: false },
);
import { boundNode, boundNodesByKey } from "../bindings";
import {
  coerceFlow,
  coercePresentation,
  flowFromNodes,
  resolveNodeStyle,
  DEFAULT_NODE_HEIGHT,
  DEFAULT_NODE_WIDTH,
  type FlowModel,
} from "../flow-model";
import {
  layoutFlow,
  type FlowLayoutAlgorithm,
  type FlowLayoutDirection,
  type Positioned,
} from "../flow-layout";
import { FlowNode } from "./flow-node";
import { FlowEdge } from "./flow-edge";
import { FlowTopToolbar, FlowViewportToolbar } from "./flow-toolbar";
import {
  FLOW_HAND_PAN_STYLES,
  getFlowInteractionProps,
} from "./flow-preview-interaction";
import {
  DocumentCardListSheetPanel,
  type DocumentCardListSheetSize,
} from "./document-card-list-sheet-panel";
import { readNodeField } from "./roadmap-doc-card";
import type { CatalogComponent, RenderNode } from "../types";
import { cn } from "@/lib/utils";

const NODE_TYPES = { generic: FlowNode };
const EDGE_TYPES = { flow: FlowEdge };

const SHEET_SIZES: DocumentCardListSheetSize[] = [
  "default",
  "half",
  "inspector",
  "wide",
  "full",
  "viewport",
];

/** Z-index layering (edge line/marker colors are handled by the custom FlowEdge). */
const FLOW_STYLES = `
.ssota-flow .react-flow__node { z-index: 0; }
.ssota-flow .react-flow__edge { z-index: 1; }
.ssota-flow .react-flow__node.selected { z-index: 3; }
`;

/**
 * Re-fits the viewport once nodes are measured, and nudges handle-bounds
 * measurement so edge paths resolve. Nodes arrive after an async ELK pass, so
 * the bare `fitView` prop (which fires on mount with zero nodes) can't fit them;
 * `useNodesInitialized` flips true when React Flow has measured every node, which
 * is the right moment to fit and the point at which edges can render.
 */
function FlowReady({
  nodeIds,
  fitViewPadding,
  fitViewMinZoom,
  fitViewMaxZoom,
  fitViewOffsetY = 0,
}: {
  nodeIds: string[];
  fitViewPadding: number;
  fitViewMinZoom?: number;
  fitViewMaxZoom?: number;
  fitViewOffsetY?: number;
}) {
  const initialized = useNodesInitialized();
  const { fitView, getViewport, setViewport } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const key = nodeIds.join(",");

  React.useEffect(() => {
    if (nodeIds.length > 0) updateNodeInternals(nodeIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, updateNodeInternals]);

  React.useEffect(() => {
    if (!initialized || nodeIds.length === 0) return;

    const options = {
      padding: fitViewPadding,
      duration: 250,
      ...(fitViewMinZoom !== undefined ? { minZoom: fitViewMinZoom } : {}),
      ...(fitViewMaxZoom !== undefined ? { maxZoom: fitViewMaxZoom } : {}),
    };
    const applyOffset = () => {
      if (fitViewOffsetY === 0) return;
      const vp = getViewport();
      setViewport(
        { x: vp.x, y: vp.y + fitViewOffsetY, zoom: vp.zoom },
        { duration: 0 },
      );
    };
    const refit = () => {
      void fitView(options);
      requestAnimationFrame(() => {
        requestAnimationFrame(applyOffset);
      });
    };

    refit();
    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(refit);
    });
    const timer = window.setTimeout(refit, 120);

    return () => {
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(innerRaf);
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, key, fitView, getViewport, setViewport, fitViewPadding, fitViewMinZoom, fitViewMaxZoom, fitViewOffsetY]);

  return null;
}

type SheetConfig = {
  field: string;
  subtitleField: string;
  statusField: string;
  editable: boolean;
  sheetSize: DocumentCardListSheetSize;
  setAction?: string;
};

function FlowCanvasEl({
  mode,
  node,
  property,
  nodes,
  edges,
  presentation,
  direction,
  algorithm,
  height,
  sheet,
  panel,
  viewAction,
  fitViewPadding,
  fitViewMinZoom,
  fitViewMaxZoom,
  fitViewOffsetY = 0,
  showTopToolbar = true,
  showViewportToolbar,
  viewportToolbarPosition = "bottom-right",
  interactionLocked = false,
}: {
  mode: "jsonb" | "graph";
  node: RenderNode | undefined;
  property: string;
  nodes: RenderNode[];
  edges: unknown;
  presentation: unknown;
  direction: FlowLayoutDirection;
  algorithm: FlowLayoutAlgorithm;
  height: number;
  sheet: SheetConfig;
  panel: JsonRenderSpec | null;
  viewAction: string;
  fitViewPadding: number;
  fitViewMinZoom?: number;
  fitViewMaxZoom?: number;
  fitViewOffsetY?: number;
  showTopToolbar?: boolean;
  showViewportToolbar?: boolean;
  viewportToolbarPosition?: "bottom-right" | "top-right";
  interactionLocked?: boolean;
}) {
  const onAction = useAction();
  const { setCenter } = useReactFlow();
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Model 1 (jsonb): the whole graph lives in one node's property.
  // Model 2 (graph): real graph nodes + an edge list (e.g. traverse_edges).
  const model = React.useMemo(
    () =>
      mode === "graph"
        ? flowFromNodes(nodes, edges)
        : coerceFlow(node?.properties?.[property]),
    [mode, nodes, edges, node?.properties, property],
  );
  const manifest = React.useMemo(
    () => coercePresentation(presentation),
    [presentation],
  );
  const signature = React.useMemo(() => JSON.stringify(model), [model]);

  // Async ELK layout (or persisted coordinates) → positions keyed by node id.
  const [positions, setPositions] = React.useState<Positioned>({});
  React.useEffect(() => {
    let cancelled = false;
    void layoutFlow(model, direction, algorithm).then((pos) => {
      if (!cancelled) setPositions(pos);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, direction, algorithm]);

  const ready = Object.keys(positions).length > 0;

  // Toolbar lock toggles zoom/pan in product canvases; landing previews use hand-pan only.
  const [locked, setLocked] = React.useState(false);
  const flowInteraction = getFlowInteractionProps(interactionLocked, locked);
  const viewportToolbarVisible =
    showViewportToolbar === true ||
    (showViewportToolbar !== false && !interactionLocked);

  // ── Detail sheet ────────────────────────────────────────────────────────
  const [activeId, setActiveId] = React.useState<string | null>(null);
  // Drop the open sheet when the underlying graph changes.
  React.useEffect(() => setActiveId(null), [signature]);

  const activeFlowNode = activeId
    ? model.nodes.find((n) => n.id === activeId) ?? null
    : null;
  const activeRenderNode: RenderNode | null = activeFlowNode
    ? {
        id: activeFlowNode.id,
        catalogKey: activeFlowNode.nodeType ?? "node",
        title: activeFlowNode.title,
        properties: activeFlowNode.props ?? {},
      }
    : null;

  React.useEffect(() => {
    if (!activeId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeId]);

  // Pan so the selected node lands in the CENTER of the space left of the sheet
  // (legacy ssota canvas behaviour). Runs after the sheet has slid in so the
  // panel width is measurable.
  React.useEffect(() => {
    if (!activeId) return;
    const pos = positions[activeId];
    const flowNode = model.nodes.find((n) => n.id === activeId);
    if (!pos || !flowNode) return;
    const timer = setTimeout(() => {
      const pane = containerRef.current;
      if (!pane) return;
      const paneW = pane.clientWidth;
      if (paneW < 120) return; // skip panning on a degraded/zero-size read
      const panelEl = pane.querySelector<HTMLElement>(
        '[data-testid="document-sheet-panel"]',
      );
      const panelW = panelEl
        ? panelEl.getBoundingClientRect().width
        : Math.min(384, paneW * 0.4);
      const paneH = pane.clientHeight;
      const pad = 24;
      const availW = Math.max(140, paneW - panelW - pad * 2);
      const screenCenterX = pad + availW / 2;
      const nodeW = flowNode.width ?? DEFAULT_NODE_WIDTH;
      const nodeH = flowNode.height ?? DEFAULT_NODE_HEIGHT;
      const nodeCenterX = pos.x + nodeW / 2;
      const nodeCenterY = pos.y + nodeH / 2;
      // Zoom in so the node fills a comfortable share of the space left of the
      // sheet (legacy ssota behaviour) — bounded so it never overflows the pane.
      const zoom = Math.min(
        (availW * 0.42) / nodeW,
        (paneH * 0.5) / nodeH,
        1.5,
      );
      const targetZoom = Math.max(zoom, 0.7);
      // Offset the centred flow point so the node appears at screenCenterX
      // (left of the pane centre) instead of the viewport centre.
      const targetX = nodeCenterX + (paneW / 2 - screenCenterX) / targetZoom;
      void setCenter(targetX, nodeCenterY, { zoom: targetZoom, duration: 450 });
    }, 210);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, positions]);

  // ── Subtree collapse ──────────────────────────────────────────────────────
  // Parent → direct children (edge source → targets), for the collapse toggle.
  const childMap = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const e of model.edges) (map[e.source] ??= []).push(e.target);
    return map;
  }, [model.edges]);

  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  React.useEffect(() => setCollapsed(new Set()), [signature]);

  const toggleCollapse = React.useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Every descendant of a collapsed node is hidden.
  const hidden = React.useMemo(() => {
    const out = new Set<string>();
    const visit = (id: string) => {
      for (const child of childMap[id] ?? []) {
        if (!out.has(child)) {
          out.add(child);
          visit(child);
        }
      }
    };
    for (const id of collapsed) visit(id);
    return out;
  }, [collapsed, childMap]);

  // ── Shared view state ─────────────────────────────────────────────────────
  // The panel writes it (via `viewAction`), every node card reads it (`{{view.*}}`
  // + `when` gating). One toggle in the panel flips a metric row on all cards.
  const [view, setView] = React.useState<Record<string, unknown>>({});
  const handlePanelAction = React.useCallback<OnAction>(
    (actionKey, input) => {
      if (actionKey !== viewAction) return onAction?.(actionKey, input);
      setView((prev) => {
        const next = { ...prev };
        if (typeof input.key === "string") {
          next[input.key] = "value" in input ? input.value : !prev[input.key];
        } else if (typeof input.field === "string") {
          next[input.field] = input.value;
        } else if (input.tokens && typeof input.tokens === "object") {
          Object.assign(next, input.tokens as Record<string, unknown>);
        }
        return next;
      });
    },
    [viewAction, onAction],
  );

  const rfNodes = React.useMemo<Node[]>(() => {
    if (!ready) return [];
    return model.nodes.map((n) => ({
      id: n.id,
      type: "generic",
      position: positions[n.id] ?? { x: 0, y: 0 },
      hidden: hidden.has(n.id),
      data: {
        style: resolveNodeStyle(n, manifest),
        status: n.status,
        direction,
        childCount: childMap[n.id]?.length ?? 0,
        collapsed: collapsed.has(n.id),
        onToggleCollapse: () => toggleCollapse(n.id),
        renderNode: {
          id: n.id,
          catalogKey: n.nodeType ?? "node",
          title: n.title,
          properties: n.props ?? {},
        },
        view,
      },
    }));
  }, [model.nodes, manifest, positions, ready, direction, hidden, childMap, collapsed, toggleCollapse, view]);

  const rfEdges = React.useMemo<Edge[]>(
    () =>
      model.edges.map((e) => ({
        id: e.id,
        type: "flow",
        source: e.source,
        target: e.target,
        label: e.label,
        animated: e.animated ?? false,
        hidden: hidden.has(e.source) || hidden.has(e.target),
      })),
    [model.edges, hidden],
  );

  if (mode === "jsonb" && !node) {
    return (
      <div className="text-muted-foreground border-border rounded border border-dashed p-4 text-xs">
        FlowCanvas: no bound node.
      </div>
    );
  }
  if (model.nodes.length === 0) {
    return (
      <div className="text-muted-foreground border-border rounded border border-dashed p-4 text-xs">
        FlowCanvas: no nodes to display.
      </div>
    );
  }

  const onSave = (blocks: unknown[]) => {
    if (!onAction || !sheet.setAction || !activeId) return;
    if (mode === "graph") {
      // Model 2: persist the edited document straight onto the graph node.
      void onAction(sheet.setAction, {
        nodeId: activeId,
        field: sheet.field,
        value: blocks,
      });
      return;
    }
    if (!node) return;
    const nextFlow: FlowModel = {
      ...model,
      nodes: model.nodes.map((n) =>
        n.id === activeId
          ? { ...n, props: { ...(n.props ?? {}), [sheet.field]: blocks } }
          : n,
      ),
    };
    void onAction(sheet.setAction, {
      nodeId: node.id,
      field: property,
      value: nextFlow,
    });
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "ssota-flow border-border bg-card relative w-full overflow-hidden border",
        interactionLocked ? "ssota-flow--hand-pan h-full rounded-none" : "rounded-lg",
      )}
      style={interactionLocked ? undefined : { height }}
    >
      <style>{FLOW_STYLES}</style>
      <style>{FLOW_HAND_PAN_STYLES}</style>
      {/* Mount ReactFlow only once positions are ready so it measures every node
          (and its handles) in one clean pass. */}
      {ready ? (
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          nodesDraggable={false}
          {...flowInteraction}
          proOptions={{ hideAttribution: true }}
          minZoom={fitViewMinZoom ?? 0.2}
          fitView
          fitViewOptions={{
            padding: fitViewPadding,
            ...(fitViewMinZoom !== undefined ? { minZoom: fitViewMinZoom } : {}),
            ...(fitViewMaxZoom !== undefined ? { maxZoom: fitViewMaxZoom } : {}),
          }}
          onNodeClick={
            interactionLocked ? undefined : (_, n) => setActiveId(n.id)
          }
          onPaneClick={interactionLocked ? undefined : () => setActiveId(null)}
        >
          <FlowReady
            nodeIds={rfNodes.map((n) => n.id)}
            fitViewPadding={fitViewPadding}
            fitViewMinZoom={fitViewMinZoom}
            fitViewMaxZoom={fitViewMaxZoom}
            fitViewOffsetY={fitViewOffsetY}
          />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          {showTopToolbar ? (
            <FlowTopToolbar
              locked={locked}
              onToggleLock={() => setLocked((v) => !v)}
            />
          ) : null}
          {viewportToolbarVisible ? (
            <FlowViewportToolbar
              position={viewportToolbarPosition}
              fitViewPadding={fitViewPadding}
              fitViewMinZoom={fitViewMinZoom}
              fitViewMaxZoom={fitViewMaxZoom}
            />
          ) : null}
        </ReactFlow>
      ) : (
        <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
          Laying out…
        </div>
      )}

      {panel ? (
        <div
          data-testid="flow-panel"
          className="border-border/60 bg-background/70 supports-backdrop-filter:bg-background/50 supports-backdrop-filter:backdrop-blur-md absolute top-2 right-2 z-20 w-[min(15rem,60%)] rounded-xl border p-2 text-xs shadow-lg shadow-black/5"
        >
          <PanelRenderer
            spec={panel}
            bindingData={{ view }}
            onAction={handlePanelAction}
          />
        </div>
      ) : null}

      {activeRenderNode ? (
        <DocumentCardListSheetPanel
          node={activeRenderNode}
          subtitle={readNodeField(activeRenderNode, sheet.subtitleField)}
          status={readNodeField(activeRenderNode, sheet.statusField)}
          field={sheet.field}
          editable={sheet.editable}
          sheetSize={sheet.sheetSize}
          onClose={() => setActiveId(null)}
          onSave={onSave}
        />
      ) : null}
    </div>
  );
}

export const flowComponents: Record<string, CatalogComponent> = {
  FlowCanvas: ({ props, bindingData }) => {
    // Model 2 (graph) when a `nodes` binding is given; else model 1 (jsonb).
    const mode: "jsonb" | "graph" =
      typeof props.nodes === "string" ? "graph" : "jsonb";
    const node = boundNode(bindingData, props);
    const nodes =
      mode === "graph"
        ? boundNodesByKey(bindingData, props.nodes as string)
        : [];
    const edges =
      mode === "graph" && typeof props.edges === "string"
        ? bindingData[props.edges]
        : undefined;
    const property =
      typeof props.property === "string" ? props.property : "flow";
    const direction = ((): FlowLayoutDirection => {
      const l = props.layout;
      return l === "RL" || l === "TB" || l === "BT" ? l : "LR";
    })();
    const algorithm: FlowLayoutAlgorithm = props.algorithm === "tree" ? "tree" : "layered";
    const height =
      typeof props.height === "number" && props.height > 0 ? props.height : 480;
    const sheet: SheetConfig = {
      field: typeof props.field === "string" ? props.field : "content",
      subtitleField:
        typeof props.subtitleField === "string" ? props.subtitleField : "subtitle",
      statusField:
        typeof props.statusField === "string" ? props.statusField : "status",
      editable: props.editable === true,
      sheetSize: SHEET_SIZES.includes(props.sheetSize as DocumentCardListSheetSize)
        ? (props.sheetSize as DocumentCardListSheetSize)
        : "default",
      setAction: typeof props.setAction === "string" ? props.setAction : undefined,
    };
    const panel =
      props.panel &&
      typeof props.panel === "object" &&
      "root" in props.panel &&
      "elements" in props.panel
        ? (props.panel as JsonRenderSpec)
        : null;
    const viewAction =
      typeof props.viewAction === "string" ? props.viewAction : "setView";
    const fitViewPadding =
      typeof props.fitViewPadding === "number" && props.fitViewPadding >= 0
        ? props.fitViewPadding
        : 0.15;
    const fitViewMinZoom =
      typeof props.fitViewMinZoom === "number" && props.fitViewMinZoom > 0
        ? props.fitViewMinZoom
        : undefined;
    const fitViewMaxZoom =
      typeof props.fitViewMaxZoom === "number" && props.fitViewMaxZoom > 0
        ? props.fitViewMaxZoom
        : undefined;
    const fitViewOffsetY =
      typeof props.fitViewOffsetY === "number" ? props.fitViewOffsetY : 0;
    const viewportToolbarPosition =
      props.viewportToolbarPosition === "top-right"
        ? "top-right"
        : "bottom-right";
    const showTopToolbar = props.showTopToolbar !== false;
    const showViewportToolbar =
      props.showViewportToolbar === true ? true : undefined;
    const interactionLocked = props.interactionLocked === true;
    return (
      <ReactFlowProvider>
        <FlowCanvasEl
          mode={mode}
          node={node}
          property={property}
          nodes={nodes}
          edges={edges}
          presentation={props.nodePresentation}
          direction={direction}
          algorithm={algorithm}
          height={height}
          sheet={sheet}
          panel={panel}
          viewAction={viewAction}
          fitViewPadding={fitViewPadding}
          fitViewMinZoom={fitViewMinZoom}
          fitViewMaxZoom={fitViewMaxZoom}
          fitViewOffsetY={fitViewOffsetY}
          showTopToolbar={showTopToolbar}
          showViewportToolbar={showViewportToolbar}
          viewportToolbarPosition={viewportToolbarPosition}
          interactionLocked={interactionLocked}
        />
      </ReactFlowProvider>
    );
  },
};

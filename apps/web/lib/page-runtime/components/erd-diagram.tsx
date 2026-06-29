"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  getNodesBounds,
  useNodesInitialized,
  useReactFlow,
  useStore,
  type Edge,
  type Node,
} from "@xyflow/react";
import { FlowTopToolbar, FlowViewportToolbar } from "./flow-toolbar";
import {
  FLOW_HAND_PAN_STYLES,
  getFlowInteractionProps,
} from "./flow-preview-interaction";
import { boundNode } from "../bindings";
import {
  cardinalityEnds,
  coerceErd,
  erdAnchorKey,
  erdHandleId,
  erdTableColor,
  erdTableSize,
  erdToFlowModel,
  type ErdModel,
} from "../erd-model";
import { layoutFlow, type Positioned } from "../flow-layout";
import { ErdTableNode } from "./erd-table-node";
import { ErdRelationEdge } from "./erd-relation-edge";
import type { CatalogComponent, RenderNode } from "../types";
import { cn } from "@/lib/utils";

const NODE_TYPES = { table: ErdTableNode };
const EDGE_TYPES = { relation: ErdRelationEdge };

const FLOW_STYLES = `
.ssota-erd .react-flow__node { z-index: 0; }
.ssota-erd .react-flow__edge { z-index: 1; }
.ssota-erd .react-flow__node.selected { z-index: 3; }
`;

/** Re-fits the viewport once React Flow has measured every table node. */
function ErdReady({
  fitViewPadding,
  fitViewMinZoom,
  fitViewMaxZoom,
  fitViewMode = "contain",
}: {
  fitViewPadding: number;
  fitViewMinZoom?: number;
  fitViewMaxZoom?: number;
  fitViewMode?: "contain" | "cover";
}) {
  const initialized = useNodesInitialized();
  const { fitView, getNodes, setViewport } = useReactFlow();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  React.useEffect(() => {
    if (!initialized || width <= 0 || height <= 0) return;

    const minZoom = fitViewMinZoom ?? 0.2;
    const maxZoom = fitViewMaxZoom ?? 2;
    const options = {
      padding: fitViewPadding,
      duration: 250,
      minZoom,
      maxZoom,
    };

    const refit = () => {
      if (fitViewMode === "cover") {
        const nodes = getNodes();
        if (nodes.length === 0) return;
        const bounds = getNodesBounds(nodes);
        if (bounds.width <= 0 || bounds.height <= 0) return;

        const padX = width * fitViewPadding;
        const padY = height * fitViewPadding;
        const availW = width - padX * 2;
        const availH = height - padY * 2;
        const zoom = Math.min(
          maxZoom,
          Math.max(
            minZoom,
            Math.max(availW / bounds.width, availH / bounds.height),
          ),
        );
        setViewport(
          {
            x: width / 2 - (bounds.x + bounds.width / 2) * zoom,
            y: height / 2 - (bounds.y + bounds.height / 2) * zoom,
            zoom,
          },
          { duration: 250 },
        );
        return;
      }

      void fitView(options);
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
  }, [
    initialized,
    fitView,
    getNodes,
    setViewport,
    fitViewPadding,
    fitViewMinZoom,
    fitViewMaxZoom,
    fitViewMode,
    width,
    height,
  ]);
  return null;
}

function ErdDiagramEl({
  model,
  height,
  fitViewPadding,
  fitViewMinZoom,
  fitViewMaxZoom,
  fitViewMode = "contain",
  showTopToolbar = true,
  showViewportToolbar,
  interactionLocked = false,
}: {
  model: ErdModel;
  height: number;
  fitViewPadding: number;
  fitViewMinZoom?: number;
  fitViewMaxZoom?: number;
  fitViewMode?: "contain" | "cover";
  showTopToolbar?: boolean;
  showViewportToolbar?: boolean;
  interactionLocked?: boolean;
}) {
  const signature = React.useMemo(() => JSON.stringify(model), [model]);

  // Async ELK layout (or persisted coords) → top-left position per table.
  const [positions, setPositions] = React.useState<Positioned>({});
  React.useEffect(() => {
    let cancelled = false;
    void layoutFlow(erdToFlowModel(model), "LR").then((pos) => {
      if (!cancelled) setPositions(pos);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const ready = Object.keys(positions).length > 0;

  const [locked, setLocked] = React.useState(false);
  const flowInteraction = getFlowInteractionProps(interactionLocked, locked);
  const viewportToolbarVisible =
    showViewportToolbar === true ||
    (showViewportToolbar !== false && !interactionLocked);

  const rfNodes = React.useMemo<Node[]>(() => {
    if (!ready) return [];
    return model.tables.map((table) => ({
      id: table.id,
      type: "table",
      position: positions[table.id] ?? { x: 0, y: 0 },
      data: { table, color: erdTableColor(table) },
    }));
  }, [model.tables, positions, ready]);

  // Pick the side (left/right) for each relation end from the laid-out centers,
  // so a FK line leaves the right of the left-most table and enters the left of
  // the right-most one — clean horizontal routing with no diagonal crossings.
  const rfEdges = React.useMemo<Edge[]>(() => {
    if (!ready) return [];
    const center = (id: string): number => {
      const pos = positions[id];
      const table = model.tables.find((t) => t.id === id);
      if (!pos || !table) return 0;
      return pos.x + erdTableSize(table).width / 2;
    };
    const hasColumn = (tableId: string, col?: string): string | undefined => {
      if (!col) return undefined;
      const table = model.tables.find((t) => t.id === tableId);
      return table?.columns.some((c) => c.name === col) ? col : undefined;
    };
    return model.relations.map((rel) => {
      const ends = cardinalityEnds(rel.cardinality);
      const sourceLeftOfTarget = center(rel.source) <= center(rel.target);
      const srcSide = sourceLeftOfTarget ? "r" : "l";
      const tgtSide = sourceLeftOfTarget ? "l" : "r";
      const srcAnchor = erdAnchorKey(hasColumn(rel.source, rel.sourceColumn));
      const tgtAnchor = erdAnchorKey(hasColumn(rel.target, rel.targetColumn));
      return {
        id: rel.id,
        type: "relation",
        source: rel.source,
        target: rel.target,
        sourceHandle: erdHandleId(srcAnchor, srcSide, "s"),
        targetHandle: erdHandleId(tgtAnchor, tgtSide, "t"),
        data: {
          sourceEnd: ends.source,
          targetEnd: ends.target,
          label: rel.label ?? rel.cardinality,
        },
      };
    });
  }, [model.relations, model.tables, positions, ready]);

  return (
    <div
      className={cn(
        "ssota-erd border-border bg-muted/20 relative w-full overflow-hidden border",
        interactionLocked
          ? "ssota-erd--hand-pan h-full rounded-none"
          : "rounded-lg",
      )}
      style={{ height }}
    >
      <style>{FLOW_STYLES}</style>
      <style>{FLOW_HAND_PAN_STYLES}</style>
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
          fitView={fitViewMode !== "cover"}
          fitViewOptions={{
            padding: fitViewPadding,
            ...(fitViewMinZoom !== undefined ? { minZoom: fitViewMinZoom } : {}),
            ...(fitViewMaxZoom !== undefined ? { maxZoom: fitViewMaxZoom } : {}),
          }}
        >
          <ErdReady
            fitViewPadding={fitViewPadding}
            fitViewMinZoom={fitViewMinZoom}
            fitViewMaxZoom={fitViewMaxZoom}
            fitViewMode={fitViewMode}
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
    </div>
  );
}

export const erdDiagramComponents: Record<string, CatalogComponent> = {
  ErdDiagram: ({ props, bindingData }) => {
    const node: RenderNode | undefined = boundNode(bindingData, props);
    const property =
      typeof props.property === "string" ? props.property : "erd";
    const height =
      typeof props.height === "number" && props.height > 0 ? props.height : 480;
    const fitViewPadding =
      typeof props.fitViewPadding === "number" && props.fitViewPadding >= 0
        ? props.fitViewPadding
        : 0.16;
    const fitViewMinZoom =
      typeof props.fitViewMinZoom === "number" && props.fitViewMinZoom > 0
        ? props.fitViewMinZoom
        : undefined;
    const fitViewMaxZoom =
      typeof props.fitViewMaxZoom === "number" && props.fitViewMaxZoom > 0
        ? props.fitViewMaxZoom
        : undefined;
    const fitViewMode =
      props.fitViewMode === "cover" ? "cover" : "contain";
    const showTopToolbar = props.showTopToolbar !== false;
    const showViewportToolbar =
      props.showViewportToolbar === true ? true : undefined;
    const interactionLocked = props.interactionLocked === true;
    const model = coerceErd(node?.properties?.[property]);

    if (!node) {
      return (
        <div className="text-muted-foreground border-border rounded border border-dashed p-4 text-xs">
          ErdDiagram: no bound node.
        </div>
      );
    }
    if (model.tables.length === 0) {
      return (
        <div className="text-muted-foreground border-border rounded border border-dashed p-4 text-xs">
          ErdDiagram: no tables to display.
        </div>
      );
    }

    return (
      <ReactFlowProvider>
        <ErdDiagramEl
          model={model}
          height={height}
          fitViewPadding={fitViewPadding}
          fitViewMinZoom={fitViewMinZoom}
          fitViewMaxZoom={fitViewMaxZoom}
          fitViewMode={fitViewMode}
          showTopToolbar={showTopToolbar}
          showViewportToolbar={showViewportToolbar}
          interactionLocked={interactionLocked}
        />
      </ReactFlowProvider>
    );
  },
};

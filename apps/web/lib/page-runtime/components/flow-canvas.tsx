"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  useUpdateNodeInternals,
  type Edge,
  type Node,
} from "@xyflow/react";
import { boundNode } from "../bindings";
import {
  coerceFlow,
  coercePresentation,
  resolveNodeStyle,
} from "../flow-model";
import { layoutFlow, type FlowLayoutDirection, type Positioned } from "../flow-layout";
import { FlowNode } from "./flow-node";
import { FlowEdge } from "./flow-edge";
import type { CatalogComponent, RenderNode } from "../types";

const NODE_TYPES = { generic: FlowNode };
const EDGE_TYPES = { flow: FlowEdge };

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
function FlowReady({ nodeIds }: { nodeIds: string[] }) {
  const initialized = useNodesInitialized();
  const { fitView } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const key = nodeIds.join(",");

  React.useEffect(() => {
    if (nodeIds.length > 0) updateNodeInternals(nodeIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, updateNodeInternals]);

  React.useEffect(() => {
    if (initialized && nodeIds.length > 0) {
      void fitView({ padding: 0.15, duration: 250 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, key, fitView]);

  return null;
}

function FlowCanvasEl({
  node,
  property,
  presentation,
  direction,
  height,
}: {
  node: RenderNode | undefined;
  property: string;
  presentation: unknown;
  direction: FlowLayoutDirection;
  height: number;
}) {
  const model = React.useMemo(
    () => coerceFlow(node?.properties?.[property]),
    [node?.properties, property],
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
    void layoutFlow(model, direction).then((pos) => {
      if (!cancelled) setPositions(pos);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, direction]);

  const ready = Object.keys(positions).length > 0;

  const rfNodes = React.useMemo<Node[]>(() => {
    if (!ready) return [];
    return model.nodes.map((n) => ({
      id: n.id,
      type: "generic",
      position: positions[n.id] ?? { x: 0, y: 0 },
      data: {
        style: resolveNodeStyle(n, manifest),
        status: n.status,
        direction,
      },
    }));
  }, [model.nodes, manifest, positions, ready, direction]);

  const rfEdges = React.useMemo<Edge[]>(
    () =>
      model.edges.map((e) => ({
        id: e.id,
        type: "flow",
        source: e.source,
        target: e.target,
        label: e.label,
        animated: e.animated ?? false,
      })),
    [model.edges],
  );

  if (!node) {
    return (
      <div className="text-muted-foreground border-border rounded border border-dashed p-4 text-xs">
        FlowCanvas: no bound node.
      </div>
    );
  }

  return (
    <div
      className="ssota-flow border-border bg-card relative w-full overflow-hidden rounded-lg border"
      style={{ height }}
    >
      <style>{FLOW_STYLES}</style>
      {/* Mount ReactFlow only once positions are ready so it measures every node
          (and its handles) in one clean pass. */}
      {ready ? (
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          nodesDraggable={false}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
          minZoom={0.2}
          fitView
          fitViewOptions={{ padding: 0.15 }}
        >
          <FlowReady nodeIds={rfNodes.map((n) => n.id)} />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      ) : (
        <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
          Laying out…
        </div>
      )}
    </div>
  );
}

export const flowComponents: Record<string, CatalogComponent> = {
  FlowCanvas: ({ props, bindingData }) => {
    const node = boundNode(bindingData, props);
    const property =
      typeof props.property === "string" ? props.property : "flow";
    const direction = ((): FlowLayoutDirection => {
      const l = props.layout;
      return l === "RL" || l === "TB" || l === "BT" ? l : "LR";
    })();
    const height =
      typeof props.height === "number" && props.height > 0 ? props.height : 480;
    return (
      <ReactFlowProvider>
        <FlowCanvasEl
          node={node}
          property={property}
          presentation={props.nodePresentation}
          direction={direction}
          height={height}
        />
      </ReactFlowProvider>
    );
  },
};

"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { EdgeCatalogRow, NodeCatalogRow } from "@ssota/contracts/catalog";
import { FlowTopToolbar, FlowViewportToolbar } from "@/lib/page-runtime/components/flow-toolbar";
import { ErdTableNode } from "@/lib/page-runtime/components/erd-table-node";
import { ErdRelationEdge } from "@/lib/page-runtime/components/erd-relation-edge";
import {
  cardinalityEnds,
  erdAnchorKey,
  erdHandleId,
  erdTableColor,
  erdTableSize,
  erdToFlowModel,
  type ErdModel,
  type ErdTable,
} from "@/lib/page-runtime/erd-model";
import { layoutFlow, type Positioned } from "@/lib/page-runtime/flow-layout";
import { buildGraphSchemaModel, type GraphSchemaGroup } from "./graph-schema-model";

/**
 * Node/edge catalog rendered as a schema diagram — one card per node type
 * (styled like the ErdDiagram catalog component's table cards), one relation
 * line per edge type's domain→range pairing. This is a console-only screen
 * (not a page-runtime catalog component), so it owns its own ReactFlow
 * assembly rather than depending on the ErdDiagram widget; it reuses that
 * widget's table/edge renderers and ELK layout as shared visual primitives.
 *
 * Node types are additionally clustered into labeled group boxes (workflow
 * phase — see `graph-schema-model.ts`) so the diagram reads as a hierarchy
 * instead of a flat card wall: each group is laid out independently with
 * ELK, then the group boxes themselves are packed into rows.
 */

// NOTE: "group" is a reserved built-in React Flow node type (parent/child
// nesting) with its own default sizing — using that name here silently
// discards our explicit width/height. Use a distinct type name instead.
const NODE_TYPES = { table: ErdTableNode, schemaGroup: GraphGroupNode };
const EDGE_TYPES = { relation: ErdRelationEdge };

const FLOW_STYLES = `
.ssota-graph-schema .react-flow__node { z-index: 0; }
.ssota-graph-schema .react-flow__edge { z-index: 1; }
.ssota-graph-schema .react-flow__node.selected { z-index: 3; }
.ssota-graph-schema .react-flow__node[data-id^="group:"] { pointer-events: none; }
`;

const DIAGRAM_HEIGHT = 640;
const FIT_VIEW_PADDING = 0.12;
const FIT_VIEW_MIN_ZOOM = 0.1;

const GROUP_HEADER_HEIGHT = 40;
const GROUP_PADDING = 20;
const GROUP_GAP = 56;
const GROUP_MIN_WIDTH = 220;
const GROUP_MAX_ROW_WIDTH = 1400;

type GroupBox = {
  key: string;
  title: string;
  count: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type GroupLayout = {
  positions: Positioned;
  groupBoxes: GroupBox[];
};

/** Dashed container rendered behind a group's table cards, with a title chip. */
function GraphGroupNode({ data }: NodeProps) {
  const { title, count, width, height } = data as unknown as {
    title: string;
    count: number;
    width: number;
    height: number;
  };
  return (
    <div
      className="border-border/70 bg-muted/10 relative rounded-xl border border-dashed"
      style={{ width, height }}
    >
      <div className="text-muted-foreground absolute top-2.5 left-3 text-[11px] font-semibold tracking-wide uppercase">
        {title}
        <span className="text-muted-foreground/60 ml-1 font-normal normal-case">· {count}</span>
      </div>
    </div>
  );
}

/** Left-to-right row packing with wraparound — groups have no cross-edges to route, so a simple bin-pack reads just as well as a general layout engine here. */
function packGroups(
  boxes: Array<Omit<GroupBox, "x" | "y">>,
  maxRowWidth: number,
): GroupBox[] {
  const placed: GroupBox[] = [];
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  for (const box of boxes) {
    if (cursorX > 0 && cursorX + box.width > maxRowWidth) {
      cursorX = 0;
      cursorY += rowHeight + GROUP_GAP;
      rowHeight = 0;
    }
    placed.push({ ...box, x: cursorX, y: cursorY });
    cursorX += box.width + GROUP_GAP;
    rowHeight = Math.max(rowHeight, box.height);
  }
  return placed;
}

/** Lays out each group's tables independently (ELK), then packs the group boxes. */
async function layoutGroupedSchema(
  model: ErdModel,
  groups: GraphSchemaGroup[],
): Promise<GroupLayout> {
  const tablesById = new Map(model.tables.map((t) => [t.id, t]));
  const localByGroup = new Map<string, Positioned>();
  const rawBoxes: Array<Omit<GroupBox, "x" | "y">> = [];

  for (const group of groups) {
    const idSet = new Set(group.tableIds);
    const tables = group.tableIds
      .map((id) => tablesById.get(id))
      .filter((t): t is ErdTable => t !== undefined);
    if (tables.length === 0) continue;
    const relations = model.relations.filter(
      (r) => idSet.has(r.source) && idSet.has(r.target),
    );
    const local = await layoutFlow(erdToFlowModel({ tables, relations }), "LR");
    localByGroup.set(group.key, local);

    let maxX = 0;
    let maxY = 0;
    for (const table of tables) {
      const pos = local[table.id] ?? { x: 0, y: 0 };
      const size = erdTableSize(table);
      maxX = Math.max(maxX, pos.x + size.width);
      maxY = Math.max(maxY, pos.y + size.height);
    }
    rawBoxes.push({
      key: group.key,
      title: group.title,
      count: tables.length,
      width: Math.max(GROUP_MIN_WIDTH, maxX + GROUP_PADDING * 2),
      height: maxY + GROUP_HEADER_HEIGHT + GROUP_PADDING,
    });
  }

  const groupBoxes = packGroups(rawBoxes, GROUP_MAX_ROW_WIDTH);

  const positions: Positioned = {};
  for (const box of groupBoxes) {
    const local = localByGroup.get(box.key) ?? {};
    for (const [id, pos] of Object.entries(local)) {
      positions[id] = {
        x: box.x + GROUP_PADDING + pos.x,
        y: box.y + GROUP_HEADER_HEIGHT + pos.y,
      };
    }
  }

  return { positions, groupBoxes };
}

/** Re-fits the viewport once React Flow has measured every card/group node. */
function GraphSchemaReady() {
  const initialized = useNodesInitialized();
  const { fitView } = useReactFlow();
  React.useEffect(() => {
    if (!initialized) return;
    const options = { padding: FIT_VIEW_PADDING, duration: 250, minZoom: FIT_VIEW_MIN_ZOOM };
    void fitView(options);
    const timer = window.setTimeout(() => void fitView(options), 120);
    return () => window.clearTimeout(timer);
  }, [initialized, fitView]);
  return null;
}

function GraphSchemaCanvas({
  model,
  groups,
}: {
  model: ErdModel;
  groups: GraphSchemaGroup[];
}) {
  const signature = React.useMemo(() => JSON.stringify({ model, groups }), [model, groups]);

  const [layout, setLayout] = React.useState<GroupLayout>({ positions: {}, groupBoxes: [] });
  React.useEffect(() => {
    let cancelled = false;
    void layoutGroupedSchema(model, groups).then((result) => {
      if (!cancelled) setLayout(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const ready = layout.groupBoxes.length > 0;

  const rfNodes = React.useMemo<Node[]>(() => {
    if (!ready) return [];
    const groupNodes: Node[] = layout.groupBoxes.map((box) => ({
      id: `group:${box.key}`,
      type: "schemaGroup",
      position: { x: box.x, y: box.y },
      data: { title: box.title, count: box.count, width: box.width, height: box.height },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: 0,
    }));
    const tableNodes: Node[] = model.tables.map((table) => ({
      id: table.id,
      type: "table",
      position: layout.positions[table.id] ?? { x: 0, y: 0 },
      data: { table, color: erdTableColor(table) },
      zIndex: 1,
    }));
    return [...groupNodes, ...tableNodes];
  }, [model.tables, layout, ready]);

  // Pick the side (left/right) for each relation end from the laid-out centers,
  // so a line leaves the right of the left-most card and enters the left of the
  // right-most one — clean horizontal routing with no diagonal crossings.
  const rfEdges = React.useMemo<Edge[]>(() => {
    if (!ready) return [];
    const center = (id: string): number => {
      const pos = layout.positions[id];
      const table = model.tables.find((t) => t.id === id);
      if (!pos || !table) return 0;
      return pos.x + erdTableSize(table).width / 2;
    };
    return model.relations.map((rel) => {
      const ends = cardinalityEnds(rel.cardinality);
      const sourceLeftOfTarget = center(rel.source) <= center(rel.target);
      const srcSide = sourceLeftOfTarget ? "r" : "l";
      const tgtSide = sourceLeftOfTarget ? "l" : "r";
      const srcAnchor = erdAnchorKey();
      const tgtAnchor = erdAnchorKey();
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
          label: rel.label,
        },
      };
    });
  }, [model.relations, model.tables, layout, ready]);

  return (
    <div
      className="ssota-graph-schema border-border bg-muted/20 relative w-full overflow-hidden rounded-lg border"
      style={{ height: DIAGRAM_HEIGHT }}
    >
      <style>{FLOW_STYLES}</style>
      {ready ? (
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          nodesDraggable={false}
          proOptions={{ hideAttribution: true }}
          minZoom={FIT_VIEW_MIN_ZOOM}
          fitView
          fitViewOptions={{ padding: FIT_VIEW_PADDING, minZoom: FIT_VIEW_MIN_ZOOM }}
        >
          <GraphSchemaReady />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <FlowTopToolbar locked={false} onToggleLock={() => {}} />
          <FlowViewportToolbar fitViewPadding={FIT_VIEW_PADDING} fitViewMinZoom={FIT_VIEW_MIN_ZOOM} />
        </ReactFlow>
      ) : (
        <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
          Laying out…
        </div>
      )}
    </div>
  );
}

export function GraphSchemaDiagram({
  nodeTypes,
  edgeTypes,
}: {
  nodeTypes: NodeCatalogRow[];
  edgeTypes: EdgeCatalogRow[];
}) {
  const { model, groups, unlinkedEdgeTypes } = React.useMemo(
    () => buildGraphSchemaModel(nodeTypes, edgeTypes),
    [nodeTypes, edgeTypes],
  );

  if (model.tables.length === 0) return null;

  return (
    <div className="space-y-3">
      <ReactFlowProvider>
        <GraphSchemaCanvas model={model} groups={groups} />
      </ReactFlowProvider>
      {unlinkedEdgeTypes.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          도메인/레인지가 없어 다이어그램에 표시되지 않은 edge 타입:{" "}
          {unlinkedEdgeTypes.map((e) => e.label).join(", ")}
        </p>
      ) : null}
    </div>
  );
}

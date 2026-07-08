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
import type { ElkNode } from "elkjs/lib/elk-api";
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
  type ErdModel,
  type ErdRelation,
  type ErdTable,
} from "@/lib/page-runtime/erd-model";
import { buildGraphSchemaModel, type GraphSchemaGroup } from "./graph-schema-model";

/**
 * Node/edge catalog rendered as a schema diagram — one card per node type
 * (styled like the ErdDiagram catalog component's table cards), one relation
 * line per edge type's domain→range pairing. This is a console-only screen
 * (not a page-runtime catalog component), so it owns its own ReactFlow
 * assembly rather than depending on the ErdDiagram widget; it reuses that
 * widget's table/edge renderers as shared visual primitives.
 *
 * Node types are additionally clustered into labeled group boxes (workflow
 * phase — see `graph-schema-model.ts`). Layout is a two-level ELK pass: each
 * group's own cards flow top-to-bottom (`layered`, direction DOWN) sized by
 * its internal relations, then the group containers themselves are tiled
 * left-to-right (`box` packing) since most groups don't reference each other.
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

const ELK_NODE_SPACING = 56;
const ELK_LAYER_SPACING = 90;
const GROUP_PADDING_TOP = 40;
const GROUP_PADDING_SIDE = 20;
const GROUP_PADDING_BOTTOM = 20;
const GROUP_MIN_WIDTH = 220;

type Positioned = Record<string, { x: number; y: number }>;

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

/**
 * Groups flow left-to-right, packed by ELK's `box` algorithm; each group's
 * own tables flow top-to-bottom via ELK `layered` (direction DOWN), sized by
 * that group's internal relations only.
 */
async function layoutGroupedSchema(
  model: ErdModel,
  groups: GraphSchemaGroup[],
): Promise<GroupLayout> {
  const tablesById = new Map(model.tables.map((t) => [t.id, t]));
  const groupKeyByTable = new Map<string, string>();
  for (const group of groups) {
    for (const id of group.tableIds) groupKeyByTable.set(id, group.key);
  }

  // Only relations fully inside one group feed that group's own ELK pass —
  // the root packer (below) is edge-less "box" packing, so cross-group
  // relations don't influence layout; they still render fine as plain lines
  // between whatever absolute positions the two groups end up at.
  const internalRelations = new Map<string, ErdRelation[]>();
  for (const rel of model.relations) {
    const sourceGroup = groupKeyByTable.get(rel.source);
    const targetGroup = groupKeyByTable.get(rel.target);
    if (sourceGroup && sourceGroup === targetGroup) {
      const list = internalRelations.get(sourceGroup) ?? [];
      list.push(rel);
      internalRelations.set(sourceGroup, list);
    }
  }

  const groupNodes: ElkNode[] = groups
    .map((group): ElkNode | null => {
      const tables = group.tableIds
        .map((id) => tablesById.get(id))
        .filter((t): t is ErdTable => t !== undefined);
      if (tables.length === 0) return null;
      const relations = internalRelations.get(group.key) ?? [];
      return {
        id: `group:${group.key}`,
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": "DOWN",
          "elk.spacing.nodeNode": String(ELK_NODE_SPACING),
          "elk.layered.spacing.nodeNodeBetweenLayers": String(ELK_LAYER_SPACING),
          "elk.padding": `[top=${GROUP_PADDING_TOP},left=${GROUP_PADDING_SIDE},bottom=${GROUP_PADDING_BOTTOM},right=${GROUP_PADDING_SIDE}]`,
          "elk.nodeSize.constraints": "MINIMUM_SIZE",
          "elk.nodeSize.minimum": `(${GROUP_MIN_WIDTH}, 0)`,
        },
        children: tables.map((table) => {
          const size = erdTableSize(table);
          return { id: table.id, width: size.width, height: size.height };
        }),
        edges: relations.map((rel) => ({
          id: rel.id,
          sources: [rel.source],
          targets: [rel.target],
        })),
      };
    })
    .filter((g): g is ElkNode => g !== null);

  // "layered" at the root stacks disconnected groups into one tall column
  // (most groups share no edges, so they all land in layer 0). "box" is ELK's
  // dedicated packer for edge-less collections — it tiles the group
  // containers left-to-right, wrapping into new rows, which is what we want
  // for groups that mostly don't reference each other.
  const root: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "box",
      "elk.aspectRatio": "1.8",
      "elk.spacing.nodeNode": String(ELK_NODE_SPACING),
    },
    children: groupNodes,
  };

  const Elk = (await import("elkjs/lib/elk.bundled.js")).default;
  const elk = new Elk();
  const laidOut = await elk.layout(root);

  const positions: Positioned = {};
  const groupBoxes: GroupBox[] = [];
  const groupsByKey = new Map(groups.map((g) => [g.key, g]));
  for (const child of laidOut.children ?? []) {
    const groupKey = child.id.startsWith("group:") ? child.id.slice("group:".length) : null;
    const group = groupKey ? groupsByKey.get(groupKey) : undefined;
    if (!group || child.x == null || child.y == null) continue;
    groupBoxes.push({
      key: group.key,
      title: group.title,
      count: child.children?.length ?? 0,
      x: child.x,
      y: child.y,
      width: child.width ?? GROUP_MIN_WIDTH,
      height: child.height ?? GROUP_PADDING_TOP,
    });
    for (const grandchild of child.children ?? []) {
      if (grandchild.x != null && grandchild.y != null) {
        positions[grandchild.id] = { x: child.x + grandchild.x, y: child.y + grandchild.y };
      }
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

  // Handle ids that an edge actually attaches to, per table — lets the table
  // node light up only the connection points that are actually in use.
  const activeHandlesByTable = React.useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const edge of rfEdges) {
      if (edge.sourceHandle) {
        const set = map.get(edge.source) ?? new Set<string>();
        set.add(edge.sourceHandle);
        map.set(edge.source, set);
      }
      if (edge.targetHandle) {
        const set = map.get(edge.target) ?? new Set<string>();
        set.add(edge.targetHandle);
        map.set(edge.target, set);
      }
    }
    return map;
  }, [rfEdges]);

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
      data: {
        table,
        color: erdTableColor(table),
        activeHandleIds: activeHandlesByTable.get(table.id),
      },
      zIndex: 1,
    }));
    return [...groupNodes, ...tableNodes];
  }, [model.tables, layout, ready, activeHandlesByTable]);

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

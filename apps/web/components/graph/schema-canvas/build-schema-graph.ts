import type { Edge, Node } from "@xyflow/react";
import type { EdgeCatalogEntry, NodeCatalogEntry } from "@loopos/core";

export type CatalogNodeData = {
  nodeType: string;
  slug: string;
  label: string;
  family: string;
  archetypeId: string;
  propertyCount: number;
  actionCount: number;
};

export type CatalogEdgeData = {
  edgeType: string;
  slug: string;
  label: string;
  cardinality: string;
  representation: string;
};

export type SchemaSelection =
  | { kind: "node"; slug: string }
  | { kind: "edge"; slug: string }
  | null;

const NODE_WIDTH = 200;
const NODE_HEIGHT = 88;
const GRID_GAP_X = 120;
const GRID_GAP_Y = 100;

export function buildSchemaGraph(
  nodeEntries: NodeCatalogEntry[],
  edgeEntries: EdgeCatalogEntry[],
  selection: SchemaSelection = null,
): { nodes: Node<CatalogNodeData>[]; edges: Edge<CatalogEdgeData>[] } {
  const nodeTypeToId = new Map(nodeEntries.map((entry) => [entry.nodeType, entry.slug]));
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodeEntries.length)));

  const nodes: Node<CatalogNodeData>[] = nodeEntries.map((entry, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const selected = selection?.kind === "node" && selection.slug === entry.slug;

    return {
      id: entry.slug,
      type: "catalogNode",
      position: {
        x: col * (NODE_WIDTH + GRID_GAP_X),
        y: row * (NODE_HEIGHT + GRID_GAP_Y),
      },
      data: {
        nodeType: entry.nodeType,
        slug: entry.slug,
        label: entry.label,
        family: entry.family,
        archetypeId: entry.archetypeId,
        propertyCount: entry.propertyRefs.length,
        actionCount: entry.allowedActionRefs.length,
      },
      selected,
    };
  });

  const edges: Edge<CatalogEdgeData>[] = [];

  for (const edgeEntry of edgeEntries) {
    const edgeSelected = selection?.kind === "edge" && selection.slug === edgeEntry.slug;

    for (const sourceType of edgeEntry.domain) {
      for (const targetType of edgeEntry.range) {
        const sourceId = nodeTypeToId.get(sourceType);
        const targetId = nodeTypeToId.get(targetType);
        if (!sourceId || !targetId) continue;

        edges.push({
          id: `${edgeEntry.slug}:${sourceId}->${targetId}`,
          type: "catalogEdge",
          source: sourceId,
          target: targetId,
          data: {
            edgeType: edgeEntry.edgeType,
            slug: edgeEntry.slug,
            label: edgeEntry.label,
            cardinality: edgeEntry.cardinality,
            representation: edgeEntry.representation,
          },
          selected: edgeSelected,
        } satisfies Edge<CatalogEdgeData, "catalogEdge">);
      }
    }
  }

  return { nodes, edges };
}

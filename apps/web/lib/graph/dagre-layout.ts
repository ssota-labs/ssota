import dagre from "@dagrejs/dagre";
import { Position, type Edge, type Node } from "@xyflow/react";

/** Matches graph node card min-width + description + badges (React Flow dagre example). */
export const GRAPH_NODE_LAYOUT_SIZE = {
  width: 220,
  height: 120,
  minWidth: 176,
  maxWidth: 220,
} as const;

type LayoutDirection = "LR" | "TB";

type ColumnEdge = "left" | "right";

type DagreLayoutOptions<NodeData extends Record<string, unknown>> = {
  getNodeSize?: (node: Node<NodeData>) => { width: number; height: number };
  alignColumns?: Array<{
    match: (node: Node<NodeData>) => boolean;
    edge: ColumnEdge;
  }>;
};

/** Rough card width for dagre spacing + column edge alignment (matches w-max min/max). */
export function estimateGraphNodeWidth(input: {
  label: string;
  description?: string;
  badges?: string[];
}): number {
  const longestLine = Math.max(
    input.label.length,
    input.description?.length ?? 0,
    ...(input.badges ?? []).map((badge) => badge.length),
    12,
  );

  const estimated = Math.ceil(longestLine * 7.5) + 28;
  return Math.min(
    GRAPH_NODE_LAYOUT_SIZE.maxWidth,
    Math.max(GRAPH_NODE_LAYOUT_SIZE.minWidth, estimated),
  );
}

export function alignNodesByColumnEdge<T extends { id: string; position: { x: number; y: number } }>(
  nodes: T[],
  match: (node: T) => boolean,
  edge: ColumnEdge,
  widthById: Record<string, number>,
): T[] {
  const group = nodes.filter(match);
  if (group.length <= 1) return nodes;

  const widthFor = (id: string) =>
    widthById[id] ?? GRAPH_NODE_LAYOUT_SIZE.width;

  if (edge === "right") {
    const anchorRight = Math.max(
      ...group.map((node) => node.position.x + widthFor(node.id)),
    );
    return nodes.map((node) => {
      if (!match(node)) return node;
      const width = widthFor(node.id);
      return {
        ...node,
        position: { ...node.position, x: anchorRight - width },
      };
    });
  }

  const anchorLeft = Math.min(...group.map((node) => node.position.x));
  return nodes.map((node) => {
    if (!match(node)) return node;
    return { ...node, position: { ...node.position, x: anchorLeft } };
  });
}

/**
 * Auto-layout nodes with dagre (React Flow recommended for directed graphs).
 * @see https://reactflow.dev/learn/layouting/layouting
 */
export function layoutGraphWithDagre<NodeData extends Record<string, unknown>>(
  nodes: Node<NodeData>[],
  edges: Edge[],
  direction: LayoutDirection = "LR",
  options?: DagreLayoutOptions<NodeData>,
) {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: direction,
    nodesep: 56,
    ranksep: 112,
    marginx: 32,
    marginy: 32,
  });

  const isHorizontal = direction === "LR";
  const defaultSize = GRAPH_NODE_LAYOUT_SIZE;

  const widthById = Object.fromEntries(
    nodes.map((node) => {
      const size = options?.getNodeSize?.(node) ?? defaultSize;
      return [node.id, size.width];
    }),
  );

  for (const node of nodes) {
    const size = options?.getNodeSize?.(node) ?? defaultSize;
    graph.setNode(node.id, { width: size.width, height: size.height });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  let layoutedNodes = nodes.map((node) => {
    const layout = graph.node(node.id);
    const size = options?.getNodeSize?.(node) ?? defaultSize;
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: layout.x - size.width / 2,
        y: layout.y - size.height / 2,
      },
    };
  });

  for (const column of options?.alignColumns ?? []) {
    layoutedNodes = alignNodesByColumnEdge(
      layoutedNodes,
      column.match,
      column.edge,
      widthById,
    );
  }

  return { nodes: layoutedNodes, edges };
}

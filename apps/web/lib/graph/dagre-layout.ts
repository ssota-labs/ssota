import dagre from "@dagrejs/dagre";
import { Position, type Edge, type Node } from "@xyflow/react";

/** Matches graph node card min-width + description + badges (React Flow dagre example). */
export const GRAPH_NODE_LAYOUT_SIZE = {
  width: 220,
  height: 120,
} as const;

type LayoutDirection = "LR" | "TB";

/**
 * Auto-layout nodes with dagre (React Flow recommended for directed graphs).
 * @see https://reactflow.dev/learn/layouting/layouting
 */
export function layoutGraphWithDagre<NodeData extends Record<string, unknown>>(
  nodes: Node<NodeData>[],
  edges: Edge[],
  direction: LayoutDirection = "LR",
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
  const { width, height } = GRAPH_NODE_LAYOUT_SIZE;

  for (const node of nodes) {
    graph.setNode(node.id, { width, height });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  const layoutedNodes = nodes.map((node) => {
    const layout = graph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: layout.x - width / 2,
        y: layout.y - height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

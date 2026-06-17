import type { GraphEdge, GraphNode } from "@ssota/core";
import { getNodeTypeEntry } from "@ssota/contracts";
import { nodeDetailPath, resolveNodeRoute } from "@/lib/console/resolve-node-route";
import type { ProjectRouteContext } from "@/lib/console/paths";
import { getGraphDeps } from "../graph-deps";

export type NodeEdgeView = {
  id: string;
  edgeType: string;
  direction: "incoming" | "outgoing";
  neighborId: string;
  neighborTitle: string;
  neighborNodeType: string;
};

export type NodeDetailView = {
  node: GraphNode;
  typeLabel: string;
  mutability: "living" | "versioned" | "immutable";
  canonicalRoute: string | null;
  detailPath: string;
  incomingEdges: NodeEdgeView[];
  outgoingEdges: NodeEdgeView[];
};

async function mapEdges(
  edges: GraphEdge[],
  direction: "incoming" | "outgoing",
  projectId: string,
): Promise<NodeEdgeView[]> {
  const { graphRead } = getGraphDeps(projectId);
  const views: NodeEdgeView[] = [];

  for (const edge of edges) {
    const neighborId =
      direction === "incoming" ? edge.sourceNodeId : edge.targetNodeId;
    const neighbor = await graphRead.getNode({ projectId, nodeId: neighborId });
    views.push({
      id: edge.id,
      edgeType: edge.edgeType,
      direction,
      neighborId,
      neighborTitle: neighbor?.title || "Untitled",
      neighborNodeType: neighbor?.nodeType ?? "unknown",
    });
  }

  return views;
}

export async function getNodeDetailView(
  ctx: ProjectRouteContext,
  projectId: string,
  nodeId: string,
): Promise<NodeDetailView | null> {
  const { graphRead } = getGraphDeps(projectId);
  const node = await graphRead.getNode({ projectId, nodeId });
  if (!node) return null;

  const [incoming, outgoing] = await Promise.all([
    graphRead.traverseEdges({
      projectId,
      nodeId,
      direction: "incoming",
    }),
    graphRead.traverseEdges({
      projectId,
      nodeId,
      direction: "outgoing",
    }),
  ]);

  const entry = getNodeTypeEntry(node.nodeType);

  return {
    node,
    typeLabel: entry?.label ?? node.nodeType,
    mutability: entry?.mutability ?? "living",
    canonicalRoute: await resolveNodeRoute(ctx, projectId, node),
    detailPath: nodeDetailPath(ctx, node.id),
    incomingEdges: await mapEdges(incoming, "incoming", projectId),
    outgoingEdges: await mapEdges(outgoing, "outgoing", projectId),
  };
}
